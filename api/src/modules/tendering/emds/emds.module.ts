import { Module } from '@nestjs/common';
import { EmdsController } from './emds.controller';
import { EmdsService } from './emds.service';
import { InstrumentStatusService } from './services/instrument-status.service';
import { InstrumentStatusHistoryService } from './services/instrument-status-history.service';
import { TendersModule } from '../tenders/tenders.module';

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
