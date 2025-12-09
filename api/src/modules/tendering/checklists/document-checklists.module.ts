import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DocumentChecklistsController } from '@/modules/tendering/checklists/document-checklists.controller';
import { DocumentChecklistsService } from '@/modules/tendering/checklists/document-checklists.service';

@Module({
    imports: [DatabaseModule],
    controllers: [DocumentChecklistsController],
    providers: [DocumentChecklistsService],
    exports: [DocumentChecklistsService],
})
export class DocumentChecklistsModule { }
