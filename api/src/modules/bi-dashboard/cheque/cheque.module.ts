import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ChequeController } from './cheque.controller';
import { ChequeService } from './cheque.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsModule } from '@/modules/tendering/payment-requests/payment-requests.module';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { GmailClient } from '@/modules/email/gmail.client';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { EmailModule } from '@/modules/email/email.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule],
    controllers: [ChequeController],
    providers: [ChequeService, TenderInfosService, TenderStatusHistoryService, EmailService, RecipientResolver, GmailClient, FileUploadService],
    exports: [ChequeService],
})
export class ChequeModule {}
