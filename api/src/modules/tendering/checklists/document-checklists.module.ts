import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BiddingRequirementsService } from '@/modules/tendering/checklists/bidding-requirements.service';
import { DocumentChecklistsController } from '@/modules/tendering/checklists/document-checklists.controller';
import { DocumentChecklistsService } from '@/modules/tendering/checklists/document-checklists.service';
import { TenderAnnexuresService } from '@/modules/tendering/checklists/tender-annexures.service';
import { EmailModule } from '@/modules/email/email.module';
import { FileUploadModule } from '@/modules/file-upload/file-upload.module';
import { FinanceDocumentsModule } from '@/modules/shared/finance-documents/finance-documents.module';
import { TenderInfoSheetsModule } from '@/modules/tendering/info-sheets/info-sheets.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { ClaudeUsageModule } from '@/modules/master/claude-usage/claude-usage.module';

@Module({
    imports: [
        DatabaseModule,
        EmailModule,
        TendersModule,
        TimersModule,
        TenderInfoSheetsModule,
        FileUploadModule,
        FinanceDocumentsModule,
        ClaudeUsageModule,
    ],
    controllers: [DocumentChecklistsController],
    providers: [DocumentChecklistsService, BiddingRequirementsService, TenderAnnexuresService],
    exports: [DocumentChecklistsService],
})
export class DocumentChecklistsModule { }
