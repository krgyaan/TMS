import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowupsController, EnquiryFollowupsController } from './followups.controller';
import { HappyCallingFollowupsController } from './happy-calling.followups.controller';
import { FollowupsService } from './followups.service';

@Module({
    imports: [DatabaseModule],
    controllers: [FollowupsController, HappyCallingFollowupsController, EnquiryFollowupsController],
    providers: [FollowupsService],
    exports: [FollowupsService],
})
export class FollowupsModule {}