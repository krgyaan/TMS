import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { EmailModule } from '@/modules/email/email.module';
import { FollowupsController, EnquiryFollowupsController } from './leadfollowups.controller';
import { HappyCallingFollowupsController } from './happy-calling.leadfollowups.controller';
import { LeadFollowupsService } from './leadfollowups.service';

@Module({
    imports: [DatabaseModule, EmailModule],
    controllers: [FollowupsController, HappyCallingFollowupsController, EnquiryFollowupsController],
    providers: [LeadFollowupsService],
    exports: [LeadFollowupsService],
})
export class LeadFollowupsModule {}
