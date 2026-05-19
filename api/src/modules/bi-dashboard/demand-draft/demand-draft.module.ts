import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { EmailModule } from '@/modules/email/email.module';
import { EmailService } from '@/modules/email/email.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { GmailClient } from '@/modules/email/gmail.client';
import { TenderFilesService } from '@/modules/tendering/tender-files/tender-files.service';
import { PaymentRequestsModule } from '@/modules/tendering/payment-requests/payment-requests.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsModule, EmailModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService, TenderInfosService, TenderStatusHistoryService, EmailService, RecipientResolver, GmailClient, TenderFilesService],
    exports: [DemandDraftService],
})
export class DemandDraftModule { }
