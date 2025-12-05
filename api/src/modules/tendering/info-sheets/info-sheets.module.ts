import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderInfoSheetsController } from '@/modules/tendering/info-sheets/info-sheets.controller';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [TenderInfoSheetsController],
    providers: [TenderInfoSheetsService],
})
export class TenderInfoSheetsModule { }
