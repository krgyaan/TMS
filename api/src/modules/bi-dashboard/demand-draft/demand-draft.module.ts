import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { EmailModule } from '@/modules/email/email.module';
import { EmailService } from '@/modules/email/email.service';

@Module({
    imports: [DatabaseModule, FollowUpModule, EmailModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService, EmailService],
    exports: [DemandDraftService],
})
export class DemandDraftModule { }
