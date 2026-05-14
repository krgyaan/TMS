import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { and, eq } from 'drizzle-orm';
import { paymentInstruments, instrumentTransferDetails, instrumentChequeDetails, paymentRequests } from '@db/schemas/tendering/payment-requests.schema';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import { tenderInfos, userRoles, users } from '@/db/schemas';

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
     * Send DD mail after cheque action
     * Triggered when a cheque is approved/issued to send DD request email
     */
    async sendDdMailAfterChequeAction(
        ddInstrumentId: number,
        requestId: number,
        tenderId: number,
        userId: number
    ) {
        const [ddInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, ddInstrumentId))
            .limit(1);

        if (!ddInstrument) {
            this.logger.warn(`DD instrument ${ddInstrumentId} not found`);
            return { success: false, message: 'DD instrument not found' };
        }

        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender) {
            this.logger.warn(`Tender ${tenderId} not found`);
            return { success: false, message: 'Tender not found' };
        }

        // Generate PDF for DD
        try {
            const pdfPaths = await this.pdfGenerator.generatePdfs(
                'dd-request',
                {
                    tenderNo: tender.tenderNo,
                    tenderName: tender.tenderName,
                    amount: ddInstrument.amount,
                    favouring: ddInstrument.favouring,
                    payableAt: ddInstrument.payableAt,
                },
                ddInstrumentId,
                'DD'
            );
            this.logger.log(`Generated PDFs for DD: ${pdfPaths.join(', ')}`);
        } catch (error) {
            this.logger.error(`Failed to generate PDF for DD ${ddInstrumentId}`, error);
        }

        // Send email to accounts team using sendTenderEmail
        const teamId = tender.team;
        try {
            await this.emailService.sendTenderEmail({
                tenderId: tenderId,
                eventType: 'DD_REQUEST',
                fromUserId: userId,
                to: [{ type: 'role', role: 'accounts', teamId }],
                subject: `DD Request - ${tender.tenderNo} - ${tender.tenderName}`,
                template: 'dd-request',
                data: {
                    tenderNo: tender.tenderNo,
                    tenderName: tender.tenderName,
                    amount: ddInstrument.amount,
                    favouring: ddInstrument.favouring,
                    payableAt: ddInstrument.payableAt,
                },
            });
            this.logger.log(`DD email sent successfully for tender ${tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to send DD email for tender ${tenderId}`, error);
            return { success: false, message: 'Email failed' };
        }

        return { success: true, message: 'DD mail triggered successfully' };
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
     * Get responsible user by mode
     */
    private getResponsibleUserByMode(mode: string) {
        switch (mode) {
            case 'BANK_TRANSFER':
                return 'gyan@volksenergie.in';
            case 'PORTAL':
                return 'gyan@volksenergie.in';
            default:
                return 'gyan@volksenergie.in';
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

        // Format date with time
        const formatDateTime = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } catch {
                return dateStr;
            }
        };

        // Format date only
        const formatDate = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
            } catch {
                return dateStr;
            }
        };

        // Format currency
        const formatCurrency = (amount: number) => {
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        // Format date as DD-MM-YYYY
        const formatDateDDMMYYYY = (dateStr: string | null | undefined): string => {
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

        const mode = instrumentType.toUpperCase();

        const toEmails = this.getResponsibleUserByMode(mode);

        if (mode === 'BANK TRANSFER') {
            const [btDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                .limit(1);            

            try {
                const result = await this.emailService.sendPaymentEmail({
                    requestId: instrument.requestId,
                    tenderId: tenderId || undefined,
                    eventType: 'BANK_TRANSFER_REQUEST',
                    // fromUserId: requestedBy,
                    fromUserId: 13,
                    subject: `Bank Transfer - ${purpose}`,
                    template: 'bank-transfer-request',
                    data: {
                        paymentInstrumentType: instrumentType,
                        tenderNo: tender?.tenderNo || 'NA',
                        tenderName: tender?.tenderName || 'Not specified',
                        dueDateTime: formatDateTime(tender?.dueDate),
                        btAccName: btDetails?.accountName || 'Not specified',
                        btAcc: btDetails?.accountNumber || 'Not specified',
                        btIfsc: btDetails?.ifsc || 'Not specified',
                        amount: formatCurrency(Number(instrument.amount) || 0),
                        isOthersPurpose: !(tenderId > 0),
                        link: `#/tendering/emds/${instrument.requestId}`,
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
                const result = await this.emailService.sendPaymentEmail({
                    requestId: instrument.requestId,
                    tenderId: tenderId || undefined,
                    eventType: 'PORTAL_PAYMENT_REQUEST',
                    // fromUserId: requestedBy,
                    fromUserId: 13,
                    subject: `Pay on Portal - ${purpose}`,
                    template: 'pay-on-portal-request',
                    data: {
                        portal: portalDetails?.portalName || 'Payment Portal',
                        purpose: purpose,
                        netbanking: portalDetails?.isNetbanking || 'Not specified',
                        debit: portalDetails?.isDebit || 'Not specified',
                        amount: formatCurrency(Number(instrument.amount) || 0),
                        isOthersPurpose: !(tenderId > 0),
                        tender_no: tender?.tenderNo || 'NA',
                        tender_name: tender?.tenderName || 'Not specified',
                        dueDate: formatDateTime(tender?.dueDate),
                        link: `#/tendering/emds/${instrument.requestId}`,
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
            let finalChequeDate = formatDateDDMMYYYY(instrument.issueDate) || formatDateDDMMYYYY(new Date().toISOString());
            let receivingPdfUrl = '';

            if (chequeDetails?.linkedDdId || chequeDetails?.linkedFdrId) {
                const linkedType = chequeDetails?.linkedDdId ? 'DD' : 'FDR';
                finalPurpose = linkedType;
                finalPartyName = `Yourself for ${linkedType}`;
                finalChequeDate = formatDateDDMMYYYY(new Date().toISOString());

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
                        amount: formatCurrency(Number(instrument.amount) || 0),
                        chequeNeeds: instrument.courierDeadline || 24,
                        link: `#/tendering/emds/${instrument.requestId}`,
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

        // Format date with time
        const formatDateTime = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } catch {
                return dateStr;
            }
        };

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'BT_ACTION',
                fromUserId: 13,
                subject: `Payment via Bank Transfer ${purpose}`,
                template: 'bt-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrument: 'Bank Transfer',
                    tenderNo,
                    tenderName,
                    status,
                    paymentDateTime: formatDateTime(paymentDateTime) || '',
                    utr: utrNo || '',
                    utrMessage: utrMessage || '',
                    rejectionReason: rejectionReason || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
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

        // Format date with time
        const formatDateTime = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } catch {
                return dateStr;
            }
        };

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'POP_ACTION',
                fromUserId: 13,
                subject: `Payment on Portal - ${purpose}`,
                template: 'pop-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    status,
                    paymentDateTime: formatDateTime(paymentDateTime) || '',
                    utr: utrNo || '',
                    utrMessage: utrMessage || '',
                    rejectionReason: rejectionReason || '',
                    senderName: 'Accounts Team',
                    paymentProofUrl,
                },
                to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
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

        // Format date only
        const formatDate = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
            } catch {
                return dateStr;
            }
        };

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'BT_RETURN',
                fromUserId: 13,
                subject: `Bank Transfer - Payment Returned`,
                template: 'returned-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrumentType: 'Bank Transfer',
                    tenderName: instrument.projectName || 'NA',
                    tenderNo: instrument.tenderNo || 'NA',
                    returnTransferDate: formatDate(returnTransferDate) || '',
                    returnUtr: returnUtr || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
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

        // Format date only
        const formatDate = (dateStr: string | null | undefined): string => {
            if (!dateStr) return '';
            try {
                return new Date(dateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
            } catch {
                return dateStr;
            }
        };

        try {
            const result = await this.emailService.sendPaymentEmail({
                requestId: instrument.requestId,
                tenderId: instrument.tenderId || undefined,
                eventType: 'POP_RETURN',
                fromUserId: 13,
                subject: `Pay on Portal - Payment Returned`,
                template: 'returned-action',
                data: {
                    tenderExecutive: requestedUser.name,
                    paymentInstrumentType: 'Pay on Portal',
                    portalName: transferDetails?.portalName || 'NA',
                    tenderName: instrument.projectName || 'NA',
                    tenderNo: instrument.tenderNo || 'NA',
                    returnTransferDate: formatDate(returnTransferDate) || '',
                    returnUtr: returnUtr || '',
                    senderName: 'Accounts Team',
                },
                to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
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