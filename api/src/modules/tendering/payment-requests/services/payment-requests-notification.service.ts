import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, sql, and } from 'drizzle-orm';
import { paymentInstruments, paymentRequests, tenderInfos } from '@db/schemas/tendering/payment-requests.schema';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
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
        // Find related instruments
        const [ddInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, ddInstrumentId))
            .limit(1);

        if (!ddInstrument) {
            this.logger.warn(`DD instrument ${ddInstrumentId} not found`);
            return { success: false, message: 'DD instrument not found' };
        }

        // Get tender details
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
            await this.generatePdfsForInstrument(ddInstrumentId);
        } catch (error) {
            this.logger.error(`Failed to generate PDF for DD ${ddInstrumentId}`, error);
        }

        // Send email to accounts team
        const teamId = tender.team;
        const recipients = await this.getCcRecipientsByTeam(teamId);
        
        if (recipients.length > 0) {
            try {
                await this.emailService.sendEmail({
                    to: recipients,
                    subject: `DD Request - ${tender.tenderNo} - ${tender.tenderName}`,
                    body: `
                        <h2>DD Request Generated</h2>
                        <p><strong>Tender No:</strong> ${tender.tenderNo}</p>
                        <p><strong>Tender Name:</strong> ${tender.tenderName}</p>
                        <p><strong>DD Amount:</strong> ${ddInstrument.amount}</p>
                        <p><strong>Favouring:</strong> ${ddInstrument.favouring}</p>
                        <p>Please process the DD request.</p>
                    `,
                    priority: 'normal',
                });
            } catch (error) {
                this.logger.error(`Failed to send DD email for tender ${tenderId}`, error);
                return { success: false, message: 'Email failed' };
            }
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

        try {
            await this.pdfGenerator.generatePaymentInstrumentPdf(instrument);
        } catch (error) {
            this.logger.error(`Failed to generate PDF for instrument ${instrumentId}`, error);
            throw error;
        }

        return { success: true, instrumentId };
    }

    /**
     * Get accounts team ID
     */
    private async getAccountsTeamId(): Promise<number | null> {
        // Query to get accounts team ID from system config or hardcoded value
        // This is a placeholder - implement based on your system
        return 1; // Default accounts team
    }

    /**
     * Get user details for email
     */
    private async getUserDetailsForEmail(userId: number): Promise<RecipientSource[]> {
        const recipients = await this.recipientResolver.resolveRecipients({
            type: 'user',
            userId,
        });
        return recipients;
    }

    /**
     * Get CC recipients by team
     */
    private async getCcRecipientsByTeam(teamId: number | null): Promise<RecipientSource[]> {
        if (!teamId) return [];
        
        const recipients = await this.recipientResolver.resolveRecipients({
            type: 'team',
            teamId,
            roles: ['accounts'],
        });
        
        return recipients;
    }
}