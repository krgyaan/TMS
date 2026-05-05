import { Module } from '@nestjs/common';
import { PaymentRequestsController } from './payment-requests.controller';
import { PaymentRequestsQueryService } from './services/payment-requests.query.service';
import { PaymentRequestsCommandService } from './services/payment-requests.command.service';
import { PaymentRequestsNotificationService } from './services/payment-requests-notification.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { PdfGeneratorModule } from '@/modules/pdf/pdf-generator.module';

@Module({
    imports: [TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule, PdfGeneratorModule],
    controllers: [PaymentRequestsController],
    providers: [
        PaymentRequestsQueryService,
        PaymentRequestsCommandService,
        PaymentRequestsNotificationService,
    ],
    exports: [
        PaymentRequestsQueryService,
        PaymentRequestsCommandService,
        PaymentRequestsNotificationService,
    ],
})
export class PaymentRequestsModule { }

// Re-export for convenient importing
export { PaymentRequestsNotificationService } from './services/payment-requests-notification.service';