import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsNotificationService } from '@/modules/tendering/payment-requests/services/payment-requests-notification.service';
import { BankTransferController } from './bank-transfer.controller';
import { BankTransferService } from './bank-transfer.service';
import { EmailService } from '@/modules/email/email.service';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { GmailClient } from '@/modules/email/gmail.client';
import { TenderFilesService } from '@/modules/tendering/tender-files/tender-files.service';
import { EmailModule } from '@/modules/email/email.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, EmailModule],
    controllers: [BankTransferController],
    providers: [BankTransferService, PaymentRequestsNotificationService, EmailService, PdfGeneratorService, RecipientResolver, GmailClient, TenderFilesService],
    exports: [BankTransferService],
})
export class BankTransferModule { }
