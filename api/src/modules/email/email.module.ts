import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { GmailClient } from './gmail.client';
import { RecipientResolver } from './recipient.resolver';
import { EmailRetryCron } from './cron/email-retry.cron';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
    ],
    providers: [
        EmailService,
        GmailClient,
        RecipientResolver,
        EmailRetryCron,
    ],
    exports: [EmailService, RecipientResolver],
})
export class EmailModule { }
