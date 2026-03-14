import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FinanceDocumentsController } from './finance-documents.controller';
import { FinanceDocumentsService } from './finance-documents.service';

@Module({
    imports: [DatabaseModule],
    controllers: [FinanceDocumentsController],
    providers: [FinanceDocumentsService],
    exports: [FinanceDocumentsService],
})
export class FinanceDocumentsModule { }
