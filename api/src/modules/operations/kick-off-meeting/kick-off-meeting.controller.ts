import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { SaveKickOffMeetingDto, UpdateKickOffMeetingMomDto } from './dto/kick-off-meeting.dto';
import { SaveKickOffMeetingSchema, UpdateKickOffMeetingMomSchema } from './dto/kick-off-meeting.dto';
import { KickOffMeetingService } from './kick-off-meeting.service';

@Controller('kick-off-meeting')
export class KickOffMeetingController {
  constructor(private readonly kickOffMeetingService: KickOffMeetingService) {}

      @Get('dashboard')
      async getDashboard(
          @Query('tab') tab?: 'scheduled' | 'not_scheduled',
          @Query('page') page?: string,
          @Query('limit') limit?: string,
          @Query('sortBy') sortBy?: string,
          @Query('sortOrder') sortOrder?: 'asc' | 'desc',
          @Query('search') search?: string,
          @CurrentUser() user?: ValidatedUser,
          @Query('teamId') teamId?: string,
      ) {
          const parseNumber = (v?: string): number | undefined => {
              if (!v) return undefined;
              const num = parseInt(v, 10);
              return Number.isNaN(num) ? undefined : num;
          };
          const result = await this.kickOffMeetingService.getDashboardData(tab, {
              page: page ? parseInt(page, 10) : undefined,
              limit: limit ? parseInt(limit, 10) : undefined,
              sortBy,
              sortOrder,
              search,
          }, user, parseNumber(teamId));

          return result;
      }

      @Get('dashboard/counts')
      getDashboardCounts(
          @CurrentUser() user?: ValidatedUser,
          @Query('teamId') teamId?: string,
      ) {
          const parseNumber = (v?: string): number | undefined => {
              if (!v) return undefined;
              const num = parseInt(v, 10);
              return Number.isNaN(num) ? undefined : num;
          };
          return this.kickOffMeetingService.getDashboardCounts(user, parseNumber(teamId));
      }

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
