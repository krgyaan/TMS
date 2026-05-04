import { Module } from '@nestjs/common';
import { PaymentRequestsController } from './payment-requests.controller';
import { PaymentRequestsService } from './payment-requests.service';
import { PaymentRequestsQueryService } from './services/payment-requests.query.service';
import { PaymentRequestsCommandService } from './services/payment-requests.command.service';
import { PaymentRequestsStatusService } from './services/payment-requests-status.service';
import { PaymentRequestsNotificationService } from './services/payment-requests-notification.service';
import { InstrumentStatusService } from './services/instrument-status.service';
import { InstrumentStatusHistoryService } from './services/instrument-status-history.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { PdfGeneratorModule } from '@/modules/pdf/pdf-generator.module';

@Module({
    imports: [TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule, PdfGeneratorModule],
    controllers: [PaymentRequestsController],
    providers: [
        PaymentRequestsService,
        PaymentRequestsQueryService,
        PaymentRequestsCommandService,
        PaymentRequestsStatusService,
        PaymentRequestsNotificationService,
        InstrumentStatusService,
        InstrumentStatusHistoryService,
    ],
    exports: [
        PaymentRequestsService,
        PaymentRequestsQueryService,
        PaymentRequestsCommandService,
        PaymentRequestsStatusService,
        PaymentRequestsNotificationService,
        InstrumentStatusService,
    ],
})
export class PaymentRequestsModule { }