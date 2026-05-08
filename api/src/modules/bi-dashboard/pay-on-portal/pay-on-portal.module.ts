import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PayOnPortalController } from './pay-on-portal.controller';
import { PayOnPortalService } from './pay-on-portal.service';
import { PaymentRequestsNotificationService } from '@/modules/tendering/payment-requests/payment-requests.module';
import { EmailService } from '@/modules/email/email.service';
import { EmailModule } from '@/modules/email/email.module';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { GmailClient } from '@/modules/email/gmail.client';
import { TenderFilesService } from '@/modules/tendering/tender-files/tender-files.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, EmailModule],
    controllers: [PayOnPortalController],
    providers: [PayOnPortalService, PaymentRequestsNotificationService, EmailService, PdfGeneratorService, RecipientResolver, GmailClient, TenderFilesService],
    exports: [PayOnPortalService],
})
export class PayOnPortalModule { }
