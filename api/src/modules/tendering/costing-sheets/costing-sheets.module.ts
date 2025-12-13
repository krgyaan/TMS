import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CostingSheetsController } from '@/modules/tendering/costing-sheets/costing-sheets.controller';
import { CostingSheetsService } from '@/modules/tendering/costing-sheets/costing-sheets.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule],
    controllers: [CostingSheetsController],
    providers: [CostingSheetsService],
    exports: [CostingSheetsService],
})
export class CostingSheetsModule { }
