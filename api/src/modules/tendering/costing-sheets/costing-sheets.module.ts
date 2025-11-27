import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { CostingSheetsController } from './costing-sheets.controller';
import { CostingSheetsService } from './costing-sheets.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CostingSheetsController],
    providers: [CostingSheetsService],
    exports: [CostingSheetsService],
})
export class CostingSheetsModule { }
