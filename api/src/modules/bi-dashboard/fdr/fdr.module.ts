import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FdrController } from './fdr.controller';
import { FdrService } from './fdr.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { EmailModule } from '@/modules/email/email.module';
import { EmailService } from '@/modules/email/email.service';
import { PaymentRequestsModule } from '@/modules/tendering/payment-requests/payment-requests.module';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { GmailClient } from '@/modules/email/gmail.client';
import { TenderFilesService } from '@/modules/tendering/tender-files/tender-files.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule],
    controllers: [FdrController],
    providers: [FdrService, EmailService, TenderInfosService, TenderStatusHistoryService, EmailService, RecipientResolver, GmailClient, TenderFilesService],
    exports: [FdrService],
})
export class FdrModule { }
