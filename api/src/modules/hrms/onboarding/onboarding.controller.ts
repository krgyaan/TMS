// src/modules/hrms/onboarding/onboarding.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OnboardingService, type UpdateProfileDto } from './onboarding.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().optional(),
});

const UpdateProfileSchema = z.object({
  // Employment
  employeeType: z.string().optional(),
  workLocation: z.string().optional(),
  dateOfJoining: z.string().optional(),
  probationMonths: z.number().optional(),
  probationEndDate: z.string().optional(),
  // Core HR
  designationId: z.number().optional(),
  departmentId: z.number().optional(),
  reportingTl: z.number().optional(),
  // Compensation
  salaryType: z.string().optional(),
  basicSalary: z.coerce.string().optional(),
  // Bank
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  // Flags
  hrCompleted: z.boolean().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('hrms/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * GET /hrms/onboarding/dashboard  — Protected: HR only
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async listAll() {
    return this.onboardingService.findAll();
  }

  /**
   * POST /hrms/onboarding/initialize-employees
   * Bulk init for all existing users without completed profiles
   */
  @Post('initialize-employees')
  @UseGuards(JwtAuthGuard)
  async bulkInitialize(@Req() req: any) {
    return this.onboardingService.bulkInitializeOnboarding(req.user.id);
  }

  /**
   * POST /hrms/onboarding/initialize-employees/:userId
   * Init for a single specific user
   */
  @Post('initialize-employees/:userId')
  @UseGuards(JwtAuthGuard)
  async initializeSingle(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    return this.onboardingService.initializeEmployeeOnboarding(userId, req.user.id);
  }

  /**
   * GET /hrms/onboarding/profiles  — Protected: HR only
   * Returns all approved employees joined with profile completion data.
   */
  @Get('profiles')
  @UseGuards(JwtAuthGuard)
  async listProfiles() {
    return this.onboardingService.getProfileList();
  }

  /**
   * GET /hrms/onboarding/:id/profile  — Protected: HR only
   * Returns a single employee's full profile.
   */
  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getProfile(id);
  }

  /**
   * PATCH /hrms/onboarding/:id/profile  — Protected: HR only
   * HR fills employment, compensation, and bank details.
   */
  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const parsed = UpdateProfileSchema.parse(body) as UpdateProfileDto;
    return this.onboardingService.updateProfile(id, parsed, req.user.id);
  }

  /**
   * GET /hrms/onboarding/documents-tracker  — Protected: HR only
   */
  @Get('documents-tracker')
  @UseGuards(JwtAuthGuard)
  async listDocumentsTracker() {
    return this.onboardingService.getDocumentTrackerList();
  }

  /**
   * GET /hrms/onboarding/:id/documents  — Protected: HR only
   */
  @Get(':id/documents')
  @UseGuards(JwtAuthGuard)
  async getEmployeeDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getEmployeeDocuments(id);
  }

  /**
   * GET /hrms/onboarding/:id/education  — Protected: HR only
   */
  @Get(':id/education')
  @UseGuards(JwtAuthGuard)
  async getEmployeeEducation(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getEmployeeEducation(id);
  }

  /**
   * GET /hrms/onboarding/:id/experience  — Protected: HR only
   */
  @Get(':id/experience')
  @UseGuards(JwtAuthGuard)
  async getEmployeeExperience(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getEmployeeExperience(id);
  }

  /**
   * GET /hrms/onboarding/:id/bank-details  — Protected: HR only
   */
  @Get(':id/bank-details')
  @UseGuards(JwtAuthGuard)
  async getEmployeeBankDetails(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getEmployeeBankDetails(id);
  }

  // ─── Induction Endpoints ────────────────────────────────────────────────────

  /**
   * GET /hrms/onboarding/induction-tracker
   */
  @Get('induction-tracker')
  @UseGuards(JwtAuthGuard)
  async listInductionTracker() {
    return this.onboardingService.getInductionTrackerList();
  }

  /**
   * GET /hrms/onboarding/:id/induction
   */
  @Get(':id/induction')
  @UseGuards(JwtAuthGuard)
  async getEmployeeInduction(@Param('id', ParseIntPipe) id: number) {
    return this.onboardingService.getEmployeeInduction(id);
  }

  /**
   * PATCH /hrms/onboarding/:id/induction/:taskId
   */
  @Patch(':id/induction/:taskId')
  @UseGuards(JwtAuthGuard)
  async updateInductionTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: { status?: string; remarks?: string },
    @Req() req: any,
  ) {
    return this.onboardingService.updateInductionTask(id, taskId, body, req.user.id);
  }

  /**
   * PATCH /hrms/onboarding/:id/status  — Protected: HR only
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const parsed = UpdateStatusSchema.parse(body);
    const adminId: number = req.user.id;
    return this.onboardingService.updateStatus(id, parsed, adminId);
  }

  /**
   * DELETE /hrms/onboarding/:id  — Protected: HR only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.onboardingService.delete(id);
    return { success: true };
  }

  // ─── Per-Section HR Approval Endpoints ─────────────────────────────────────

  /**
   * PATCH /hrms/onboarding/:id/approve-profile
   */
  @Patch(':id/approve-profile')
  @UseGuards(JwtAuthGuard)
  async approveProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'approved' | 'rejected'; remark: string },
    @Req() req: any,
  ) {
    return this.onboardingService.approveProfileSection(id, body.status, body.remark, req.user.id);
  }

  /**
   * PATCH /hrms/onboarding/:id/:stage/:entryId/approve
   * Dynamic endpoint for approving or rejecting stage entries (education, experience, bank-details, documents)
   */
  @Patch(':id/:stage/:entryId/approve')
  @UseGuards(JwtAuthGuard)
  async approveStageEntry(
    @Param('id', ParseIntPipe) id: number,
    @Param('stage') stage: string,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() body: { status: 'approved' | 'rejected'; remark?: string },
    @Req() req: any,
  ) {
    const adminId = req.user.id;
    const status = body.status;
    const remark = body.remark || '';

    switch (stage) {
      case 'education':
        return this.onboardingService.approveEducationRecord(id, entryId, status, adminId, remark);
      case 'experience':
        return this.onboardingService.approveExperienceRecord(id, entryId, status, remark, adminId);
      case 'bank-details':
        return this.onboardingService.approveBankRecord(id, entryId, status, remark, adminId);
      case 'documents':
        return this.onboardingService.verifyDocument(id, entryId, status, remark, adminId);
      default:
        throw new BadRequestException(`Invalid stage endpoint: ${stage}`);
    }
  }
}