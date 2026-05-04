import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import { PaymentRequestsService } from '../payment-requests.service';

@Injectable()
export class PaymentRequestsNotificationService {
    private readonly logger = new Logger(PaymentRequestsNotificationService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly pdfGenerator: PdfGeneratorService,
        @Inject(forwardRef(() => PaymentRequestsService))
        private readonly paymentRequestsService: PaymentRequestsService,
    ) {}

    /**
     * Send DD mail after cheque action - delegates to main service
     * This is the only notification method currently exposed as public in PaymentRequestsService
     */
    async sendDdMailAfterChequeAction(
        ddInstrumentId: number,
        requestId: number,
        tenderId: number,
        userId: number
    ) {
        return this.paymentRequestsService.sendDdMailAfterChequeAction(
            ddInstrumentId,
            requestId,
            tenderId,
            userId
        );
    }
}