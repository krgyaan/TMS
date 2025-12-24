import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderInfoSheetsController } from '@/modules/tendering/info-sheets/info-sheets.controller';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';


@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule],
    controllers: [TenderInfoSheetsController],
    providers: [TenderInfoSheetsService],
})
export class TenderInfoSheetsModule { }
