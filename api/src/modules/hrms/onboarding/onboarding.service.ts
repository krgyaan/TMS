// src/modules/hrms/onboarding/onboarding.service.ts

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';
import {
  onboardingRequests,
  onboardingProfiles,
  onboardingActivityLogs,
  type NewOnboardingRequest,
  type NewOnboardingProfile,
} from '@/db/schemas/hrms/onboarding';
import { users } from '@/db/schemas/auth/users.schema';
import { eq, desc } from 'drizzle-orm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SubmitSignupDto {
  // Personal
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  maritalStatus: string;
  nationality: string;
  personalEmail: string;
  phone: string;
  alternatePhone?: string;
  aadharNumber?: string;
  panNumber?: string;

  // Current Address
  currentAddressLine1: string;
  currentAddressLine2?: string;
  currentCity: string;
  currentState: string;
  currentCountry: string;
  currentPostalCode: string;

  // Permanent Address
  sameAsCurrent?: boolean;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentCountry?: string;
  permanentPostalCode?: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactAltPhone?: string;
  emergencyContactEmail?: string;
}

export interface UpdateStatusDto {
  status: 'approved' | 'rejected';
  note?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbInstance,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build the permanent address object.
   * If sameAsCurrent is true, mirror the current address fields.
   */
  private buildPermanentAddress(dto: SubmitSignupDto) {
    if (dto.sameAsCurrent) {
      return {
        line1: dto.currentAddressLine1,
        line2: dto.currentAddressLine2 ?? null,
        city: dto.currentCity,
        state: dto.currentState,
        country: dto.currentCountry,
        postalCode: dto.currentPostalCode,
      };
    }
    return {
      line1: dto.permanentAddressLine1 ?? null,
      line2: dto.permanentAddressLine2 ?? null,
      city: dto.permanentCity ?? null,
      state: dto.permanentState ?? null,
      country: dto.permanentCountry ?? null,
      postalCode: dto.permanentPostalCode ?? null,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * GET /hrms/onboarding/dashboard
   * All requests joined with reviewer name — used by the HR dashboard.
   */
  async findAll(): Promise<any[]> {
    try {
      const rows = await this.db
        .select({
          id: onboardingRequests.id,
          name: onboardingRequests.name,
          email: onboardingRequests.email,
          phone: onboardingRequests.phone,
          status: onboardingRequests.status,
          profileStatus: onboardingRequests.profileStatus,
          documentStatus: onboardingRequests.documentStatus,
          inductionStatus: onboardingRequests.inductionStatus,
          progress: onboardingRequests.progress,
          approvedAt: onboardingRequests.approvedAt,
          createdAt: onboardingRequests.createdAt,
          updatedAt: onboardingRequests.updatedAt,
          reviewedBy: users.name,
        })
        .from(onboardingRequests)
        .leftJoin(users, eq(onboardingRequests.approvedBy, users.id))
        .orderBy(desc(onboardingRequests.createdAt));

      return rows;
    } catch (err) {
      this.logger.error('OnboardingService.findAll failed', { err });
      throw err;
    }
  }

  /**
   * POST /hrms/onboarding/signup  (PUBLIC — no auth guard)
   *
   * What it does in a single transaction:
   *  1. Checks for duplicate email — prevents double submissions
   *  2. Creates the onboarding_request row (status = pending)
   *  3. Creates the onboarding_profile row with all submitted personal data
   *  4. Logs the signup action
   */
  async submitSignup(dto: SubmitSignupDto): Promise<{ id: number; message: string }> {
    // ── 1. Duplicate email guard ──────────────────────────────────────────
    const existing = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.email, dto.personalEmail))
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      if (prev.status === 'pending' || prev.status === 'approved') {
        throw new ConflictException(
          'A registration with this email already exists. ' +
          'Please contact HR if you need to make changes.',
        );
      }
      // Rejected submissions are allowed to re-apply
    }

    return this.db.transaction(async (tx) => {
      const fullName = [dto.firstName, dto.middleName, dto.lastName]
        .filter(Boolean)
        .join(' ');

      // ── 2. Create the onboarding request ─────────────────────────────────
      const [request] = await tx
        .insert(onboardingRequests)
        .values({
          name: fullName,
          email: dto.personalEmail,
          phone: dto.phone,
          status: 'pending',
        } as NewOnboardingRequest)
        .returning();

      // ── 3. Seed the profile with all personal data ────────────────────────
      const currentAddress = {
        line1: dto.currentAddressLine1,
        line2: dto.currentAddressLine2 ?? null,
        city: dto.currentCity,
        state: dto.currentState,
        country: dto.currentCountry,
        postalCode: dto.currentPostalCode,
      };

      const permanentAddress = this.buildPermanentAddress(dto);

      const emergencyContact = {
        name: dto.emergencyContactName,
        relationship: dto.emergencyContactRelationship,
        phone: dto.emergencyContactPhone,
        altPhone: dto.emergencyContactAltPhone ?? null,
        email: dto.emergencyContactEmail ?? null,
      };

      await tx.insert(onboardingProfiles).values({
        onboardingId: request.id,

        // Personal
        firstName: dto.firstName,
        middleName: dto.middleName ?? null,
        lastName: dto.lastName,
        dob: dto.dateOfBirth,
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        nationality: dto.nationality,
        email: dto.personalEmail,
        phone: dto.phone,
        aadharNumber: dto.aadharNumber ?? null,
        panNumber: dto.panNumber ?? null,

        // Address (stored as JSONB)
        currentAddress,
        permanentAddress,
        emergencyContact,

        // HR fields left blank — filled by HR in Profile Dashboard
        employeeCompleted: true,   // Employee side is done at signup
        hrCompleted: false,
      } as NewOnboardingProfile);

      // ── 4. Log the signup ─────────────────────────────────────────────────
      await tx.insert(onboardingActivityLogs).values({
        onboardingId: request.id,
        action: 'SIGNUP_SUBMITTED',
        performedBy: null,           // Public form — no user session
        metadata: {
          name: fullName,
          email: dto.personalEmail,
        },
      });

      this.logger.info('New signup submitted', {
        id: request.id,
        email: dto.personalEmail,
      });

      return {
        id: request.id,
        message: 'Registration submitted successfully. HR will review your information shortly.',
      };
    });
  }

  /**
   * PATCH /hrms/onboarding/:id/status
   * Approve or reject a pending request (HR action).
   */
  async updateStatus(
    id: number,
    dto: UpdateStatusDto,
    adminId: number,
  ): Promise<any> {
    return this.db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(onboardingRequests)
        .where(eq(onboardingRequests.id, id))
        .limit(1);

      if (!request) throw new NotFoundException(`Onboarding request #${id} not found`);

      if (request.status !== 'pending') {
        throw new BadRequestException(
          `Request is already "${request.status}" and cannot be actioned again.`,
        );
      }

      // Update request status
      const [updated] = await tx
        .update(onboardingRequests)
        .set({
          status: dto.status,
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, id))
        .returning();

      // Log the HR action
      await tx.insert(onboardingActivityLogs).values({
        onboardingId: id,
        action: dto.status === 'approved' ? 'APPROVED' : 'REJECTED',
        performedBy: adminId,
        metadata: {
          note: dto.note ?? null,
          previousStatus: request.status,
        },
      });

      this.logger.info(`Onboarding request #${id} ${dto.status}`, {
        adminId,
        note: dto.note,
      });

      return updated;
    });
  }

  /**
   * DELETE /hrms/onboarding/:id
   */
  async delete(id: number): Promise<void> {
    await this.db.delete(onboardingRequests).where(eq(onboardingRequests.id, id));
  }
}