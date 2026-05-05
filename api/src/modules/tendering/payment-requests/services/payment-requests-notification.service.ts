import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq } from 'drizzle-orm';
import { paymentInstruments } from '@db/schemas/tendering/payment-requests.schema';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import { tenderInfos } from '@/db/schemas';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';

@Injectable()
export class PaymentRequestsNotificationService {
    private readonly logger = new Logger(PaymentRequestsNotificationService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly pdfGenerator: PdfGeneratorService,
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
     * Get accounts team ID
     */
    private async getAccountsTeamId(): Promise<number | null> {
        return 1;
    }

    /**
     * Get user emails for notification
     */
    private async getUserEmailsForNotification(userId: number): Promise<string[]> {
        return this.recipientResolver.getEmailByUserId(userId);
    }

    /**
     * Get accounts team emails by team
     */
    private async getAccountsTeamEmails(teamId: number): Promise<string[]> {
        return this.recipientResolver.getEmailsByRole('accounts', teamId);
    }

    /**
     * Get recipients by role for a team
     */
    private getRecipientsByRole(teamId: number, role: string): RecipientSource[] {
        return [{ type: 'role', role, teamId }];
    }
}