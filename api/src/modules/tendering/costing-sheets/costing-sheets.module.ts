import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CostingSheetsController } from '@/modules/tendering/costing-sheets/costing-sheets.controller';
import { CostingSheetsService } from '@/modules/tendering/costing-sheets/costing-sheets.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CostingSheetsController],
    providers: [CostingSheetsService],
    exports: [CostingSheetsService],
})
export class CostingSheetsModule { }
