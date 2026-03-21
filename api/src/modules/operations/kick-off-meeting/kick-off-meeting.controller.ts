import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { KickOffMeetingService } from './kick-off-meeting.service';
import { SaveKickOffMeetingSchema, UpdateKickOffMeetingMomSchema } from './dto/kick-off-meeting.dto';
import type { SaveKickOffMeetingDto, UpdateKickOffMeetingMomDto } from './dto/kick-off-meeting.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('kick-off-meeting')
@UseGuards(JwtAuthGuard)
export class KickOffMeetingController {
  constructor(private readonly kickOffMeetingService: KickOffMeetingService) {}

  @Get('wo-detail/:woDetailId')
  async getByWoDetailId(@Param('woDetailId', ParseIntPipe) woDetailId: number) {
    return this.kickOffMeetingService.getByWoDetailId(woDetailId);
  }

  @Post()
  async saveMeeting(
    @CurrentUser() user: ValidatedUser,
    @Body() body: unknown,
  ) {
    const dto = SaveKickOffMeetingSchema.parse(body) as SaveKickOffMeetingDto;
    return this.kickOffMeetingService.saveKickOffMeeting(user.sub, dto);
  }

  @Patch(':id/mom')
  async updateMom(
    @CurrentUser() user: ValidatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    const dto = UpdateKickOffMeetingMomSchema.parse(body) as UpdateKickOffMeetingMomDto;
    return this.kickOffMeetingService.updateMomFilePath(id, user.sub, dto);
  }
}
