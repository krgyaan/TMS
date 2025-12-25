import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DocumentChecklistsController } from '@/modules/tendering/checklists/document-checklists.controller';
import { DocumentChecklistsService } from '@/modules/tendering/checklists/document-checklists.service';
import { EmailModule } from '@/modules/email/email.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';

@Module({
    imports: [DatabaseModule, EmailModule, TendersModule],
    controllers: [DocumentChecklistsController],
    providers: [DocumentChecklistsService],
    exports: [DocumentChecklistsService],
})
export class DocumentChecklistsModule { }
