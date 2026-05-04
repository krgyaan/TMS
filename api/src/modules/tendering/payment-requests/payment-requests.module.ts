import { Module } from '@nestjs/common';
import { PaymentRequestsController } from './payment-requests.controller';
import { PaymentRequestsService } from './payment-requests.service';
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
        InstrumentStatusService,
        InstrumentStatusHistoryService,
    ],
    exports: [PaymentRequestsService, InstrumentStatusService],
})
export class PaymentRequestsModule { }