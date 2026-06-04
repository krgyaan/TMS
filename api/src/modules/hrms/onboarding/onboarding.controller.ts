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
  Put,
  Req,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { z } from 'zod';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OnboardingService, type UpdateProfileDto } from './onboarding.service';
import { Public } from '@/modules/auth/decorators';

// ─── Multer Config ────────────────────────────────────────────────────────────

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

const documentStorage = diskStorage({
  destination: './uploads/hrms/employee-documents',
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const documentMulter = {
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `File type not allowed. Accepted: ${ALLOWED_EXT.join(', ')}`,
        ),
        false,
      );
    }
  },
};

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
        const docStatus = status === 'approved' ? 'verified' : 'rejected';
        return this.onboardingService.verifyDocument(id, entryId, docStatus, remark, adminId);
      default:
        throw new BadRequestException(`Invalid stage endpoint: ${stage}`);
    }
  }

  // ─── Employee-Facing Onboarding Endpoints ──────────────────────────────────

  /**
   * GET /hrms/onboarding/me
   * Retrieves the current employee's onboarding draft.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOnboardingDraft(@Req() req: any) {
    return this.onboardingService.getMyOnboardingDraft(req.user.id);
  }

  /**
   * PATCH /hrms/onboarding/me/profile
   * Updates draft onboarding profile details.
   */
  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingProfile(@Req() req: any, @Body() body: any) {
    return this.onboardingService.updateMyOnboardingProfile(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/me/submit
   * Employee final submission of onboarding details.
   */
  @Post('me/submit')
  @UseGuards(JwtAuthGuard)
  async submitOnboarding(@Req() req: any) {
    return this.onboardingService.submitOnboarding(req.user.id);
  }

  /**
   * POST /hrms/onboarding/education
   */
  @Post('education')
  @UseGuards(JwtAuthGuard)
  async addOnboardingEducation(@Req() req: any, @Body() body: any) {
    return this.onboardingService.addOnboardingEducation(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/education/:id
   */
  @Patch('education/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingEducation(@Req() req: any, @Param('id', ParseIntPipe) eduId: number, @Body() body: any) {
    return this.onboardingService.updateOnboardingEducation(req.user.id, eduId, body);
  }

  /**
   * PUT /hrms/onboarding/me/educations
   */
  @Put('me/educations')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingEducations(@Req() req: any, @Body() body: any) {
    return this.onboardingService.updateMyOnboardingEducations(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/experience
   */
  @Post('experience')
  @UseGuards(JwtAuthGuard)
  async addOnboardingExperience(@Req() req: any, @Body() body: any) {
    return this.onboardingService.addOnboardingExperience(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/experience/:id
   */
  @Patch('experience/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingExperience(@Req() req: any, @Param('id', ParseIntPipe) expId: number, @Body() body: any) {
    return this.onboardingService.updateOnboardingExperience(req.user.id, expId, body);
  }

  /**
   * PUT /hrms/onboarding/me/experiences
   */
  @Put('me/experiences')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingExperiences(@Req() req: any, @Body() body: any) {
    return this.onboardingService.updateMyOnboardingExperiences(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/bank-accounts
   */
  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  async addOnboardingBankDetails(@Req() req: any, @Body() body: any) {
    return this.onboardingService.addOnboardingBankDetails(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/bank-accounts/:id
   */
  @Patch('bank-accounts/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingBankDetails(@Req() req: any, @Param('id', ParseIntPipe) bankId: number, @Body() body: any) {
    return this.onboardingService.updateOnboardingBankDetails(req.user.id, bankId, body);
  }

  /**
   * POST /hrms/onboarding/documents
   * Upload a new draft onboarding document.
   */
  @Post('documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', documentMulter))
  async uploadOnboardingDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!body.docType) {
      throw new BadRequestException('docType is required');
    }
    if (!body.docCategory) {
      throw new BadRequestException('docCategory is required');
    }

    return this.onboardingService.uploadOnboardingDocument(req.user.id, file, {
      docType: body.docType,
      docCategory: body.docCategory,
      issueDate: body.issueDate || null,
      expiryDate: body.expiryDate || null,
    });
  }

  /**
   * PATCH /hrms/onboarding/documents/:id
   * Re-upload a rejected draft onboarding document.
   */
  @Patch('documents/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', documentMulter))
  async reuploadOnboardingDocument(
    @Req() req: any,
    @Param('id', ParseIntPipe) docId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.onboardingService.reuploadOnboardingDocument(req.user.id, docId, file, {
      issueDate: body.issueDate || null,
      expiryDate: body.expiryDate || null,
    });
  }

  /**
   * DELETE /hrms/onboarding/documents/:id
   * Delete an uploaded draft onboarding document.
   */
  @Delete('documents/:id')
  @UseGuards(JwtAuthGuard)
  async deleteOnboardingDocument(
    @Req() req: any,
    @Param('id', ParseIntPipe) docId: number,
  ) {
    await this.onboardingService.deleteOnboardingDocument(req.user.id, docId);
    return { success: true };
  }
}