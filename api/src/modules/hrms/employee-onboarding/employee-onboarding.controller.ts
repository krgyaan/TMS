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
import { EmployeeOnboardingService } from './employee-onboarding.service';
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

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('hrms/employee-onboarding')
export class EmployeeOnboardingController {
  constructor(private readonly employeeOnboardingService: EmployeeOnboardingService) {}

  /**
   * POST /hrms/onboarding/signup  — PUBLIC: no auth guard
   * Called by the employee signup form on final submit.
   */
  @Public()
  @Post('signup')
  async submitSignup(@Body() body: unknown) {
    const parsed = SignupSchema.parse(body);
    return this.employeeOnboardingService.submitSignup(parsed);
  }

  /**
   * GET /hrms/onboarding/me
   * Retrieves the current employee's onboarding draft.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOnboardingDraft(@Req() req: any) {
    return this.employeeOnboardingService.getMyOnboardingDraft(req.user.id);
  }

  /**
   * PATCH /hrms/onboarding/me/profile
   * Updates draft onboarding profile details.
   */
  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingProfile(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.updateMyOnboardingProfile(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/me/submit
   * Employee final submission of onboarding details.
   */
  @Post('me/submit')
  @UseGuards(JwtAuthGuard)
  async submitOnboarding(@Req() req: any) {
    return this.employeeOnboardingService.submitOnboarding(req.user.id);
  }

  /**
   * POST /hrms/onboarding/education
   */
  @Post('education')
  @UseGuards(JwtAuthGuard)
  async addOnboardingEducation(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.addOnboardingEducation(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/education/:id
   */
  @Patch('education/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingEducation(@Req() req: any, @Param('id', ParseIntPipe) eduId: number, @Body() body: any) {
    return this.employeeOnboardingService.updateOnboardingEducation(req.user.id, eduId, body);
  }

  /**
   * PUT /hrms/onboarding/me/educations
   */
  @Put('me/educations')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingEducations(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.updateMyOnboardingEducations(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/experience
   */
  @Post('experience')
  @UseGuards(JwtAuthGuard)
  async addOnboardingExperience(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.addOnboardingExperience(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/experience/:id
   */
  @Patch('experience/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingExperience(@Req() req: any, @Param('id', ParseIntPipe) expId: number, @Body() body: any) {
    return this.employeeOnboardingService.updateOnboardingExperience(req.user.id, expId, body);
  }

  /**
   * PUT /hrms/onboarding/me/experiences
   */
  @Put('me/experiences')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingExperiences(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.updateMyOnboardingExperiences(req.user.id, body);
  }

  /**
   * PUT /hrms/onboarding/me/bank-accounts
   * Bulk sync bank accounts for the current employee's onboarding.
   */
  @Put('me/bank-accounts')
  @UseGuards(JwtAuthGuard)
  async updateMyOnboardingBankAccounts(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.updateMyOnboardingBankAccounts(req.user.id, body);
  }

  /**
   * POST /hrms/onboarding/bank-accounts
   */
  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard)
  async addOnboardingBankDetails(@Req() req: any, @Body() body: any) {
    return this.employeeOnboardingService.addOnboardingBankDetails(req.user.id, body);
  }

  /**
   * PATCH /hrms/onboarding/bank-accounts/:id
   */
  @Patch('bank-accounts/:id')
  @UseGuards(JwtAuthGuard)
  async updateOnboardingBankDetails(@Req() req: any, @Param('id', ParseIntPipe) bankId: number, @Body() body: any) {
    return this.employeeOnboardingService.updateOnboardingBankDetails(req.user.id, bankId, body);
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

    return this.employeeOnboardingService.uploadOnboardingDocument(req.user.id, file, {
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

    return this.employeeOnboardingService.reuploadOnboardingDocument(req.user.id, docId, file, {
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
    await this.employeeOnboardingService.deleteOnboardingDocument(req.user.id, docId);
    return { success: true };
  }
}
