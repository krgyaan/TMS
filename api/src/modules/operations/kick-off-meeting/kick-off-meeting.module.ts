import { Module } from '@nestjs/common';
import { KickOffMeetingService } from './kick-off-meeting.service';
import { KickOffMeetingController } from './kick-off-meeting.controller';

@Module({
  providers: [KickOffMeetingService],
  controllers: [KickOffMeetingController]
})
export class KickOffMeetingModule {}
