import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { TendersModule } from '../tenders/tenders.module';
import { TenderInfoSheetsController } from './info-sheets.controller';
import { TenderInfoSheetsService } from './info-sheets.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [TenderInfoSheetsController],
    providers: [TenderInfoSheetsService],
})
export class TenderInfoSheetsModule { }
