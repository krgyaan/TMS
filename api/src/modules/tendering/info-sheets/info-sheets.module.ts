import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderInfoSheetsController } from '@/modules/tendering/info-sheets/info-sheets.controller';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { ClientDirectoryModule } from '@/modules/shared/client-directory/client-directory.module';
import { FileUploadModule } from '@/modules/file-upload/file-upload.module';
import { PdfExtractionProducer } from './pdf-extraction.producer';
import { PdfExtractionProcessor } from './pdf-extraction.processor';

@Module({
    imports: [
        DatabaseModule,
        TendersModule,
        TenderStatusHistoryModule,
        EmailModule,
        TimersModule,
        ClientDirectoryModule,
        FileUploadModule,
    ],
    controllers: [TenderInfoSheetsController],
    providers: [TenderInfoSheetsService, PdfExtractionProducer, PdfExtractionProcessor],
    exports: [TenderInfoSheetsService, PdfExtractionProducer, PdfExtractionProcessor],
})
export class TenderInfoSheetsModule { }

