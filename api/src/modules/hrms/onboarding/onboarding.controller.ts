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
import { Public } from '@/modules/auth/decorators';

// ─── Validation Schemas ───────────────────────────────────────────────────────

/**
 * Mirrors the Zod schema on the frontend exactly.
 * All personal + address + emergency contact fields.
 */
const SignupSchema = z.object({
  // Personal
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  maritalStatus: z.string().min(1, 'Marital status is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  personalEmail: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Valid phone number required'),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),

  // Current Address
  currentAddressLine1: z.string().min(1, 'Address line 1 is required'),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().min(1, 'City is required'),
  currentState: z.string().min(1, 'State is required'),
  currentCountry: z.string().min(1, 'Country is required'),
  currentPostalCode: z.string().min(1, 'Postal code is required'),

  // Permanent Address
  sameAsCurrent: z.boolean().optional(),
  permanentAddressLine1: z.string().optional(),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentPostalCode: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().min(1, 'Contact name is required'),
  emergencyContactRelationship: z.string().min(1, 'Relationship is required'),
  emergencyContactPhone: z.string().min(7, 'Valid phone required'),
  emergencyContactAltPhone: z.string().optional(),
  emergencyContactEmail: z.string().email().optional().or(z.literal('')),
});

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
   * PATCH /hrms/onboarding/:id/documents/:docId/verify  — Protected: HR only
   */
  @Patch(':id/documents/:docId/verify')
  @UseGuards(JwtAuthGuard)
  async verifyDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Body() body: { status: string; reason?: string },
    @Req() req: any,
  ) {
    if (!['verified', 'rejected'].includes(body.status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.onboardingService.verifyDocument(id, docId, body.status, body.reason, req.user.id);
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
   * POST /hrms/onboarding/signup  — PUBLIC: no auth guard
   * Called by the employee signup form on final submit.
   */
  @Public()
  @Post('signup')
  async submitSignup(@Body() body: unknown) {
    const parsed = SignupSchema.parse(body);
    return this.onboardingService.submitSignup(parsed);
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
}