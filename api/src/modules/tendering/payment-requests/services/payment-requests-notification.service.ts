import { couriers, emdResponsibility, tenderInfos, users } from '@/db/schemas';
import { AppLogger } from '@/logger/app-logger.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { instrumentBgDetails, instrumentChequeDetails, instrumentTransferDetails, paymentInstruments, paymentRequests } from '@db/schemas/tendering/payment-requests.schema';
import { BG_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { differenceInDays } from 'date-fns';
import { and, eq, isNull, notInArray } from 'drizzle-orm';

@Injectable()
export class PaymentRequestsNotificationService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly configService: ConfigService,
    ) {
        this.logger = this.appLogger.withContext(PaymentRequestsNotificationService.name);
    }

    private async getTenderTeamId(tenderId: number, requestedBy: number): Promise<number> {
        if (tenderId > 0) {
            const [tender] = await this.db
                .select({ team: tenderInfos.team })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, tenderId))
                .limit(1);
            return tender?.team || 1;
        }
        const [user] = await this.db
            .select({ team: users.team })
            .from(users)
            .where(eq(users.id, requestedBy))
            .limit(1);
        return user?.team || 2;
    }

    /**
     * Get responsible user by mode
     */
    private getFrontendUrl(): string {
        return this.configService.get<string>('app.publicAppUrl') || 'http://localhost:5173';
    }

    private readonly instrumentTypeMap: Record<string, string> = {
        DD: 'DD',
        FDR: 'FDR',
        BG: 'BG',
        CHEQUE: 'Cheque',
        'BANK TRANSFER': 'Bank Transfer',
        BANK_TRANSFER: 'Bank Transfer',
        PORTAL: 'Portal Payment',
        'PORTAL PAYMENT': 'Portal Payment',
    };

    private async getResponsibleUserEmailByMode(mode: string): Promise<string> {
        const dbType = this.instrumentTypeMap[mode];
        if (!dbType) {
            this.logger.warn(`No instrument type mapping for mode: ${mode}`);
            return 'kailash@volksenergie.in';
        }
        const [result] = await this.db
            .select({ email: users.email })
            .from(emdResponsibility)
            .leftJoin(users, eq(users.id, emdResponsibility.assignedUserId))
            .where(eq(emdResponsibility.instrumentType, dbType))
            .limit(1);
        return result?.email || 'kailash@volksenergie.in';
    }

    private async getResponsibleUserIdByMode(mode: string): Promise<number | null> {
        const dbType = this.instrumentTypeMap[mode];
        if (!dbType) return null;
        const [result] = await this.db
            .select({ userId: emdResponsibility.assignedUserId })
            .from(emdResponsibility)
            .where(eq(emdResponsibility.instrumentType, dbType))
            .limit(1);
        return result?.userId ?? null;
    }

    private formatDateDDMMYYYY = (dateStr: string | null | undefined): string => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return dateStr;
        }
    };

    private formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    /**
     * Normalize a DB file-path value into a list of plain attachment paths.
     * Multi-file upload fields are persisted either as a JSON array string
     * (e.g. '["bi-dashboard/.../a.pdf","bi-dashboard/.../b.pdf"]') or as a
     * single plain path, depending on how the frontend submitted them. Passing
     * the raw JSON string to EmailService would make attachment resolution
     * throw ("Unknown file context: [\"bi-dashboard"), killing the whole email.
     */
    private toAttachmentPaths = (value: string | null | undefined): string[] => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return [];
        }

        const trimmed = value.trim();

        // Dummy marker left behind when a file input was submitted without a file
        if (trimmed.includes('[object File]')) {
            return [];
        }

        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                const list: string[] = Array.isArray(parsed) ? parsed : [parsed];
                return list.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
            } catch {
                // Not valid JSON — fall through and treat it as a single path
            }
        }

        return [trimmed];
    };

    async sendDdMailAfterChequeAction(
        chequeInstrument: any,
        chequeDetails: any,
        ddInstrumentId: number,
        tenderId: number,
        requestId: number,
    ) {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender) {
            this.logger.warn(`Tender ${tenderId} not found for DD email, sending without label`);
        }

        const toEmails = await this.getResponsibleUserEmailByMode('DD');
        
        const apiUrl = this.configService.get<string>('app.apiUrl') || '';

        const softCopyChequeUrl = chequeDetails.chequeImagePath
            ? `${apiUrl.replace('/api/v1', '')}/uploads/bi-dashboard/${chequeDetails.chequeImagePath}`
            : '';

        let receivingChequeUrl = '';
        if (chequeInstrument.generatedPdf) {
            receivingChequeUrl = `${apiUrl}/payment-requests/instruments/${chequeInstrument.id}/pdf`;
        } else {
            try {
                const chequeDate = this.formatDateDDMMYYYY(chequeInstrument.issueDate) || this.formatDateDDMMYYYY(new Date().toISOString());
                const pdfPaths = await this.pdfGenerator.generatePdfs(
                    'chqCret',
                    {
                        cheque_date: chequeDate,
                        cheque_amt: chequeInstrument.amount,
                        cheque_favour: chequeInstrument.favouring || 'Not specified',
                    },
                    chequeInstrument.id,
                    'DD'
                );
                if (pdfPaths.length > 0) {
                    await this.db
                        .update(paymentInstruments)
                        .set({ generatedPdf: pdfPaths[0] })
                        .where(eq(paymentInstruments.id, chequeInstrument.id));
                    receivingChequeUrl = `${apiUrl}/payment-requests/instruments/${chequeInstrument.id}/pdf`;
                }
            } catch (error) {
                this.logger.error(`Failed to generate receiving PDF for cheque ${chequeInstrument.id}:`, error);
            }
        }

        const [ddPaymentReq] = await this.db
            .select({ requestedBy: paymentRequests.requestedBy })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        const tenderTeamId = await this.getTenderTeamId(tenderId, ddPaymentReq?.requestedBy || 0);

        try {
            // From: Cheque responsible user — To: DD responsible user
            const result = await this.emailService.sendPaymentEmail({
                requestId,
                tenderId: tenderId > 0 ? tenderId : undefined,
                eventType: 'DD_REQUEST',
                fromUserId: await this.getResponsibleUserIdByMode('CHEQUE') ?? 33,
                subject: `Cheque created for DD`,
                template: 'demand-draft-request',
                data: {
                    chequeNo: chequeDetails.chequeNo || 'N/A',
                    dueDate: this.formatDateDDMMYYYY(chequeDetails.dueDate),
                    amountFormatted: this.formatCurrency(Number(chequeInstrument.amount) || 0),
                    softCopyCheque: softCopyChequeUrl,
                    receivingCheque: receivingChequeUrl,
                    timeLimit: chequeInstrument.courierDeadline || 24,
                    beneficiaryName: chequeInstrument.favouring || 'Not specified',
                    payableAt: chequeInstrument.payableAt || 'Not specified',
                    link: `${this.getFrontendUrl()}/bi-dashboard/demand-drafts/${ddInstrumentId}`,
                    courierAddress: chequeInstrument.courierAddress || 'Not specified',
                },
                to: [{ type: 'emails', emails: [toEmails] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                ],
            });

            if (result.success) {
                this.logger.log(`DD email sent successfully for instrument ${requestId}`);
            } else {
                this.logger.warn(`DD email failed for instrument ${requestId}: ${result.error}`);
            }
            return result;
        } catch (error) {
            this.logger.error(`Failed to send DD email for instrument ${requestId}`, error);
            return { success: false, message: 'Email failed' };
        }
    }

    async sendFdrMailAfterChequeAction(
        chequeInstrument: any,
        chequeDetails: any,
        fdrInstrumentId: number,
        tenderId: number,
        requestId: number,
    ) {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender) {
            this.logger.warn(`Tender ${tenderId} not found for FDR email, sending without label`);
        }
        
        const toEmails = await this.getResponsibleUserEmailByMode('FDR');

        const apiUrl = this.configService.get<string>('app.apiUrl') || '';

        const softCopyChequeUrl = chequeDetails.chequeImagePath
            ? `${apiUrl.replace('/api/v1', '')}/uploads/bi-dashboard/${chequeDetails.chequeImagePath}`
            : '';

        let receivingChequeUrl = '';
        if (chequeInstrument.generatedPdf) {
            receivingChequeUrl = `${apiUrl}/payment-requests/instruments/${chequeInstrument.id}/pdf`;
        } else {
            try {
                const chequeDate = this.formatDateDDMMYYYY(chequeInstrument.issueDate) || this.formatDateDDMMYYYY(new Date().toISOString());
                const pdfPaths = await this.pdfGenerator.generatePdfs(
                    'chqCret',
                    {
                        cheque_date: chequeDate,
                        cheque_amt: chequeInstrument.amount,
                        cheque_favour: chequeInstrument.favouring || 'Not specified',
                    },
                    chequeInstrument.id,
                    'FDR'
                );
                if (pdfPaths.length > 0) {
                    await this.db
                        .update(paymentInstruments)
                        .set({ generatedPdf: pdfPaths[0] })
                        .where(eq(paymentInstruments.id, chequeInstrument.id));
                    receivingChequeUrl = `${apiUrl}/payment-requests/instruments/${chequeInstrument.id}/pdf`;
                }
            } catch (error) {
                this.logger.error(`Failed to generate receiving PDF for cheque ${chequeInstrument.id}:`, error);
            }
        }

        const [fdrPaymentReq] = await this.db
            .select({ requestedBy: paymentRequests.requestedBy })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        const tenderTeamId = await this.getTenderTeamId(tenderId, fdrPaymentReq?.requestedBy || 0);

        try {
            // From: Cheque responsible user — To: FDR responsible user
            const result = await this.emailService.sendPaymentEmail({
                requestId,
                tenderId: tenderId > 0 ? tenderId : undefined,
                eventType: 'FDR_REQUEST',
                fromUserId: await this.getResponsibleUserIdByMode('CHEQUE') ?? 33,
                subject: `Cheque created for FDR`,
                template: 'fixed-deposit-receipt-request',
                data: {
                    chequeNo: chequeDetails.chequeNo || 'N/A',
                    dueDate: this.formatDateDDMMYYYY(chequeDetails.dueDate),
                    amountFormatted: this.formatCurrency(Number(chequeInstrument.amount) || 0),
                    softCopyCheque: softCopyChequeUrl,
                    receivingCheque: receivingChequeUrl,
                    timeLimit: chequeInstrument.courierDeadline || 24,
                    beneficiaryName: chequeInstrument.favouring || 'Not specified',
                    payableAt: chequeInstrument.payableAt || 'Not specified',
                    link: `${this.getFrontendUrl()}/bi-dashboard/fdrs/${fdrInstrumentId}`,
                    courierAddress: chequeInstrument.courierAddress || 'Not specified',
                },
                to: [{ type: 'emails', emails: [toEmails] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                ],
            });

            if (result.success) {
                this.logger.log(`FDR email sent successfully for instrument ${requestId}`);
            } else {
                this.logger.warn(`FDR email failed for instrument ${requestId}: ${result.error}`);
            }
            return result;
        } catch (error) {
            this.logger.error(`Failed to send FDR email for instrument ${requestId}`, error);
            return { success: false, message: 'Email failed' };
        }
    }

    async sendDdCreatedMail(instrumentId: number, body: any, user: any) {
        const isAccepted = body.dd_req === 'Accepted';

        const [instrument] = await this.db
            .select({
                requestId: paymentInstruments.requestId,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                amount: paymentInstruments.amount,
            })
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for DD created email`);
            return;
        }

        const [paymentReq] = await this.db
            .select({
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, instrument.requestId))
            .limit(1);

        if (!paymentReq?.requestedBy) {
            this.logger.warn(`RequestedBy not found for DD instrument ${instrumentId}`);
            return;
        }

        const [reqUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, paymentReq.requestedBy))
            .limit(1);

        if (!reqUser?.email) {
            this.logger.warn(`Requester email not found for DD instrument ${instrumentId}`);
            return;
        }

        let imageUrl = '';
        let courierRequestLink = '';
        if (isAccepted && body.req_no) {
            const [courier] = await this.db
                .select({ courierDocs: couriers.courierDocs })
                .from(couriers)
                .where(eq(couriers.id, Number(body.req_no)))
                .limit(1);

            const docs = (courier?.courierDocs ?? []) as string[];
            if (docs.length > 0) {
                const baseUrl = (this.configService.get<string>('app.apiUrl') || '').replace('/api/v1', '');
                imageUrl = `${baseUrl}/uploads/courier/${docs[0]}`;
            }
            courierRequestLink = `${this.getFrontendUrl()}/shared/couriers/show/${body.req_no}`;
        }

        const tenderTeamId = await this.getTenderTeamId(paymentReq.tenderId || 0, paymentReq.requestedBy || 0);

        try {
            // From: DD responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: paymentReq.tenderId || undefined,
                eventType: isAccepted ? 'DD_CREATED' : 'DD_REJECTED',
                fromUserId: await this.getResponsibleUserIdByMode('DD') ?? 33,
                subject: `Request for DD ${isAccepted ? 'Accepted' : 'Rejected'} - ${paymentReq.purpose || ''}`,
                template: 'dd-created',
                data: {
                    requestedBy: reqUser.name,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    issueDate: isAccepted ? (this.formatDateDDMMYYYY(body.dd_date) || '') : '',
                    chequeNo: isAccepted ? (body.dd_no || '') : '',
                    beneficiaryName: instrument.favouring || '',
                    payableAt: instrument.payableAt || '',
                    amountFormatted: instrument.amount ? this.formatCurrency(Number(instrument.amount)) : '',
                    ddImage: imageUrl,
                    courierRequestNo: isAccepted ? (body.req_no || '') : '',
                    courierRequestLink,
                    remarks: isAccepted ? (body.remarks || '') : (body.reason_req || ''),
                },
                to: [{ type: 'emails', emails: [reqUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                ],
            });

            if (result.success) {
                this.logger.log(`DD created email sent for instrument ${instrumentId}`);
            } else {
                this.logger.warn(`DD created email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send DD created email for instrument ${instrumentId}:`, error);
        }
    }

    async sendFdrCreatedMail(instrumentId: number, body: any, user: any) {
        const isAccepted = body.fdr_req === 'Accepted';

        const [instrument] = await this.db
            .select({
                requestId: paymentInstruments.requestId,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                amount: paymentInstruments.amount,
            })
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for FDR created email`);
            return;
        }

        const [paymentReq] = await this.db
            .select({
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, instrument.requestId))
            .limit(1);

        if (!paymentReq?.requestedBy) {
            this.logger.warn(`RequestedBy not found for FDR instrument ${instrumentId}`);
            return;
        }

        const [reqUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, paymentReq.requestedBy))
            .limit(1);

        if (!reqUser?.email) {
            this.logger.warn(`Requester email not found for FDR instrument ${instrumentId}`);
            return;
        }

        let imageUrl = '';
        if (isAccepted && body.req_no) {
            const [courier] = await this.db
                .select({ courierDocs: couriers.courierDocs })
                .from(couriers)
                .where(eq(couriers.id, Number(body.req_no)))
                .limit(1);

            const docs = (courier?.courierDocs ?? []) as string[];
            if (docs.length > 0) {
                const baseUrl = (this.configService.get<string>('app.apiUrl') || '').replace('/api/v1', '');
                imageUrl = `${baseUrl}/uploads/courier/${docs[0]}`;
            }
        }

        const tenderTeamId = await this.getTenderTeamId(paymentReq.tenderId || 0, paymentReq.requestedBy || 0);

        try {
            // From: FDR responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: paymentReq.tenderId || undefined,
                eventType: isAccepted ? 'FDR_CREATED' : 'FDR_REJECTED',
                fromUserId: await this.getResponsibleUserIdByMode('FDR') ?? 33,
                subject: `Request for FDR ${isAccepted ? 'Accepted' : 'Rejected'} - ${paymentReq.purpose || ''}`,
                template: 'fdr-create',
                data: {
                    requestedBy: reqUser.name,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    issueDate: isAccepted ? (this.formatDateDDMMYYYY(body.fdr_date) || '') : '',
                    fdrNo: isAccepted ? (body.fdr_no || '') : '',
                    beneficiaryName: instrument.favouring || '',
                    payableAt: instrument.payableAt || '',
                    amountFormatted: instrument.amount ? this.formatCurrency(Number(instrument.amount)) : '',
                    fdrImage: imageUrl,
                    courierRequestNo: isAccepted ? (body.req_no || '') : '',
                    courierLink: '',
                    remarks: isAccepted ? (body.remarks || '') : (body.reason_req || ''),
                },
                to: [{ type: 'emails', emails: [reqUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                ],
            });

            if (result.success) {
                this.logger.log(`FDR created email sent for instrument ${instrumentId}`);
            } else {
                this.logger.warn(`FDR created email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send FDR created email for instrument ${instrumentId}:`, error);
        }
    }

    async sendChequeCreatedMail(
        instrumentId: number,
        status: 'Accepted' | 'Rejected',
        rejectionReason?: string,
        userId?: number,
    ) {
        const [instrument] = await this.db
            .select({
                requestId: paymentInstruments.requestId,
                tenderId: paymentRequests.tenderId,
                requestedBy: paymentRequests.requestedBy,
                generatedPdf: paymentInstruments.generatedPdf,
                purpose: paymentInstruments.purpose,
            })
            .from(paymentInstruments)
            .leftJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for cheque created email`);
            return;
        }

        let requestedUserName = 'Tender Executive';
        let recipientEmail = '';

        if (!instrument.requestedBy) {
            this.logger.warn(`RequestedBy not found for instrument ${instrumentId}, using fallback recipient`);
        } else {
            const [requestedUser] = await this.db
                .select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, instrument.requestedBy))
                .limit(1);

            if (requestedUser) {
                requestedUserName = requestedUser.name || requestedUserName;
                recipientEmail = requestedUser.email || '';
            }
            if (!recipientEmail) {
                this.logger.warn(`Requested user email not found for instrument ${instrumentId}, using fallback`);
            }
        }

        const [chequeDetails] = await this.db
            .select()
            .from(instrumentChequeDetails)
            .where(eq(instrumentChequeDetails.instrumentId, instrumentId))
            .limit(1);

        const apiUrl = this.configService.get<string>('app.apiUrl') || '';
        const baseUrl = apiUrl.replace('/api/v1', '');

        const chequePdfUrl = chequeDetails?.chequeImagePath
            ? `${baseUrl}/uploads/bi-dashboard/${chequeDetails.chequeImagePath}`
            : '';

        const receivingPdfUrl = instrument.generatedPdf
            ? `${apiUrl}/payment-requests/instruments/${instrumentId}/pdf`
            : '';

        const deliveryMethod = chequeDetails?.deliveryMethod || '';
        const tenderTeamId = await this.getTenderTeamId(instrument.tenderId || 0, instrument.requestedBy || 0);

        try {
            // From: Cheque responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'CHEQUE_CREATED',
                fromUserId: await this.getResponsibleUserIdByMode('CHEQUE') ?? 33,
                subject: `Cheque created - ${instrument.purpose}`,
                template: 'cheque-created',
                data: {
                    requestedBy: requestedUserName,
                    status: status === 'Accepted' ? 'Accepted' : 'Rejected',
                    chequePdfUrl,
                    remarks: status === 'Accepted' ? 'Your cheque has been created.' : '',
                    reason: rejectionReason || '',
                    chequeDeliveryMethod: deliveryMethod,
                    receivingPdfUrl,
                },
                to: [{ type: 'emails' as const, emails: [recipientEmail || 'gyan@volksenergie.in'] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                ],
            });

            if (result.success) {
                this.logger.log(`Cheque created email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`Cheque created email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send cheque created email for instrument ${instrumentId}:`, error);
        }
    }

    /**
     * Generate PDFs for an instrument
     */
    async generatePdfsForInstrument(instrumentId: number) {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new Error(`Instrument ${instrumentId} not found`);
        }

        const instrumentTypeMap: Record<string, string> = {
            'DD': 'DD',
            'FDR': 'FDR',
            'BG': 'BG',
            'Cheque': 'CHEQUE',
            'Bank Transfer': 'BANK_TRANSFER',
            'Portal Payment': 'PORTAL',
        };

        const instrumentType = instrumentTypeMap[instrument.instrumentType] || instrument.instrumentType;

        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs(
                `${instrumentType.toLowerCase()}-request`,
                {
                    amount: instrument.amount,
                    favouring: instrument.favouring,
                    payableAt: instrument.payableAt,
                },
                instrumentId,
                instrumentType
            );
            this.logger.log(`Generated PDFs for instrument ${instrumentId}: ${pdfPaths.join(', ')}`);
            return { success: true, instrumentId, pdfPaths };
        } catch (error) {
            this.logger.error(`Failed to generate PDF for instrument ${instrumentId}`, error);
            throw error;
        }
    }

    /**
     * Send email notification for payment instrument (Bank Transfer, Portal Payment)
     */
    async sendPaymentInstrumentEmail(
        instrumentId: number,
        instrumentType: string,
        purpose: string,
        tenderId: number,
        tender: any,
        requestedBy: number
    ): Promise<void> {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found`);
            return;
        }

        // Get tender team ID
        let tenderTeamId = 1;    
        if (tenderId > 0) {
            const tenderData = await this.db
                .select({ team: tenderInfos.team })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, tenderId))
                .limit(1);
            tenderTeamId = tenderData[0]?.team || 1;
        } else {
            const userData = await this.db
                .select({ team: users.team })
                .from(users)
                .where(eq(users.id, requestedBy))
                .limit(1);
            tenderTeamId = userData[0]?.team || 2;
        }

        const [tlUser] = await this.db
            .select({ name: users.name })
            .from(users)
            .where(
                and(
                    eq(users.team, tenderTeamId),
                    eq(users.roleId, 3)
                )
            )
            .limit(1);

        const mode = instrumentType.toUpperCase();

        const toEmails = await this.getResponsibleUserEmailByMode(mode);

        if (mode === 'BANK TRANSFER') {
            const [btDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                .limit(1);            

            try {
                // From: Requestor — To: BT responsible user
                const result = await this.emailService.sendPaymentEmail({
                    requestId: instrument.requestId,
                    tenderId: tenderId || undefined,
                    eventType: 'BANK_TRANSFER_REQUEST',
                    fromUserId: requestedBy,
                    subject: `Bank Transfer - ${purpose}`,
                    template: 'bank-transfer-request',
                    data: {
                        paymentInstrumentType: instrumentType,
                        tenderNo: tender?.tenderNo || 'NA',
                        tenderName: tender?.tenderName || 'Not specified',
                        dueDateTime: this.formatDateDDMMYYYY(tender?.dueDate),
                        btAccName: btDetails?.accountName || 'Not specified',
                        btAcc: btDetails?.accountNumber || 'Not specified',
                        btIfsc: btDetails?.ifsc || 'Not specified',
                        amount: this.formatCurrency(Number(instrument.amount) || 0),
                        isOthersPurpose: !(tenderId > 0),
                        link: `${this.getFrontendUrl()}/tendering/emds/${instrument.requestId}`,
                        tlName: tlUser?.name || 'Team Leader',
                    },
                    to: [{ type: 'emails', emails: [toEmails] }],
                    cc: [
                        { type: 'role', role: 'Admin', teamId: tenderTeamId },
                        { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                        { type: 'emails', emails: ['accounts@volksenergie.in']},
                    ]
                });
                if (result.success) {
                    this.logger.log(`Bank transfer email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`Bank transfer email failed for instrument ${instrumentId}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send bank transfer email for instrument ${instrumentId}:`, error);
            }
        } else if (mode === 'PORTAL PAYMENT') {
            const [portalDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                .limit(1);
                
            try {
                // From: Requestor — To: Portal-Payment responsible user
                const result = await this.emailService.sendPaymentEmail({
                    requestId: instrument.requestId,
                    tenderId: tenderId || undefined,
                    eventType: 'PORTAL_PAYMENT_REQUEST',
                    fromUserId: requestedBy,
                    subject: `Pay on Portal - ${purpose}`,
                    template: 'pay-on-portal-request',
                    data: {
                        portal: portalDetails?.portalName || 'Payment Portal',
                        purpose: purpose,
                        netbanking: portalDetails?.isNetbanking || 'Not specified',
                        debit: portalDetails?.isDebit || 'Not specified',
                        amount: this.formatCurrency(Number(instrument.amount) || 0),
                        isOthersPurpose: !(tenderId > 0),
                        tender_no: tender?.tenderNo || 'NA',
                        tender_name: tender?.tenderName || 'Not specified',
                        dueDate: this.formatDateDDMMYYYY(tender?.dueDate),
                        link: `${this.getFrontendUrl()}/tendering/emds/${instrument.requestId}`,
                        tlName: tlUser?.name || 'Team Leader',
                    },
                    to: [{ type: 'emails', emails: [toEmails] }],
                    cc: [
                        { type: 'role', role: 'Admin', teamId: tenderTeamId },
                        { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                        { type: 'emails', emails: ['accounts@volksenergie.in']},
                    ]
                });
                if (result.success) {
                    this.logger.log(`Portal payment email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`Portal payment email failed for instrument ${instrumentId}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send portal payment email for instrument ${instrumentId}:`, error);
            }
        } else if (mode === 'CHEQUE') {
            const [chequeDetails] = await this.db
                .select()
                .from(instrumentChequeDetails)
                .where(eq(instrumentChequeDetails.instrumentId, instrumentId))
                .limit(1);

    let finalPurpose = purpose || 'Payment';
    let finalPartyName = instrument.favouring || 'Not specified';
    let finalChequeDate = this.formatDateDDMMYYYY(instrument.issueDate) || this.formatDateDDMMYYYY(new Date().toISOString());
    let receivingPdfUrl = '';

    const linkedType = chequeDetails?.linkedDdId ? 'DD' : chequeDetails?.linkedFdrId ? 'FDR' : null;
    if (linkedType) {
        finalPurpose = linkedType;
        finalPartyName = `Yourself for ${linkedType}`;
        finalChequeDate = this.formatDateDDMMYYYY(new Date().toISOString());
    }

    try {
        const pdfPaths = await this.pdfGenerator.generatePdfs(
            'chqCret',
            {
                cheque_date: finalChequeDate,
                cheque_amt: instrument.amount,
                cheque_favour: instrument.favouring || 'Not specified',
            },
            instrumentId,
            linkedType || 'CHEQUE'
        );

        if (pdfPaths.length > 0) {
            await this.db
                .update(paymentInstruments)
                .set({ generatedPdf: pdfPaths[0] })
                .where(eq(paymentInstruments.id, instrumentId));

            const apiUrl = this.configService.get<string>('app.apiUrl') || '';
            receivingPdfUrl = `${apiUrl}/payment-requests/instruments/${instrumentId}/pdf`;
        }
    } catch (error) {
        this.logger.error(`Failed to generate receiving PDF for cheque ${instrumentId}:`, error);
    }

            try {
                const result = await this.emailService.sendPaymentEmail({
                    requestId: instrument.requestId,
                    tenderId: tenderId || undefined,
                    eventType: 'CHEQUE_REQUEST',
                    fromUserId: requestedBy,
                    subject: `New Cheque - ${finalPurpose}`,
                    template: 'cheque-request',
                    data: {
                        purpose: finalPurpose,
                        partyName: finalPartyName,
                        chequeDate: finalChequeDate,
                        amount: this.formatCurrency(Number(instrument.amount) || 0),
                        chequeNeeds: instrument.courierDeadline || 24,
                        link: `${this.getFrontendUrl()}/tendering/emds/${instrument.requestId}`,
                        tlName: tlUser?.name || 'Team Leader',
                        receivingPdfUrl,
                    },
                    to: [{ type: 'emails', emails: [toEmails] }],
                    cc: [
                        { type: 'role', role: 'Admin', teamId: tenderTeamId },
                        { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                        { type: 'emails', emails: ['accounts@volksenergie.in']},
                    ],
                });
                if (result.success) {
                    this.logger.log(`Cheque email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`Cheque email failed for instrument ${instrumentId}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send cheque email for instrument ${instrumentId}:`, error);
            }
        } else if (mode === 'BG') {
            try {
                // Fetch BG details
                const [bgDetails] = await this.db
                    .select()
                    .from(instrumentBgDetails)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                    .limit(1);

                const [paymentReq] = await this.db
                    .select({
                        requestedBy: paymentRequests.requestedBy,
                        tenderId: paymentRequests.tenderId,
                        purpose: paymentRequests.purpose,
                    })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, instrument.requestId))
                    .limit(1);

                if (!paymentReq?.requestedBy) {
                    this.logger.warn(`RequestedBy not found for BG instrument ${instrumentId}`);
                    return;
                }

                // Get tender team ID
                let tenderTeamId = 1;
                if (paymentReq.tenderId > 0) {
                    const tenderData = await this.db
                        .select({ team: tenderInfos.team })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, paymentReq.tenderId))
                        .limit(1);
                    tenderTeamId = tenderData[0]?.team || 1;
                }

                // Get TL user
                const [tlUser] = await this.db
                    .select({ name: users.name })
                    .from(users)
                    .where(
                        and(
                            eq(users.team, tenderTeamId),
                            eq(users.roleId, 3)
                        )
                    )
                    .limit(1);

                // Generate covering letter PDF
                const coveringLetterData = {
                    date: new Date().toISOString().split('T')[0],
                    beneficiaryName: bgDetails?.beneficiaryName || '',
                    beneficiaryAddress: bgDetails?.beneficiaryAddress || '',
                    amount: instrument.amount || 0,
                    bgExpiryDate: bgDetails?.bgExpiryDate ? this.formatDateDDMMYYYY(bgDetails.bgExpiryDate) : '',
                    claimDate: bgDetails?.bgClaim ? this.formatDateDDMMYYYY(bgDetails.bgClaim) : '',
                    purpose: bgDetails?.bgPurpose || 'Financial security',
                    stampPaperValue: bgDetails?.stampCharges || 300,
                    courierAddress: instrument.courierAddress || '',
                    bgPurpose: bgDetails?.bgPurpose || '',
                    actionLink: `${this.getFrontendUrl()}/bi-dashboard/bank-guarantee/action/${instrumentId}`,
                    actionLinkText: 'Accounts Form (BG) Stage 2: After BG Creation',
                    recipientName: 'Imran',
                    teamLeaderName: tlUser?.name || 'Team Leader',
                };

                const coveringLetterPaths = await this.pdfGenerator.generatePdfs(
                    'bgCoveringLetter',
                    coveringLetterData,
                    instrumentId,
                    'BG'
                );

                // Get PO copy file path
                const [bgPo] = await this.db
                    .select({ bgPo: instrumentBgDetails.bgPo })
                    .from(instrumentBgDetails)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                    .limit(1);

                // Build attachment paths
                const attachmentFiles: string[] = [];
                if (coveringLetterPaths && coveringLetterPaths.length > 0) {
                    attachmentFiles.push(coveringLetterPaths[0]);
                }
                if (bgPo?.bgPo) {
                    attachmentFiles.push(...this.toAttachmentPaths(bgPo.bgPo));
                }

                // Get recipient email - use Imran (Accounts Leader) as specified
                // Fallback to lookup if configured, otherwise hardcode Imran
                const toEmails: RecipientSource[] = [{ type: 'emails', emails: ['imran@volksenergie.in'] }];

                // From: TE (requestedBy)
                const fromUserId = paymentReq.requestedBy;

                // Subject
                const subject = `New Bank Guarantee - ${bgDetails?.bgPurpose || 'Financial security'}`;

                // CC: Coordinator, CEO, Accounts, TL
                const ccEmails: RecipientSource[] = [
                    { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                    { type: 'emails', emails: ['goyal@volksenergie.in'] },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                ];

                try {
                    const result = await this.emailService.sendPaymentEmail({
                        requestId: instrument.requestId,
                        tenderId: paymentReq.tenderId || undefined,
                        eventType: 'BG_REQUEST',
                        fromUserId,
                        subject,
                        template: 'bg-request',
                        data: {
                            recipientName: 'Imran',
                            bgPurpose: bgDetails?.bgPurpose || 'Financial security',
                            beneficiaryName: bgDetails?.beneficiaryName || '',
                            beneficiaryAddress: bgDetails?.beneficiaryAddress || '',
                            bgExpiryDate: bgDetails?.bgExpiryDate ? this.formatDateDDMMYYYY(bgDetails.bgExpiryDate) : '',
                            claimDate: bgDetails?.bgClaim ? this.formatDateDDMMYYYY(bgDetails.bgClaim) : '',
                            amount: instrument.amount ? Number(instrument.amount).toLocaleString('en-IN') : '',
                            stampPaperValue: bgDetails?.stampCharges || 300,
                            timeLimit: instrument.courierDeadline || 24,
                            actionLink: `${this.getFrontendUrl()}/bi-dashboard/bank-guarantee/action/${instrumentId}`,
                            actionLinkText: 'Accounts Form (BG) Stage 2: After BG Creation',
                            courierAddress: instrument.courierAddress || '',
                        },
                        to: toEmails,
                        cc: ccEmails,
                        attachments: {
                            files: attachmentFiles,
                        },
                    });

                    if (result.success) {
                        this.logger.log(`BG request email sent successfully for instrument ${instrumentId} (logId: ${result.emailLogId})`);
                    } else {
                        this.logger.warn(`BG request email failed for instrument ${instrumentId}: ${result.error}`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to send BG request email for instrument ${instrumentId}:`, error);
                }
            } catch (error) {
                this.logger.error(`Error processing BG request email for instrument ${instrumentId}:`, error);
            }
        } else {
            this.logger.log(`Email not supported for instrument type: ${instrumentType}, Mode: ${mode}`);
        }
    }

    async sendBtActionEmail(
        instrumentId: number,
        purpose: string,
        btReq: 'Accepted' | 'Rejected',
        paymentDateTime?: string,
        utrNo?: string,
        utrMessage?: string,
        rejectionReason?: string
    ): Promise<void> {
        const [instrument] = await this.db
            .select({ 
                requestId: paymentInstruments.requestId,
                tenderId: paymentRequests.tenderId,
                requestedBy: paymentRequests.requestedBy 
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for BT action email`);
            return;
        }

        if (!instrument.requestedBy) {
            this.logger.warn(`RequestedBy not found for instrument ${instrumentId}`);
            return;
        }

        const [requestedUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, instrument.requestedBy))
            .limit(1);

        if (!requestedUser?.email) {
            this.logger.warn(`RequestedBy user not found for instrument ${instrumentId}`);
            return;
        }

        let tenderNo = 'NA';
        let tenderName = 'Not specified';
        if (instrument.tenderId) {
            const [tender] = await this.db
                .select({ tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, instrument.tenderId))
                .limit(1);
            if (tender) {
                tenderNo = tender.tenderNo || 'NA';
                tenderName = tender.tenderName || 'Not specified';
            }
        }

        const status = btReq === 'Accepted' ? 'accepted' : 'rejected';

        const tenderTeamId = await this.getTenderTeamId(instrument.tenderId || 0, instrument.requestedBy || 0);

        try {
            // From: BT responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'BT_ACTION',
                fromUserId: await this.getResponsibleUserIdByMode('BANK_TRANSFER') ?? 33,
                subject: `Payment via Bank Transfer ${purpose}`,
                template: 'bt-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrument: 'Bank Transfer',
                    tenderNo,
                    tenderName,
                    status,
                    paymentDateTime: this.formatDateDDMMYYYY(paymentDateTime) || '',
                    utr: utrNo || '',
                    utrMessage: utrMessage || '',
                    rejectionReason: rejectionReason || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: [requestedUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in']},
                ],
            });

            if (result.success) {
                this.logger.log(`BT action email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`BT action email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send BT action email for instrument ${instrumentId}:`, error);
        }
    }

    async sendPopActionEmail(
        instrumentId: number,
        purpose: string,
        popReq: 'Accepted' | 'Rejected',
        paymentDateTime?: string,
        utrNo?: string,
        utrMessage?: string,
        rejectionReason?: string

    ): Promise<void> {
        const [instrument] = await this.db
            .select({ 
                requestId: paymentInstruments.requestId,
                tenderId: paymentRequests.tenderId,
                requestedBy: paymentRequests.requestedBy,
                legacyData: paymentInstruments.legacyData,
                generatedPdf: paymentInstruments.generatedPdf,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for POP action email`);
            return;
        }

        if (!instrument.requestedBy) {
            this.logger.warn(`RequestedBy not found for instrument ${instrumentId}`);
            return;
        }

        const [requestedUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, instrument.requestedBy))
            .limit(1);

        if (!requestedUser?.email) {
            this.logger.warn(`RequestedBy user not found for instrument ${instrumentId}`);
            return;
        }

        let tenderNo = 'NA';
        let tenderName = 'Not specified';
        if (instrument.tenderId) {
            const [tender] = await this.db
                .select({ tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, instrument.tenderId))
                .limit(1);
            if (tender) {
                tenderNo = tender.tenderNo || 'NA';
                tenderName = tender.tenderName || 'Not specified';
            }
        }

        const status = popReq === 'Accepted' ? 'accepted' : 'rejected';

        // Get payment proof path (from legacyData or generatedPdf)
        const legacyData = instrument.legacyData as Record<string, any> | null;
        const paymentProofPath = legacyData?.payment_proof || instrument.generatedPdf || undefined;
        const apiUrl = this.configService.get<string>('app.apiUrl') || '';
        const paymentProofUrl = paymentProofPath ? `${apiUrl}/files/serve/${paymentProofPath}` : '';

        const tenderTeamId = await this.getTenderTeamId(instrument.tenderId || 0, instrument.requestedBy || 0);

        try {
            // From: Portal-Payment responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'POP_ACTION',
                fromUserId: await this.getResponsibleUserIdByMode('PORTAL_PAYMENT') ?? 33,
                subject: `Payment on Portal - ${purpose}`,
                template: 'pop-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    status,
                    paymentDateTime: this.formatDateDDMMYYYY(paymentDateTime) || '',
                    utr: utrNo || '',
                    utrMessage: utrMessage || '',
                    rejectionReason: rejectionReason || '',
                    senderName: 'Accounts Team',
                    paymentProofUrl,
                },
                to: [{ type: 'emails', emails: [requestedUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in']},
                ],
            });

            if (result.success) {
                this.logger.log(`POP action email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`POP action email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send POP action email for instrument ${instrumentId}:`, error);
        }
    }

    async sendBtReturnEmail(
        instrumentId: number,
        returnTransferDate?: string,
        returnUtr?: string
    ): Promise<void> {
        const [instrument] = await this.db
            .select({
                requestId: paymentInstruments.requestId,
                tenderId: paymentRequests.tenderId,
                requestedBy: paymentRequests.requestedBy,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for BT return email`);
            return;
        }

        if (!instrument.requestedBy) {
            this.logger.warn(`RequestedBy not found for instrument ${instrumentId}`);
            return;
        }

        const [requestedUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, instrument.requestedBy))
            .limit(1);

        if (!requestedUser?.email) {
            this.logger.warn(`RequestedBy user not found for instrument ${instrumentId}`);
            return;
        }   

        const tenderTeamId = await this.getTenderTeamId(instrument.tenderId || 0, instrument.requestedBy || 0);

        try {
            // From: BT responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'BT_RETURN',
                fromUserId: await this.getResponsibleUserIdByMode('BANK_TRANSFER') ?? 33,
                subject: `Payment Returned - ${instrument.projectName}`,
                template: 'returned-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrumentType: 'Bank Transfer',
                    tenderName: instrument.projectName || 'NA',
                    tenderNo: instrument.tenderNo || 'NA',
                    returnTransferDate: this.formatDateDDMMYYYY(returnTransferDate) || '',
                    returnUtr: returnUtr || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: [requestedUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in']},
                ],
            });

            if (result.success) {
                this.logger.log(`BT return email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`BT return email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send BT return email for instrument ${instrumentId}:`, error);
        }
    }

    async sendPopReturnEmail(
        instrumentId: number,
        returnTransferDate?: string,
        returnUtr?: string
    ): Promise<void> {
        const [instrument] = await this.db
            .select({
                requestId: paymentInstruments.requestId,
                tenderId: paymentRequests.tenderId,
                requestedBy: paymentRequests.requestedBy,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for POP return email`);
            return;
        }

        if (!instrument.requestedBy) {
            this.logger.warn(`RequestedBy not found for instrument ${instrumentId}`);
            return;
        }

        const [requestedUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, instrument.requestedBy))
            .limit(1);

        if (!requestedUser?.email) {
            this.logger.warn(`RequestedBy user not found for instrument ${instrumentId}`);
            return;
        }

        const [transferDetails] = await this.db
            .select({ portalName: instrumentTransferDetails.portalName })
            .from(instrumentTransferDetails)
            .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
            .limit(1);

        const tenderTeamId = await this.getTenderTeamId(instrument.tenderId || 0, instrument.requestedBy || 0);

        try {
            // From: Portal-Payment responsible user — To: Requestor
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'POP_RETURN',
                fromUserId: await this.getResponsibleUserIdByMode('PORTAL_PAYMENT') ?? 33,
                subject: `Payment Returned - ${instrument.projectName}`,
                template: 'returned-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrumentType: 'Pay on Portal',
                    portalName: transferDetails?.portalName || 'NA',
                    tenderName: instrument.projectName || 'NA',
                    tenderNo: instrument.tenderNo || 'NA',
                    returnTransferDate: this.formatDateDDMMYYYY(returnTransferDate) || '',
                    returnUtr: returnUtr || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: [requestedUser.email] }],
                cc: [
                    { type: 'role', role: 'Admin', teamId: tenderTeamId },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: ['accounts@volksenergie.in']},
                ],
            });

            if (result.success) {
                this.logger.log(`POP return email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`POP return email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send POP return email for instrument ${instrumentId}:`, error);
        }
    }

    async processChequeDueDateReminders() {
        this.logger.log('Processing cheque due date reminders...');

        const cheques = await this.db
            .select({
                instrument: paymentInstruments,
                chequeDetails: instrumentChequeDetails,
                request: paymentRequests,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(
                eq(paymentInstruments.instrumentType, 'Cheque'),
                eq(paymentInstruments.isActive, true),
                isNull(instrumentChequeDetails.linkedDdId),
                isNull(instrumentChequeDetails.linkedFdrId),
            ));

        this.logger.log(`Found ${cheques.length} active cheques for due date check`);

        const reminderDays = [15, 7, 3, 2, 1];

        for (const cheque of cheques) {
            if (!cheque.chequeDetails.dueDate) {
                this.logger.debug(`Cheque #${cheque.instrument.id} has no due date, skipping`);
                continue;
            }

            const dueDate = new Date(cheque.chequeDetails.dueDate);
            const today = new Date();
            const daysUntilDue = differenceInDays(dueDate, today);

            this.logger.debug(`Cheque #${cheque.instrument.id}: dueDate=${cheque.chequeDetails.dueDate}, today=${today.toISOString()}, daysUntilDue=${daysUntilDue}`);

            if (!reminderDays.includes(daysUntilDue)) {
                this.logger.debug(`Cheque #${cheque.instrument.id}: ${daysUntilDue} days left, not in reminder schedule`);
                continue;
            }

            const tenderTeamId = await this.getTenderTeamId(cheque.request.tenderId || 0, cheque.request.requestedBy || 0);

            const data = {
                purpose: cheque.chequeDetails.chequeReason || cheque.request.purpose || '',
                chequeNo: cheque.chequeDetails.chequeNo || 'N/A',
                partyName: cheque.instrument.favouring || 'N/A',
                amount: this.formatCurrency(Number(cheque.instrument.amount) || 0),
                dueDate: this.formatDateDDMMYYYY(cheque.chequeDetails.dueDate),
                daysLeft: daysUntilDue,
            };

            this.logger.log(`Sending cheque due date reminder for Cheque #${cheque.instrument.id}, ${daysUntilDue} days before due date`);

            try {
                const result = await this.emailService.sendPaymentEmail({
                    requestId: cheque.request.id,
                    tenderId: cheque.request.tenderId || undefined,
                    eventType: 'CHEQUE_DUE_DATE_REMINDER',
                    fromUserId: 8,
                    subject: `Cheque Due Date Reminder - ${data.chequeNo} (${data.daysLeft} days left)`,
                    template: 'cheque-due-date-reminder',
                    data,
                    to: [{ type: 'emails', emails: ['kailash@volksenergie.in'] }],
                    cc: [
                        { type: 'role', role: 'Admin', teamId: tenderTeamId },
                        { type: 'emails', emails: ['accounts@volksenergie.in'] },
                    ],
                });

                if (result.success) {
                    this.logger.log(`Cheque due date reminder sent for Cheque #${cheque.instrument.id} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`Cheque due date reminder failed for Cheque #${cheque.instrument.id}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send cheque due date reminder for Cheque #${cheque.instrument.id}:`, error);
            }
        }
    }

    async processBgClaimPeriodReminders() {
        this.logger.log('Processing BG claim period reminders...');

        const bgs = await this.db
            .select({
                instrument: paymentInstruments,
                bgDetails: instrumentBgDetails,
                request: paymentRequests,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(
                eq(paymentInstruments.instrumentType, 'BG'),
                eq(paymentInstruments.isActive, true),
                notInArray(paymentInstruments.action, [4, 5, 6, 7, 8, 9]),
            ));

        this.logger.log(`Found ${bgs.length} active BGs for claim period check`);

        for (const bg of bgs) {
            if (!bg.instrument.validityDate) {
                this.logger.debug(`BG #${bg.instrument.id} has no validity date, skipping`);
                continue;
            }

            const currentDate = new Date();
            const bgExpiryDate = new Date(bg.instrument.validityDate);

            if (currentDate <= bgExpiryDate) {
                this.logger.debug(`BG #${bg.instrument.id} has not crossed expiry date yet, skipping`);
                continue;
            }

            const tenderId = bg.request.tenderId || 0;
            let user;

            if (tenderId > 0) {
                const [tender] = await this.db
                    .select({ teamMember: tenderInfos.teamMember })
                    .from(tenderInfos)
                    .where(eq(tenderInfos.id, tenderId))
                    .limit(1);

                if (tender?.teamMember) {
                    [user] = await this.db
                        .select()
                        .from(users)
                        .where(and(eq(users.id, Number(tender.teamMember)), eq(users.isActive, true)))
                        .limit(1);
                }
            }

            if (!user && bg.request.requestedBy) {
                [user] = await this.db
                    .select()
                    .from(users)
                    .where(and(eq(users.id, bg.request.requestedBy), eq(users.isActive, true)))
                    .limit(1);
            }

            if (!user) {
                this.logger.warn(`BG #${bg.instrument.id}: No user found for this BG, skipping`);
                continue;
            }

            const apiUrl = this.configService.get<string>('app.apiUrl') || '';
            const baseUrl = apiUrl.replace('/api/v1', '');
            const softCopyUrl = bg.bgDetails.bgSoftCopy
                ? `${baseUrl}/uploads/bi-dashboard/bank-guarantee/${bg.bgDetails.bgSoftCopy}`
                : '';

            const data = {
                assignee: user.name || 'User',
                bg_no: bg.bgDetails.bgNo || 'N/A',
                favor: bg.instrument.favouring || 'N/A',
                bg_validity: this.formatDateDDMMYYYY(bg.instrument.validityDate),
                bg_claim_period_expiry: bg.instrument.claimExpiryDate
                    ? this.formatDateDDMMYYYY(bg.instrument.claimExpiryDate)
                    : 'N/A',
                amount: this.formatCurrency(Number(bg.instrument.amount) || 0),
                form_link: `${this.getFrontendUrl()}/bi-dashboard/bank-guarantees/${bg.instrument.id}`,
                soft_copy: softCopyUrl,
            };

            const ccEmails = [
                'accounts@volksenergie.in', 'goyal@volksenergie.in', 'kainaat@volksenergie.in',
                'aditya@volksenergie.in', 'arathi@volksenergie.in', 'priyanka@volksenergie.in', 'ahkamul@volksenergie.in',
            ];

            const [sender] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'imran@volksenergie.in'))
                .limit(1);

            this.logger.log(`Sending BG claim period notification for BG #${bg.instrument.id}`);

            try {
                const result = await this.emailService.sendPaymentEmail({
                    requestId: bg.request.id,
                    tenderId: bg.request.tenderId || undefined,
                    eventType: 'BG_CLAIM_PERIOD',
                    fromUserId: sender?.id || 33,
                    subject: `BG Claim Period Notification - ${data.bg_no}`,
                    template: 'bg-claim-period',
                    data,
                    to: [{ type: 'emails', emails: [user.email] }],
                    cc: [{ type: 'emails', emails: ccEmails }],
                });

                if (result.success) {
                    this.logger.log(`BG claim period notification sent for BG #${bg.instrument.id} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`BG claim period notification failed for BG #${bg.instrument.id}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send BG claim period notification for BG #${bg.instrument.id}:`, error);
            }
        }
    }

    async processBgExpiryReminders() {
        this.logger.log('Processing BG expiry reminders...');

        const bgs = await this.db
            .select({
                instrument: paymentInstruments,
                bgDetails: instrumentBgDetails,
                request: paymentRequests,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(
                eq(paymentInstruments.instrumentType, 'BG'),
                eq(paymentInstruments.isActive, true),
                notInArray(paymentInstruments.action, [4, 5, 6, 7, 8, 9]),
            ));

        this.logger.log(`Found ${bgs.length} active BGs for expiry reminder check`);

        const reminderDays = [90, 60, 45, 30, 15, 7, 1];

        for (const bg of bgs) {
            if (!bg.instrument.validityDate) {
                this.logger.debug(`BG #${bg.instrument.id} has no validity date, skipping`);
                continue;
            }

            const dueDate = new Date(bg.instrument.validityDate);
            const today = new Date();
            const daysUntilDue = differenceInDays(dueDate, today);

            this.logger.debug(`BG #${bg.instrument.id}: bg_expiry=${bg.instrument.validityDate}, today=${today.toISOString()}, daysUntilDue=${daysUntilDue}`);

            if (!reminderDays.includes(daysUntilDue)) {
                this.logger.debug(`BG #${bg.instrument.id}: ${daysUntilDue} days left, not in reminder schedule`);
                continue;
            }

            const tenderId = bg.request.tenderId || 0;
            let user;

            if (tenderId > 0) {
                const [tender] = await this.db
                    .select({ teamMember: tenderInfos.teamMember })
                    .from(tenderInfos)
                    .where(eq(tenderInfos.id, tenderId))
                    .limit(1);

                if (tender?.teamMember) {
                    [user] = await this.db
                        .select()
                        .from(users)
                        .where(and(eq(users.id, Number(tender.teamMember)), eq(users.isActive, true)))
                        .limit(1);
                }
            }

            if (!user && bg.request.requestedBy) {
                [user] = await this.db
                    .select()
                    .from(users)
                    .where(and(eq(users.id, bg.request.requestedBy), eq(users.isActive, true)))
                    .limit(1);
            }

            if (!user) {
                this.logger.warn(`BG #${bg.instrument.id}: No user found for this BG, skipping`);
                continue;
            }

            const apiUrl = this.configService.get<string>('app.apiUrl') || '';
            const baseUrl = apiUrl.replace('/api/v1', '');
            const softCopyUrl = bg.bgDetails.bgSoftCopy
                ? `${baseUrl}/uploads/bi-dashboard/bank-guarantee/${bg.bgDetails.bgSoftCopy}`
                : '';

            const data = {
                days: daysUntilDue,
                assignee: user.name || 'User',
                bg_no: bg.bgDetails.bgNo || 'N/A',
                project_name: bg.request.projectName || 'N/A',
                favor: bg.instrument.favouring || 'N/A',
                bg_validity: this.formatDateDDMMYYYY(bg.instrument.validityDate),
                bg_claim_period_expiry: bg.instrument.claimExpiryDate
                    ? this.formatDateDDMMYYYY(bg.instrument.claimExpiryDate)
                    : 'N/A',
                amount: this.formatCurrency(Number(bg.instrument.amount) || 0),
                form_link: `${this.getFrontendUrl()}/bi-dashboard/bank-guarantees/${bg.instrument.id}`,
                soft_copy: softCopyUrl,
            };

            const ccEmails = [
                'accounts@volksenergie.in', 'goyal@volksenergie.in', 'kainaat@volksenergie.in',
                'aditya@volksenergie.in', 'arathi@volksenergie.in', 'priyanka@volksenergie.in', 'ahkamul@volksenergie.in',
            ];

            const tenderTeamId = await this.getTenderTeamId(bg.request.tenderId || 0, bg.request.requestedBy || 0);

            const ccSources: any[] = [
                { type: 'emails', emails: ccEmails },
                { type: 'role', role: 'Admin', teamId: tenderTeamId },
                { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
            ];

            const [sender] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'imran@volksenergie.in'))
                .limit(1);

            this.logger.log(`Sending BG claim period notification for BG #${bg.instrument.id}`);

            try {
                const result = await this.emailService.sendPaymentEmail({
                    requestId: bg.request.id,
                    tenderId: bg.request.tenderId || undefined,
                    eventType: 'BG_CLAIM_PERIOD',
                    fromUserId: sender?.id || 33,
                    subject: `BG Claim Period Notification - ${data.bg_no}`,
                    template: 'bg-claim-period',
                    data,
                    to: [{ type: 'emails', emails: [user.email] }],
                    cc: ccSources,
                });

                if (result.success) {
                    this.logger.log(`BG claim period notification sent for BG #${bg.instrument.id} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`BG claim period notification failed for BG #${bg.instrument.id}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send BG claim period notification for BG #${bg.instrument.id}:`, error);
            }
        }
    }

    /**
     * Send BG rejection email when Accounts Form 1 is rejected
     */
    async sendBgRejectedEmail(instrumentId: number): Promise<void> {
        this.logger.log(`Sending BG rejection email for instrument ${instrumentId}`);

        // Fetch instrument + payment request + BG details
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for BG rejection email`);
            return;
        }

        const [paymentReq] = await this.db
            .select({
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, instrument.requestId))
            .limit(1);

        if (!paymentReq?.requestedBy) {
            this.logger.warn(`RequestedBy not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get TE name and email
        const [teUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, paymentReq.requestedBy))
            .limit(1);

        if (!teUser?.email) {
            this.logger.warn(`TE email not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get tender team ID
        let tenderTeamId = 1;
        if (paymentReq.tenderId > 0) {
            const tenderData = await this.db
                .select({ team: tenderInfos.team })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, paymentReq.tenderId))
                .limit(1);
            tenderTeamId = tenderData[0]?.team || 1;
        }

        // Get TL user
        const [tlUser] = await this.db
            .select({ name: users.name })
            .from(users)
            .where(
                and(
                    eq(users.team, tenderTeamId),
                    eq(users.roleId, 3)
                )
            )
            .limit(1);

        // Get BG details for purpose
        const [bgDetails] = await this.db
            .select()
            .from(instrumentBgDetails)
            .where(eq(instrumentBgDetails.instrumentId, instrumentId))
            .limit(1);

        // Get CC emails
        const ccEmails: RecipientSource[] = [
            { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
            { type: 'emails', emails: ['goyal@volksenergie.in'] },
            { type: 'emails', emails: ['accounts@volksenergie.in'] },
            { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
        ];

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: paymentReq.tenderId || undefined,
                eventType: 'BG_REJECTED',
                fromUserId: (await this.db.select({ id: users.id }).from(users).where(eq(users.email, 'imran@volksenergie.in')) as any)[0]?.id ?? 33,
                subject: `Bank Guarantee rejected - ${bgDetails?.bgPurpose || 'Financial security'}`,
                template: 'bg-rejected',
                data: {
                    teName: teUser.name || 'Tender Executive',
                    reason: instrument.rejectionReason || '',
                    purpose: bgDetails?.bgPurpose || 'Financial security',
                },
                to: [{ type: 'emails', emails: [teUser.email] }],
                cc: ccEmails,
            });

            if (result.success) {
                this.logger.log(`BG rejection email sent successfully for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`BG rejection email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send BG rejection email for instrument ${instrumentId}:`, error);
        }
    }

    /**
     * Send BG creation and couriered email when Accounts Form 2 is accepted
     */
    async sendBgCreatedCourieredEmail(instrumentId: number): Promise<void> {
        this.logger.log(`Sending BG creation and couriered email for instrument ${instrumentId}`);

        // Fetch instrument + payment request + BG details
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for BG creation couriered email`);
            return;
        }

        const [paymentReq] = await this.db
            .select({
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, instrument.requestId))
            .limit(1);

        if (!paymentReq?.requestedBy) {
            this.logger.warn(`RequestedBy not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get TE name and email
        const [teUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, paymentReq.requestedBy))
            .limit(1);

        if (!teUser?.email) {
            this.logger.warn(`TE email not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get tender team ID
        let tenderTeamId = 1;
        if (paymentReq.tenderId > 0) {
            const tenderData = await this.db
                .select({ team: tenderInfos.team })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, paymentReq.tenderId))
                .limit(1);
            tenderTeamId = tenderData[0]?.team || 1;
        }

        // Get BG details for purpose and soft copy
        const [bgDetails] = await this.db
            .select()
            .from(instrumentBgDetails)
            .where(eq(instrumentBgDetails.instrumentId, instrumentId))
            .limit(1);

        // From: Imran (Accounts Leader)
        const [sender] = await this.db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, 'imran@volksenergie.in'))
            .limit(1);

        // Get CC emails
        const ccEmails: RecipientSource[] = [
            { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
            { type: 'emails', emails: ['goyal@volksenergie.in'] },
            { type: 'emails', emails: ['accounts@volksenergie.in'] },
            { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
        ];

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: paymentReq.tenderId || undefined,
                eventType: 'BG_CREATED_COURIERED',
                fromUserId: sender?.id ?? 33,
                subject: `New BG created and Couriered - ${bgDetails?.bgPurpose || 'Financial security'}`,
                template: 'bg-created-couriered',
                data: {
                    teName: teUser.name || 'Tender Executive',
                    purpose: bgDetails?.bgPurpose || 'Financial security',
                    courierNo: bgDetails?.courierNo || '',
                    reasons: bgDetails?.bg2Remark || '',
                },
                to: [{ type: 'emails', emails: [teUser.email] }],
                cc: ccEmails,
                attachments: {
                    files: this.toAttachmentPaths(bgDetails?.bgSoftCopy).map((p) =>
                        p.startsWith('bi-dashboard/bank-guarantee/') ? p : `bi-dashboard/bank-guarantee/${p}`,
                    ),
                },
            });

            if (result.success) {
                this.logger.log(`BG creation and couriered email sent successfully for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`BG creation and couriered email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send BG creation and couriered email for instrument ${instrumentId}:`, error);
        }
    }

    async sendBgBankRequestEmail(instrumentId: number): Promise<void> {
        try {
            this.logger.log(`Preparing BG bank request email for instrument ${instrumentId}`);

            // Fetch instrument + payment request + BG details
            const [result] = await this.db
                .select({
                    instrument: paymentInstruments,
                    request: paymentRequests,
                    bgDetails: instrumentBgDetails,
                })
                .from(paymentInstruments)
                .innerJoin(paymentRequests, eq(paymentInstruments.requestId, paymentRequests.id))
                .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
                .where(eq(paymentInstruments.id, instrumentId))
                .limit(1);

            if (!result || !result.instrument) {
                this.logger.warn(`BG bank request email skipped: instrument ${instrumentId} not found`);
                return;
            }

            const { instrument, request, bgDetails } = result;

            if (!bgDetails) {
                this.logger.warn(`BG bank request email skipped: no BG details found for instrument ${instrumentId}`);
                return;
            }

            // Resolve bank "To" mail ids
            const bankMailIds = (bgDetails.bankMailIds || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIds.length === 0) {
                this.logger.warn(
                    `BG bank request email skipped: no bank mail ids saved for instrument ${instrumentId}`,
                );
                return;
            }

            const toEmails: RecipientSource[] = [{ type: 'emails', emails: bankMailIds }];

            // Resolve tender team for role-based CC recipients
            const tenderTeamId = await this.getTenderTeamId(request.tenderId || 0, request.requestedBy || 0);

            const ccSources: RecipientSource[] = [
                { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                { type: 'emails', emails: ['accounts@volksenergie.in'] },
            ];

            const bankMailIdsCc = (bgDetails.bankMailIdsCc || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIdsCc.length > 0) {
                ccSources.push({ type: 'emails', emails: bankMailIdsCc });
            }

            // Resolve attachments: prefilled & signed BG forms, PO copy/request letter, BG Format
            // attachments.files expects plain path strings
            const attachmentFiles: string[] = [];

            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.prefilledSignedBg));
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.bgPo));
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.bgFormatTe || bgDetails.bgFormatTl));

            // Resolve "From" as CEO; fall back to Imran, then hardcoded user id
            let fromUserId: number;

            const [ceoUser] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'goyal@volksenergie.in'))
                .limit(1);

            if (ceoUser) {
                fromUserId = ceoUser.id;
            } else {
                this.logger.warn('CEO user not found for BG bank request email, falling back to Imran');
                const [imranUser] = await this.db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.email, 'imran@volksenergie.in'))
                    .limit(1);

                fromUserId = imranUser ? imranUser.id : 33;
            }

            // Compose email content fields
            const bgPurpose = bgDetails.bgPurpose || `Performance Bank Guarantee for ${request.projectName || ''}`;
            const beneficiaryName = bgDetails.beneficiaryName || '';
            const beneficiaryAddress = bgDetails.beneficiaryAddress || '';
            const timeLimit = instrument.courierDeadline || 24;

            await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: request.tenderId || undefined,
                eventType: 'BG_BANK_REQUEST',
                template: 'bg-accepted',
                subject: `New Bank Guarantee required in ${timeLimit}Hrs.`,
                fromUserId,
                to: toEmails,
                cc: ccSources,
                data: {
                    bgPurpose,
                    beneficiaryName,
                    beneficiaryAddress,
                    bgExpiryDate: this.formatDateDDMMYYYY(bgDetails.bgExpiryDate),
                    claimDate: this.formatDateDDMMYYYY(bgDetails.bgClaim),
                    amount: (Number(instrument.amount) || 0).toLocaleString('en-IN'),
                    stampPaperValue: (Number(bgDetails.stampCharges) || 300).toLocaleString('en-IN'),
                    fdrMargin: bgDetails.fdrPer ? `${bgDetails.fdrPer}%` : '10%/100%',
                    beneName: bgDetails.bgBankAccName || '',
                    beneAcc: bgDetails.bgBankAcc || '',
                    beneIfsc: bgDetails.bgBankIfsc || '',
                    timeLimit,
                },
                attachments: { files: attachmentFiles },
            });

            this.logger.log(
                `BG bank request email sent for instrument ${instrumentId} to ${bankMailIds.join(', ')}`,
            );
        } catch (error) {
            this.logger.error(`Failed to send BG bank request email for instrument ${instrumentId}:`, error);
            throw error;
        }
    }

    
    async sendBgCancellationRequestEmail(instrumentId: number): Promise<void> {
        try {
            this.logger.log(`Preparing BG cancellation request email for instrument ${instrumentId}`);

            // Fetch instrument + payment request + BG details
            const [result] = await this.db
                .select({
                    instrument: paymentInstruments,
                    request: paymentRequests,
                    bgDetails: instrumentBgDetails,
                })
                .from(paymentInstruments)
                .innerJoin(paymentRequests, eq(paymentInstruments.requestId, paymentRequests.id))
                .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
                .where(eq(paymentInstruments.id, instrumentId))
                .limit(1);

            if (!result || !result.instrument) {
                this.logger.warn(`BG cancellation request email skipped: instrument ${instrumentId} not found`);
                return;
            }

            const { instrument, request, bgDetails } = result;

            if (!bgDetails) {
                this.logger.warn(
                    `BG cancellation request email skipped: no BG details found for instrument ${instrumentId}`,
                );
                return;
            }

            // Resolve bank "To" mail ids (saved at Form 1 time; YES Bank or PNB depending on the BG)
            const bankMailIds = (bgDetails.bankMailIds || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIds.length === 0) {
                this.logger.warn(
                    `BG cancellation request email skipped: no bank mail ids saved for instrument ${instrumentId}`,
                );
                return;
            }

            const toEmails: RecipientSource[] = [{ type: 'emails', emails: bankMailIds }];

            // Resolve tender team for role-based CC recipients
            const tenderTeamId = await this.getTenderTeamId(request.tenderId || 0, request.requestedBy || 0);

            const ccSources: RecipientSource[] = [
                { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                { type: 'emails', emails: ['accounts@volksenergie.in'] },
            ];

            const bankMailIdsCc = (bgDetails.bankMailIdsCc || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIdsCc.length > 0) {
                ccSources.push({ type: 'emails', emails: bankMailIdsCc });
            }

            // Compose shared content fields (raw en-IN formatted numbers; templates carry the "Rs." prefix)
            const bgNo = bgDetails.bgNo || '';
            const fdrNo = bgDetails.fdrNo || '';
            const bgDate = this.formatDateDDMMYYYY(bgDetails.bgDate);
            const amount = (Number(instrument.amount) || 0).toLocaleString('en-IN');
            const fdrAmt = bgDetails.fdrAmt ? (Number(bgDetails.fdrAmt) || 0).toLocaleString('en-IN') : '';
            const bgFavour = bgDetails.beneficiaryName || instrument.favouring || '';
            const bankName = bgDetails.extendedBankName || bgDetails.bankName || '';

            // Generate the "Request Letter on VE Letterhead" PDF (template: req-cancel-letter)
            let requestLetterPath: string | null = null;
            try {
                const letterPaths = await this.pdfGenerator.generatePdfs(
                    'reqCancelLetter',
                    {
                        bank_name: bankName,
                        bg_no: bgNo,
                        bg_date: bgDate,
                        bg_favour: bgFavour,
                        bg_amt: amount,
                        fdr_no: fdrNo,
                        fdr_amt: fdrAmt,
                    },
                    instrumentId,
                    'BG',
                );

                if (letterPaths && letterPaths.length > 0) {
                    requestLetterPath = letterPaths[0];
                }
            } catch (error) {
                this.logger.error(
                    `Failed to generate cancellation request letter PDF for instrument ${instrumentId}:`,
                    error,
                );
            }

            // Attachments: request letter (generated), client covering letter, BG soft copy, FDR soft copy
            const attachmentFiles: string[] = [];

            if (requestLetterPath) {
                attachmentFiles.push(requestLetterPath);
            }

            const coveringLetter = bgDetails.stampCoveringLetter || instrument.coveringLetter;
            attachmentFiles.push(...this.toAttachmentPaths(coveringLetter));

            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.bgSoftCopy));
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.fdrCopy));

            // Resolve "From" as CEO; fall back to Imran, then hardcoded user id
            let fromUserId: number;

            const [ceoUser] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'goyal@volksenergie.in'))
                .limit(1);

            if (ceoUser) {
                fromUserId = ceoUser.id;
            } else {
                this.logger.warn('CEO user not found for BG cancellation request email, falling back to Imran');
                const [imranUser] = await this.db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.email, 'imran@volksenergie.in'))
                    .limit(1);

                fromUserId = imranUser ? imranUser.id : 33;
            }

            await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: request.tenderId || undefined,
                eventType: 'BG_CANCELLATION_REQUEST',
                template: 'bg-cancellation-request',
                subject: `Cancellation for BG No. ${bgNo} and FDR No. ${fdrNo}`,
                fromUserId,
                to: toEmails,
                cc: ccSources,
                data: {
                    bgNo,
                    bgDate,
                    amount,
                    bgFavour,
                    fdrNo,
                    fdrAmt,
                },
                attachments: { files: attachmentFiles },
            });

            this.logger.log(
                `BG cancellation request email sent for instrument ${instrumentId} to ${bankMailIds.join(', ')}`,
            );
        } catch (error) {
            this.logger.error(`Failed to send BG cancellation request email for instrument ${instrumentId}:`, error);
            throw error;
        }
    }

    /**
     * Send BG extension/modification request email to the bank representative when
     * the request-extension step is submitted (client request letter/email uploaded).
     * From: CEO. To: saved bankMailIds. CC: Coordinator, TL, accounts, bankMailIdsCc.
     * Attaches the generated request letter (VE letterhead), the client request
     * letter/email, the BG soft copy and the FDR soft copy.
     */
    async sendBgExtensionRequestEmail(instrumentId: number): Promise<void> {
        try {
            this.logger.log(`Preparing BG extension request email for instrument ${instrumentId}`);

            // Fetch instrument + payment request + BG details
            const [result] = await this.db
                .select({
                    instrument: paymentInstruments,
                    request: paymentRequests,
                    bgDetails: instrumentBgDetails,
                })
                .from(paymentInstruments)
                .innerJoin(paymentRequests, eq(paymentInstruments.requestId, paymentRequests.id))
                .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
                .where(eq(paymentInstruments.id, instrumentId))
                .limit(1);

            if (!result || !result.instrument) {
                this.logger.warn(`BG extension request email skipped: instrument ${instrumentId} not found`);
                return;
            }

            const { instrument, request, bgDetails } = result;

            if (!bgDetails) {
                this.logger.warn(`BG extension request email skipped: no BG details found for instrument ${instrumentId}`);
                return;
            }

            // Resolve bank "To" mail ids (saved at Form 1 time; YES Bank or PNB depending on the BG)
            const bankMailIds = (bgDetails.bankMailIds || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIds.length === 0) {
                this.logger.warn(
                    `BG extension request email skipped: no bank mail ids saved for instrument ${instrumentId}`,
                );
                return;
            }

            const toEmails: RecipientSource[] = [{ type: 'emails', emails: bankMailIds }];

            // Resolve tender team for role-based CC recipients
            const tenderTeamId = await this.getTenderTeamId(request.tenderId || 0, request.requestedBy || 0);

            const ccSources: RecipientSource[] = [
                { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                { type: 'emails', emails: ['accounts@volksenergie.in'] },
            ];

            const bankMailIdsCc = (bgDetails.bankMailIdsCc || []).filter(
                (email): email is string => typeof email === 'string' && email.trim().length > 0,
            );

            if (bankMailIdsCc.length > 0) {
                ccSources.push({ type: 'emails', emails: bankMailIdsCc });
            }

            // Compose shared content fields (raw en-IN numbers; email body lines carry the "Rs." prefix)
            const bgNo = bgDetails.bgNo || '';
            const bgDate = this.formatDateDDMMYYYY(bgDetails.bgDate);
            const amount = (Number(instrument.amount) || 0).toLocaleString('en-IN');
            const bgFavour = bgDetails.beneficiaryName || instrument.favouring || '';
            const bgExpiryDate = this.formatDateDDMMYYYY(bgDetails.bgExpiryDate);
            const bgClaimDate = this.formatDateDDMMYYYY(bgDetails.bgClaim);
            const bankName = bgDetails.bankName || '';

            // Table cells have no "Rs." prefix in the template, so pass full strings ('' when absent)
            const moneyRs = (value: any): string =>
                value === null || value === undefined || value === ''
                    ? ''
                    : `Rs. ${(Number(value) || 0).toLocaleString('en-IN')}`;
            // The letter PDF prefixes "Rs." on list lines only, so table values there stay raw
            const moneyRaw = (value: any): string =>
                value === null || value === undefined || value === '' ? '' : (Number(value) || 0).toLocaleString('en-IN');

            const stampChargeDeducted = moneyRs(bgDetails.stampChargesDeducted);
            const newStampChargeDeducted = moneyRs(bgDetails.newStampChargeDeducted);
            const newBeneficiaryName = bgDetails.extendedBankName || '';
            const newAmount = moneyRs(bgDetails.extendedAmount);
            const newExpiryDate = this.formatDateDDMMYYYY(bgDetails.extendedValidityDate);
            const newClaimDate = this.formatDateDDMMYYYY(bgDetails.extendedClaimExpiryDate);

            // Generate the "Request Letter on VE Letterhead" PDF (template: req-ext-letter)
            let requestLetterPath: string | null = null;
            try {
                const letterPaths = await this.pdfGenerator.generatePdfs(
                    'reqExtLetter',
                    {
                        bank_name: bankName,
                        bg_no: bgNo,
                        bg_date: bgDate,
                        bg_favour: bgFavour,
                        bg_amt: amount,
                        stamp_charge_deducted: moneyRaw(bgDetails.stampChargesDeducted),
                        new_stamp_charge_deducted: moneyRaw(bgDetails.newStampChargeDeducted),
                        new_bg_bank_name: newBeneficiaryName,
                        new_bg_amt: moneyRaw(bgDetails.extendedAmount),
                        bg_expiry: bgExpiryDate,
                        new_bg_expiry: newExpiryDate,
                        bg_claim: bgClaimDate,
                        new_bg_claim: newClaimDate,
                    },
                    instrumentId,
                    'BG',
                );

                if (letterPaths && letterPaths.length > 0) {
                    requestLetterPath = letterPaths[0];
                }
            } catch (error) {
                this.logger.error(
                    `Failed to generate extension request letter PDF for instrument ${instrumentId}:`,
                    error,
                );
            }

            // Attachments: request letter (generated), client request letter/email, BG soft copy, FDR soft copy
            const attachmentFiles: string[] = [];

            if (requestLetterPath) {
                attachmentFiles.push(requestLetterPath);
            }

            if (bgDetails.extensionLetterPath) {
                attachmentFiles.push(...this.toAttachmentPaths(bgDetails.extensionLetterPath));
            }

            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.bgSoftCopy));
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.fdrCopy));

            // Resolve "From" as CEO; fall back to Imran, then hardcoded user id
            let fromUserId: number;

            const [ceoUser] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'goyal@volksenergie.in'))
                .limit(1);

            if (ceoUser) {
                fromUserId = ceoUser.id;
            } else {
                this.logger.warn('CEO user not found for BG extension request email, falling back to Imran');
                const [imranUser] = await this.db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.email, 'imran@volksenergie.in'))
                    .limit(1);

                fromUserId = imranUser ? imranUser.id : 33;
            }

            await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: request.tenderId || undefined,
                eventType: 'BG_EXTENSION_REQUEST',
                template: 'bg-extension-request',
                subject: `Extension/Modification of BG No. ${bgNo}`,
                fromUserId,
                to: toEmails,
                cc: ccSources,
                data: {
                    bgNo,
                    bgDate,
                    amount,
                    bgFavour,
                    bgExpiryDate,
                    bgClaimDate,
                    stampChargeDeducted,
                    newStampChargeDeducted,
                    newBeneficiaryName,
                    newAmount,
                    newExpiryDate,
                    newClaimDate,
                },
                attachments: { files: attachmentFiles },
            });

            this.logger.log(
                `BG extension request email sent for instrument ${instrumentId} to ${bankMailIds.join(', ')}`,
            );
        } catch (error) {
            this.logger.error(`Failed to send BG extension request email for instrument ${instrumentId}:`, error);
            throw error;
        }
    }

    async sendBgSubmittedEmail(instrumentId: number): Promise<void> {
        try {
            this.logger.log(`Preparing BG submitted email for instrument ${instrumentId}`);

            const [result] = await this.db
                .select({
                    instrument: paymentInstruments,
                    request: paymentRequests,
                    bgDetails: instrumentBgDetails,
                })
                .from(paymentInstruments)
                .innerJoin(paymentRequests, eq(paymentInstruments.requestId, paymentRequests.id))
                .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
                .where(eq(paymentInstruments.id, instrumentId))
                .limit(1);

            if (!result || !result.instrument) {
                this.logger.warn(`BG submitted email skipped: instrument ${instrumentId} not found`);
                return;
            }

            const { instrument, request, bgDetails } = result;

            if (!bgDetails) {
                this.logger.warn(`BG submitted email skipped: no BG details found for instrument ${instrumentId}`);
                return;
            }

            if (!request.requestedBy) {
                this.logger.warn(`BG submitted email skipped: requestedBy not found for instrument ${instrumentId}`);
                return;
            }

            const clientEmail = bgDetails.bgClientUser;

            if (!clientEmail) {
                this.logger.warn(
                    `BG submitted email skipped: no client/department mail id (bgClientUser) saved for instrument ${instrumentId}`,
                );
                return;
            }

            const toEmails: RecipientSource[] = [{ type: 'emails', emails: [clientEmail] }];

            const tenderTeamId = await this.getTenderTeamId(request.tenderId || 0, request.requestedBy);

            const [teUser] = await this.db
                .select({ email: users.email })
                .from(users)
                .where(eq(users.id, request.requestedBy))
                .limit(1);

            const ccSources: RecipientSource[] = [
                { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                { type: 'emails', emails: ['goyal@volksenergie.in'] },
                { type: 'emails', emails: ['accounts@volksenergie.in'] },
                { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
            ];

            if (teUser?.email) {
                ccSources.push({ type: 'emails', emails: [teUser.email] });
            }

            const attachmentFiles: string[] = [];
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.bgSoftCopy));
            attachmentFiles.push(...this.toAttachmentPaths(bgDetails.sfmsConf));

            const [imranUser] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, 'imran@volksenergie.in'))
                .limit(1);

            const fromUserId = imranUser ? imranUser.id : 33;

            const purpose = bgDetails.bgPurpose || request.purpose || 'Financial security';

            const tenderDate = ''; // no confirmed schema field for WO/Tender Date

            const mailResult = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: request.tenderId || undefined,
                eventType: 'BG_SUBMITTED',
                template: 'bg-fdr',
                subject: `Bank Guarantee submitted - ${request.tenderNo || 'N/A'} against ${purpose}`,
                fromUserId,
                to: toEmails,
                cc: ccSources,
                data: {
                    tenderNo: request.tenderNo || 'N/A',
                    tenderDate,
                    bgNo: bgDetails.bgNo || '',
                    bgExpiryDate: this.formatDateDDMMYYYY(bgDetails.bgExpiryDate),
                    bgClaimDate: this.formatDateDDMMYYYY(bgDetails.bgClaim),
                    beneficiaryName: instrument.favouring || bgDetails.beneficiaryName || '',
                    amount: (Number(instrument.amount) || 0).toLocaleString('en-IN'),
                    stampPaperValue: (Number(bgDetails.stampCharges) || 0).toLocaleString('en-IN'),
                },
                attachments: { files: attachmentFiles },
            });

            if (mailResult.success) {
                this.logger.log(`BG submitted email sent for instrument ${instrumentId} to ${clientEmail} (logId: ${mailResult.emailLogId})`);
            } else {
                this.logger.warn(
                    `BG submitted email failed for instrument ${instrumentId} to ${clientEmail}: ${mailResult.error}`,
                );
            }
        } catch (error) {
            this.logger.error(`Failed to send BG submitted email for instrument ${instrumentId}:`, error);
            throw error;
        }
    }

    /**
     * Send BG follow-up release email when initiate-followup action is taken
     */
    async sendBgFollowupReleaseEmail(instrumentId: number, clientEmails: string[], clientName: string): Promise<void> {
        this.logger.log(`Sending BG follow-up release email for instrument ${instrumentId}`);

        // Fetch instrument + payment request + BG details
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            this.logger.warn(`Instrument ${instrumentId} not found for BG follow-up release email`);
            return;
        }

        const [paymentReq] = await this.db
            .select({
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, instrument.requestId))
            .limit(1);

        if (!paymentReq?.requestedBy) {
            this.logger.warn(`RequestedBy not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get TE name and email
        const [teUser] = await this.db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, paymentReq.requestedBy))
            .limit(1);

        if (!teUser?.email) {
            this.logger.warn(`TE email not found for BG instrument ${instrumentId}`);
            return;
        }

        // Get tender team ID
        let tenderTeamId = 1;
        if (paymentReq.tenderId > 0) {
            const tenderData = await this.db
                .select({ team: tenderInfos.team })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, paymentReq.tenderId))
                .limit(1);
            tenderTeamId = tenderData[0]?.team || 1;
        }

        // Status mapping from BG_STATUSES
        const statusMap: Record<string, string> = {
            [BG_STATUSES.PENDING]: 'Pending',
            [BG_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [BG_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [BG_STATUSES.BG_CREATED]: 'Created',
            [BG_STATUSES.FDR_DETAILS_CAPTURED]: 'FDR Details Captured',
            [BG_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [BG_STATUSES.EXTENSION_REQUESTED]: 'Extension Requested',
            [BG_STATUSES.RETURN_VIA_COURIER]: 'Courier Returned',
            [BG_STATUSES.CANCELLATION_REQUESTED]: 'Cancellation Request',
            [BG_STATUSES.BG_CANCELLATION_CONFIRMED]: 'Cancelled at Branch',
            [BG_STATUSES.FDR_CANCELLED_CONFIRMED]: 'FDR Cancellation Confirmed',
        };
        const statusLabel = statusMap[instrument.status] || instrument.status || '';

        // Tender no / name from tender infos
        const [tender] = await this.db
            .select({ tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, paymentReq.tenderId))
            .limit(1);

        // BG details
        const [bgDetails] = await this.db
            .select()
            .from(instrumentBgDetails)
            .where(eq(instrumentBgDetails.instrumentId, instrumentId))
            .limit(1);

        // Compose email data
        const data = {
            clientName,
            tenderNo: tender?.tenderNo || '',
            tenderName: tender?.tenderName || '',
            status: statusLabel,
            amount: (Number(instrument.amount) || 0).toLocaleString('en-IN'),
            bgNo: bgDetails?.bgNo || '',
            bgValidity: bgDetails?.bgExpiryDate ? this.formatDateDDMMYYYY(bgDetails.bgExpiryDate) : '',
            bgClaimPeriod: bgDetails?.bgClaim ? this.formatDateDDMMYYYY(bgDetails.bgClaim) : '',
            bgFavor: bgDetails?.beneficiaryName || instrument.favouring || '',
        };

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: paymentReq.tenderId || undefined,
                eventType: 'BG_FOLLOWUP_RELEASE',
                fromUserId: (await this.db.select({ id: users.id }).from(users).where(eq(users.email, 'imran@volksenergie.in')) as any)[0]?.id ?? 33,
                subject: `Bank Guarantee No. - ${bgDetails?.bgNo || ''} - ${statusLabel} - ${tender?.tenderNo || ''} against ${bgDetails?.bgPurpose || paymentReq.purpose || ''}`,
                template: 'bg-followup-release',
                data,
                to: [{ type: 'emails', emails: clientEmails }],
                cc: [
                    { type: 'role', role: 'Coordinator', teamId: tenderTeamId },
                    { type: 'emails', emails: ['goyal@volksenergie.in'] },
                    { type: 'emails', emails: ['accounts@volksenergie.in'] },
                    { type: 'role', role: 'Team Leader', teamId: tenderTeamId },
                    { type: 'emails', emails: [teUser.email] },
                ],
            });

            if (result.success) {
                this.logger.log(`BG follow-up release email sent successfully for instrument ${instrumentId} (logId: ${result.emailLogId})`);
            } else {
                this.logger.warn(`BG follow-up release email failed for instrument ${instrumentId}: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send BG follow-up release email for instrument ${instrumentId}:`, error);
        }
    }
}

