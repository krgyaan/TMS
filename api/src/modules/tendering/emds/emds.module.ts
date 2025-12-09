import { Module } from '@nestjs/common';
import { EmdsController } from '@/modules/tendering/emds/emds.controller';
import { EmdsService } from '@/modules/tendering/emds/emds.service';
import { InstrumentStatusService } from '@/modules/tendering/emds/services/instrument-status.service';
import { InstrumentStatusHistoryService } from '@/modules/tendering/emds/services/instrument-status-history.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';

@Module({
    imports: [TendersModule],
    controllers: [EmdsController],
    providers: [
        EmdsService,
        InstrumentStatusService,
        InstrumentStatusHistoryService,
    ],
    exports: [EmdsService, InstrumentStatusService],
})
export class EmdsModule { }
