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
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
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