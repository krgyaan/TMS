import {
  Controller,
  Get,
  Patch,
  Req,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile/me
   */
  @Get('me')
  async getMyProfile(@Req() req: any) {
    return this.profileService.getMyProfile(req.user.id);
  }

  /**
   * PATCH /profile/me/basic
   * Edit-mode only: updates whitelisted trivial fields.
   */
  @Patch('me/basic')
  async updateMyProfileBasic(@Req() req: any, @Body() body: any) {
    return this.profileService.updateMyProfileEditMode(req.user.id, body);
  }
}
