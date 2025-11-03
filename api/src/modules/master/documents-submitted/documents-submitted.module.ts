import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { DocumentsSubmittedController } from './documents-submitted.controller';
import { DocumentsSubmittedService } from './documents-submitted.service';

@Module({
    imports: [DatabaseModule],
    controllers: [DocumentsSubmittedController],
    providers: [DocumentsSubmittedService],
    exports: [DocumentsSubmittedService],
})
export class DocumentsSubmittedModule { }
