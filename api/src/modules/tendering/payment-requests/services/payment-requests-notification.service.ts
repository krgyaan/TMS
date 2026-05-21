import { couriers, tenderInfos, userRoles, users, emdResponsibility } from '@/db/schemas';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { instrumentChequeDetails, instrumentTransferDetails, paymentInstruments, paymentRequests } from '@db/schemas/tendering/payment-requests.schema';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class PaymentRequestsNotificationService {
    private readonly logger = new Logger(PaymentRequestsNotificationService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly configService: ConfigService,
    ) {}

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
            return 'gyan@volksenergie.in';
        }
        const [result] = await this.db
            .select({ email: users.email })
            .from(emdResponsibility)
            .leftJoin(users, eq(users.id, emdResponsibility.assignedUserId))
            .where(eq(emdResponsibility.instrumentType, dbType))
            .limit(1);
        return result?.email || 'gyan@volksenergie.in';
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
        const baseUrl = apiUrl.replace('/api/v1', '');

        const softCopyChequeUrl = chequeDetails.chequeImagePath
            ? `${baseUrl}/uploads/tendering/${chequeDetails.chequeImagePath}`
            : '';

        const receivingChequeUrl = chequeDetails.handover
            ? `${baseUrl}/uploads/tendering/${chequeDetails.handover}`
            : '';

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
        const baseUrl = apiUrl.replace('/api/v1', '');

        const softCopyChequeUrl = chequeDetails.chequeImagePath
            ? `${baseUrl}/uploads/tendering/${chequeDetails.chequeImagePath}`
            : '';

        const receivingChequeUrl = chequeDetails.handover
            ? `${baseUrl}/uploads/tendering/${chequeDetails.handover}`
            : '';

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
            ? `${baseUrl}/uploads/tendering/${chequeDetails.chequeImagePath}`
            : '';

        const receivingPdfUrl = instrument.generatedPdf
            ? `${baseUrl}/uploads/tendering/${instrument.generatedPdf}`
            : '';

        const deliveryMethod = chequeDetails?.deliveryMethod || '';

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
            .leftJoin(userRoles, eq(users.id, userRoles.userId))
            .where(
                and(
                    eq(users.team, tenderTeamId),
                    eq(userRoles.roleId, 3)
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
                    // cc: [
                    //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                    //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                    // ]
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

            console.log("Portal: ", portalDetails);
                
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
                    // cc: [
                    //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                    //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                    // ]
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

            if (chequeDetails?.linkedDdId || chequeDetails?.linkedFdrId) {
                const linkedType = chequeDetails?.linkedDdId ? 'DD' : 'FDR';
                finalPurpose = linkedType;
                finalPartyName = `Yourself for ${linkedType}`;
                finalChequeDate = this.formatDateDDMMYYYY(new Date().toISOString());

                try {
                    const pdfPaths = await this.pdfGenerator.generatePdfs(
                        'chqCret',
                        {
                            cheque_date: finalChequeDate,
                            cheque_amt: instrument.amount,
                            cheque_favour: instrument.favouring || 'Not specified',
                        },
                        instrumentId,
                        linkedType
                    );

                    if (pdfPaths.length > 0) {
                        await this.db
                            .update(paymentInstruments)
                            .set({ generatedPdf: pdfPaths[0] })
                            .where(eq(paymentInstruments.id, instrumentId));

                        const apiUrl = this.configService.get<string>('app.apiUrl') || '';
                        const baseUrl = apiUrl.replace('/api/v1', '');
                        receivingPdfUrl = `${baseUrl}/uploads/tendering/${pdfPaths[0]}`;
                    }
                } catch (error) {
                    this.logger.error(`Failed to generate receiving PDF for cheque ${instrumentId}:`, error);
                }
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
                    to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
                    // cc: [
                    //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                    //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                    // ],
                });
                if (result.success) {
                    this.logger.log(`Cheque email sent for instrument ${instrumentId} (logId: ${result.emailLogId})`);
                } else {
                    this.logger.warn(`Cheque email failed for instrument ${instrumentId}: ${result.error}`);
                }
            } catch (error) {
                this.logger.error(`Failed to send cheque email for instrument ${instrumentId}:`, error);
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
                // cc: [
                //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                // ],
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
        const paymentProofUrl = paymentProofPath ? `${apiUrl}/tender-files/serve/${paymentProofPath}` : '';

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
                // cc: [
                //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                // ],
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
                // cc: [
                //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                // ],
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
                // cc: [
                //     { type: 'role', role: 'admin', teamId: tenderTeamId },
                //     { type: 'emails', emails: ['accounts@volksenergie.in']}
                // ],
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
}