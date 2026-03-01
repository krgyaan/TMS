import { Module } from '@nestjs/common';
import { EmdsController } from '@/modules/tendering/emds/emds.controller';
import { EmdsService } from '@/modules/tendering/emds/emds.service';
import { InstrumentStatusService } from '@/modules/tendering/emds/services/instrument-status.service';
import { InstrumentStatusHistoryService } from '@/modules/tendering/emds/services/instrument-status-history.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { PdfGeneratorModule } from '@/modules/pdf/pdf-generator.module';

@Module({
    imports: [TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule, PdfGeneratorModule],
    controllers: [EmdsController],
    providers: [
        EmdsService,
        InstrumentStatusService,
        InstrumentStatusHistoryService,
    ],
    exports: [EmdsService, InstrumentStatusService],
})
export class EmdsModule { }
