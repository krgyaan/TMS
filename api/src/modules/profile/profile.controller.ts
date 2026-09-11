import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { ProfileService } from './profile.service';

const CreateComplaintSchema = z.object({
  complaintType: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  complaintAgainst: z.enum(['person', 'department', 'system', 'policy', 'facility']).optional(),
  complaintAgainstId: z.number().int().positive().optional().nullable(),
  incidentDate: z.string().optional(),
  incidentLocation: z.string().max(255).optional(),
  previousAttempts: z.string().max(10000).optional(),
  witnesses: z.string().max(10000).optional(),
  expectedResolution: z.string().max(10000).optional(),
  attachments: z.array(z.string()).max(10).default([]),
});

@Controller('profile')
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

  /**
   * GET /profile/complaint-lookups
   * Active employees + departments for the complaint form selects.
   */
  @Get('complaint-lookups')
  async getComplaintLookups() {
    return this.profileService.getComplaintLookups();
  }

  /**
   * POST /profile/me/complaints
   * File a complaint as the authenticated employee (support page).
   */
  @Post('me/complaints')
  async createComplaint(@Req() req: any, @Body() body: unknown) {
    const dto = CreateComplaintSchema.parse(body);
    return this.profileService.createComplaint(req.user.id, dto);
  }
}
