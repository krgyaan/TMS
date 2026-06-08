import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';
import {
  onboardingRequests,
  onboardingDocuments,
  onboardingActivityLogs,
  type NewOnboardingRequest,
  type NewOnboardingProfile,
  onboardingProfiles,
  onboardingEducation,
  onboardingExperience,
  onboardingBankDetails,
  onboardingInduction,
} from '@/db/schemas/hrms/onboarding';
import { users } from '@/db/schemas/auth/users.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { designations } from '@/db/schemas/master/designations.schema';
import { eq, desc, aliasedTable, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

const EMPLOYEE_DOCS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hrms', 'employee-documents');

const REQUIRED_DOC_TYPES = [
  'Aadhar Card',
  'Graduation Certificate',
  'Resume / CV',
  'Passport Size Photo',
  'Bank Passbook / Cancelled Cheque',
];

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

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EmployeeOnboardingService {
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

  async getMyOnboardingDraft(userId: number) {
    // 1. Fetch User Data
    const [userRow] = await this.db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        mobile: users.mobile,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(teams, eq(users.team, teams.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRow) {
      throw new NotFoundException('User not found');
    }

    const currentUser = {
      id: userRow.id,
      name: userRow.name,
      username: userRow.username,
      email: userRow.email,
      mobile: userRow.mobile,
      isActive: userRow.isActive,
      lastLoginAt: userRow.lastLoginAt?.toISOString() || null,
      createdAt: userRow.createdAt?.toISOString() || null,
      team: userRow.teamName || 'Unassigned',
    };

    // CHECK ONBOARDING STATUS
    const activeReqs = await this.db
      .select({
        id: onboardingRequests.id,
        status: onboardingRequests.status,
        hrStatus: onboardingRequests.hrStatus,
        requestType: onboardingRequests.requestType,
        profileStatus: onboardingRequests.profileStatus,
        documentStatus: onboardingRequests.documentStatus,
        inductionStatus: onboardingRequests.inductionStatus,
        progress: onboardingRequests.progress,
        createdAt: onboardingRequests.createdAt,
        updatedAt: onboardingRequests.updatedAt,
      })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed'; 
    if (!isOnboarding) {
      throw new BadRequestException('No active onboarding request found for this user.');
    }

    const onboardingId = activeReqs[0].id;

    let profile: any = null;
    let address: any = null;
    let emergencyContact: any = null;
    let documents: any[] = [];
    let education: any[] = [];
    let experience: any[] = [];
    let onboardingStatus: any = null;
    let inductionTasks: any = null;
    let bankAccounts: any[] = [];

    // 2 & 3. Fetch Onboarding Profile Data
    const reportingTl = aliasedTable(users, 'reportingTl');

    const [obProfileRow] = await this.db
      .select({
        profile: onboardingProfiles,
        designationName: designations.name,
        departmentName: teams.name,
        reportingTl: reportingTl.id,
      })
      .from(onboardingProfiles)
      .leftJoin(designations, eq(onboardingProfiles.designationId, designations.id))
      .leftJoin(teams, eq(onboardingProfiles.departmentId, teams.id))
      .leftJoin(reportingTl, eq(onboardingProfiles.reportingTl, reportingTl.id))
      .where(eq(onboardingProfiles.onboardingId, onboardingId))
      .limit(1);

    if (obProfileRow) {
      const obProfile = obProfileRow.profile;
      profile = {
        firstName: obProfile.firstName || '',
        middleName: obProfile.middleName || null,
        lastName: obProfile.lastName || null,
        dateOfBirth: obProfile.dob || null,
        gender: obProfile.gender || null,
        maritalStatus: obProfile.maritalStatus || null,
        nationality: obProfile.nationality || null,
        personalEmail: obProfile.email || userRow.email || null,
        phone: obProfile.phone || userRow.mobile || null,
        alternatePhone: null,
        aadharNumber: obProfile.aadharNumber || null,
        panNumber: obProfile.panNumber || null,
        bloodGroup: obProfile.bloodGroup || null,
        linkedinProfile: obProfile.linkedinProfile || null,
        status: obProfile.status ? obProfile.status : 'pending',
        employeeCode: null,
        altEmail: null,
      };
      address = {
        currentAddressLine1: (obProfile.currentAddress as any)?.line1 || null,
        currentAddressLine2: (obProfile.currentAddress as any)?.line2 || null,
        currentCity: (obProfile.currentAddress as any)?.city || null,
        currentState: (obProfile.currentAddress as any)?.state || null,
        currentCountry: (obProfile.currentAddress as any)?.country || null,
        currentPostalCode: (obProfile.currentAddress as any)?.postalCode || null,
        permanentAddressLine1: (obProfile.permanentAddress as any)?.line1 || null,
        permanentAddressLine2: (obProfile.permanentAddress as any)?.line2 || null,
        permanentCity: (obProfile.permanentAddress as any)?.city || null,
        permanentState: (obProfile.permanentAddress as any)?.state || null,
        permanentCountry: (obProfile.permanentAddress as any)?.country || null,
        permanentPostalCode: (obProfile.permanentAddress as any)?.postalCode || null,
      };
      emergencyContact = obProfile.emergencyContact ? {
        name: (obProfile.emergencyContact as any)?.name || null,
        relationship: (obProfile.emergencyContact as any)?.relationship || null,
        phone: (obProfile.emergencyContact as any)?.phone || null,
        altPhone: (obProfile.emergencyContact as any)?.altPhone || null,
        email: (obProfile.emergencyContact as any)?.email || null,
      } : null;
    }

    // 4. Fetch Onboarding Documents
    const obDocsRows = await this.db
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId))
      .orderBy(desc(onboardingDocuments.id));

    documents = obDocsRows.reduce((acc: any[], curr) => {
      const exists = acc.find(d => d.docType === curr.docType);
      if (!exists) acc.push(curr);
      return acc;
    }, []).map(d => ({
      id: d.id,
      docCategory: d.docCategory,
      docType: d.docType,
      docNumber: d.docNumber,
      fileUrl: d.fileUrl,
      fileName: d.fileUrl ? d.fileUrl.split('/').pop() : null,
      issueDate: d.issueDate || null,
      expiryDate: d.expiryDate || null,
      verificationStatus: d.hrStatus === 'approved' ? 'verified' : d.hrStatus === 'rejected' ? 'rejected' : 'pending',
      hrStatus: d.hrStatus,
      verifiedBy: d.verifiedBy ? String(d.verifiedBy) : null,
      verificationDate: d.verificationDate || null,
      hrRemark: d.hrRemark || null,
      remarks: d.hrRemark || null,
      uploadedAt: d.createdAt?.toISOString() || null,
      status: d.status ? d.status : "pending",
    }));

    // 5. Fetch Onboarding Education
    const obEduRows = await this.db
      .select()
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, onboardingId))
      .orderBy(desc(onboardingEducation.id));

    education = obEduRows.reduce((acc: any[], curr) => {
      const exists = acc.find(e => e.degree === curr.degree && e.institution === curr.institution);
      if (!exists) acc.push(curr);
      return acc;
    }, []).map(e => ({
      id: e.id,
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate ? String(e.startDate).split('T')[0] : null,
      endDate: e.endDate ? String(e.endDate).split('T')[0] : null,
      grade: e.grade,
      status: e.status,
      hrStatus: e.hrStatus,
      hrRemark: e.hrRemark || null,
      remarks: e.hrRemark || null,
    }));

    // 6. Fetch Onboarding Experience
    const obExpRows = await this.db
      .select()
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, onboardingId))
      .orderBy(desc(onboardingExperience.id));

    experience = obExpRows.reduce((acc: any[], curr) => {
      const exists = acc.find(e => e.companyName === curr.companyName && e.designation === curr.designation);
      if (!exists) acc.push(curr);
      return acc;
    }, []).map(e => ({
      id: e.id,
      companyName: e.companyName,
      designation: e.designation,
      fromDate: e.fromDate ? String(e.fromDate).split('T')[0] : null,
      toDate: e.toDate ? String(e.toDate).split('T')[0] : null,
      currentlyWorking: e.currentlyWorking,
      responsibilities: e.responsibilities,
      status: e.status,
      hrStatus: e.hrStatus,
      hrRemark: e.hrRemark || null,
      remarks: e.hrRemark || null,
    }));

    // 7. Fetch Induction Tasks
    // Note: Fetch inductionTasks using Drizzle on onboardingInduction table
    // (Import onboardingInduction to support this query)
    inductionTasks = await this.db
      .select()
      .from(onboardingInduction)
      .where(eq(onboardingInduction.onboardingId, onboardingId));

    // 7.5 Fetch Onboarding Bank Details
    const obBankRows = await this.db
      .select()
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, onboardingId))
      .orderBy(desc(onboardingBankDetails.id));

    bankAccounts = obBankRows.reduce((acc: any[], curr) => {
      const exists = acc.find(e => e.accountNumber === curr.accountNumber);
      if (!exists) acc.push(curr);
      return acc;
    }, []).map(b => ({
      id: b.id,
      bankName: b.bankName,
      accountHolderName: b.accountHolderName,
      accountNumber: b.accountNumber,
      ifscCode: b.ifscCode,
      branchName: b.branchName || null,
      branchAddress: b.branchAddress || null,
      upiId: b.upiId || null,
      isPrimary: b.isPrimary,
      status: b.status,
      hrStatus: b.hrStatus,
      hrRemark: b.hrRemark || null,
      remarks: b.hrRemark || null,
    }));

    // 8. Build onboarding status for frontend
    const obReq = activeReqs[0];
    const obProfile = obProfileRow?.profile;

    const profileStatus = obProfile?.status === 'submitted' || obProfile?.status === 'resubmitted' ? obProfile.status : 'pending';
    const profileHrStatus = (obProfile?.hrStatus as any) || 'pending';

    const bankStatus = bankAccounts.length > 0 ? (bankAccounts.some(b => b.status === 'resubmitted') ? 'resubmitted' : 'submitted') : 'pending';
    const bankHrStatus = bankAccounts.some((b: any) => b.hrStatus === 'rejected')
      ? 'rejected'
      : (bankAccounts.length > 0 && bankAccounts.every((b: any) => b.hrStatus === 'approved'))
        ? 'approved'
        : 'pending';

    const allRequiredSubmitted = REQUIRED_DOC_TYPES.every((type) =>
      obDocsRows.some((d: any) => d.docType === type && (d.status === 'submitted' || d.status === 'resubmitted'))
    );
    const documentStatus = allRequiredSubmitted
      ? (obDocsRows.some(d => d.status === 'resubmitted') ? 'resubmitted' : 'submitted')
      : 'pending';
    const documentHrStatus = documents.some((d: any) => d.hrStatus === 'rejected')
      ? 'rejected'
      : (documents.length > 0 && documents.every((d: any) => d.hrStatus === 'approved'))
        ? 'approved'
        : 'pending';

    const educationStatus = education.length > 0 ? (education.some(e => e.status === 'resubmitted') ? 'resubmitted' : 'submitted') : 'pending';
    const educationHrStatus = education.some((e: any) => e.hrStatus === 'rejected') 
      ? 'rejected'
      : (education.length > 0 && education.every((e: any) => e.hrStatus === 'approved')) 
        ? 'approved'
        : 'pending';

    const experienceStatus = experience.length > 0 ? (experience.some(e => e.status === 'resubmitted') ? 'resubmitted' : 'submitted') : 'pending';
    const experienceHrStatus = experience.some((e: any) => e.hrStatus === 'rejected') 
      ? 'rejected'
      : (experience.length > 0 && experience.every((e: any) => e.hrStatus === 'approved'))
        ? 'approved'
        : 'pending';

    const inductionStatus = inductionTasks.every((i: any) => i.status == 'completed') ? 'completed' : 'pending';

    const employeeCompleted = 
      (profileStatus === 'submitted' || profileStatus === 'resubmitted') &&
      (documentStatus === 'submitted' || documentStatus === 'resubmitted') &&
      (bankStatus === 'submitted' || bankStatus === 'resubmitted') &&
      (educationStatus === 'submitted' || educationStatus === 'resubmitted') &&
      (experienceStatus === 'submitted' || experienceStatus === 'resubmitted');

    onboardingStatus = {
      id: obReq.id,
      requestType: obReq.requestType,
      status: obReq.status,
      hrStatus: obReq.hrStatus,
      profileStatus,
      documentStatus,
      bankStatus,
      educationStatus,
      experienceStatus,
      inductionStatus,
      
      profileHrStatus,
      bankHrStatus,
      educationHrStatus,
      experienceHrStatus,
      documentHrStatus,
      progress: obReq.progress || 0,
      profileHrRemark: obProfile?.hrRemark || null,
      bankHrRemark: bankAccounts.find((b: any) => b.hrStatus === 'rejected')?.hrRemark || null,
      educationHrRemark: education.find((e: any) => e.hrStatus === 'rejected')?.hrRemark || null,
      experienceHrRemark: experience.find((e: any) => e.hrStatus === 'rejected')?.hrRemark || null,
      documentHrRemark: documents.find((d: any) => (d as any).hrStatus === 'rejected')?.hrRemark || null,

      employeeCompleted: employeeCompleted || obProfile?.employeeCompleted || false,
      hrCompleted: obProfile?.hrCompleted ?? false,
      createdAt: obReq.createdAt?.toISOString() || null,
      updatedAt: obReq.updatedAt?.toISOString() || null,
    };

    return {
      currentUser,
      isOnboarding: true,
      onboardingStatus,
      profile,
      address,
      emergencyContact,
      education,
      experience,
      documents,
      inductionTasks,
      bankAccounts,
    };
  }

  async updateMyOnboardingProfile(userId: number, dto: any) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('No active onboarding request found.');
    }

    const onboardingId = activeReqs[0].id;

    // Determine if the DTO contains profile fields (vs bank-only submission)
    const hasProfileFields = dto.firstName !== undefined || dto.lastName !== undefined || dto.dateOfBirth !== undefined || dto.gender !== undefined || dto.phone !== undefined || dto.personalEmail !== undefined || dto.aadharNumber !== undefined || dto.panNumber !== undefined;

    if (hasProfileFields) {
      // Fetch the LATEST profile record for this onboarding
      const [currentProfile] = await this.db
        .select({ id: onboardingProfiles.id, hrStatus: onboardingProfiles.hrStatus, status: onboardingProfiles.status })
        .from(onboardingProfiles)
        .where(eq(onboardingProfiles.onboardingId, onboardingId))
        .orderBy(desc(onboardingProfiles.id))
        .limit(1);

      // If current profile was approved, block editing
      if (currentProfile?.hrStatus === 'approved') {
        throw new ForbiddenException('Profile has been approved and can no longer be edited.');
      }

      const profileData = {
        onboardingId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dob: dto.dateOfBirth,
        gender: dto.gender,
        maritalStatus: dto.maritalStatus,
        nationality: dto.nationality,
        aadharNumber: dto.aadharNumber,
        panNumber: dto.panNumber,
        phone: dto.phone,
        email: dto.personalEmail,
        bloodGroup: dto.bloodGroup,
        linkedinProfile: dto.linkedinProfile,
        currentAddress: dto.address ? {
          line1: dto.address.currentAddressLine1,
          line2: dto.address.currentAddressLine2,
          city: dto.address.currentCity,
          state: dto.address.currentState,
          country: dto.address.currentCountry,
          postalCode: dto.address.currentPostalCode,
        } : undefined,
        permanentAddress: dto.address ? {
          line1: dto.address.permanentAddressLine1,
          line2: dto.address.permanentAddressLine2,
          city: dto.address.permanentCity,
          state: dto.address.permanentState,
          country: dto.address.permanentCountry,
          postalCode: dto.address.permanentPostalCode,
        } : undefined,
        emergencyContact: dto.emergencyContact ? {
          name: dto.emergencyContact.name,
          relationship: dto.emergencyContact.relationship,
          phone: dto.emergencyContact.phone,
          altPhone: dto.emergencyContact.altPhone,
          email: dto.emergencyContact.email,
        } : undefined,
        updatedAt: new Date(),
      };

      if (currentProfile) {
        await this.db.update(onboardingProfiles)
          .set({ ...profileData, status: 'resubmitted', hrStatus: 'pending', hrRemark: null })
          .where(eq(onboardingProfiles.id, currentProfile.id));
      } else {
        await this.db.insert(onboardingProfiles).values({
          ...profileData,
          status: 'submitted',
          hrStatus: 'pending',
        } as any);
      }

    }

    // Handle Bank Accounts Sync
    if (dto.bankAccounts && Array.isArray(dto.bankAccounts)) {
      const existing = await this.db.select().from(onboardingBankDetails).where(eq(onboardingBankDetails.onboardingId, onboardingId));
      const inputIds = dto.bankAccounts.map((b: any) => b.id).filter(Boolean) as number[];
      const toDelete = existing.filter((b) => !inputIds.includes(b.id) && b.hrStatus !== 'approved');
      for (const record of toDelete) {
        await this.db.delete(onboardingBankDetails).where(eq(onboardingBankDetails.id, record.id));
      }

      for (const b of dto.bankAccounts) {
        if (b.id) {
          const dbRecord = existing.find((r) => r.id === b.id);
          if (dbRecord && dbRecord.hrStatus === 'approved') {
            continue;
          }
        }

        const payload: any = {
          bankName: b.bankName,
          accountHolderName: b.accountHolderName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          branchName: b.branchName || null,
          branchAddress: b.branchAddress || null,
          upiId: b.upiId || null,
          isPrimary: b.isPrimary === true || b.isPrimary === 'true',
          status: b.id ? 'resubmitted' : 'submitted',
          hrStatus: 'pending',
          hrRemark: null,
          updatedAt: new Date(),
        };

        if (b.id) {
          await this.db.update(onboardingBankDetails)
            .set(payload)
            .where(eq(onboardingBankDetails.id, b.id));
        } else {
          await this.db.insert(onboardingBankDetails).values({
            onboardingId: onboardingId,
            ...payload,
            createdAt: new Date(),
          });
        }
      }
    }

    // Handle Education Sync
    if (dto.education && Array.isArray(dto.education)) {
      const existing = await this.db.select().from(onboardingEducation).where(eq(onboardingEducation.onboardingId, onboardingId));
      const inputIds = dto.education.map((e: any) => e.id).filter(Boolean) as number[];
      const toDelete = existing.filter((e) => !inputIds.includes(e.id) && e.hrStatus !== 'approved');
      for (const record of toDelete) {
        await this.db.delete(onboardingEducation).where(eq(onboardingEducation.id, record.id));
      }

      for (const e of dto.education) {
        if (e.id) {
          const dbRecord = existing.find((r) => r.id === e.id);
          if (dbRecord && dbRecord.hrStatus === 'approved') {
            continue;
          }
        }

        const payload: any = {
          degree: e.degree,
          institution: e.institution,
          fieldOfStudy: e.fieldOfStudy || null,
          startDate: e.startDate ? (e.startDate.length === 7 ? `${e.startDate}-01` : e.startDate) : null,
          endDate: e.endDate ? (e.endDate.length === 7 ? `${e.endDate}-01` : e.endDate) : null,
          grade: e.grade || null,
          status: e.id ? 'resubmitted' : 'submitted',
          hrStatus: 'pending',
          hrRemark: null,
          updatedAt: new Date(),
        };

        if (e.id) {
          await this.db.update(onboardingEducation)
            .set(payload)
            .where(eq(onboardingEducation.id, e.id));
        } else {
          await this.db.insert(onboardingEducation).values({
            onboardingId: onboardingId,
            ...payload,
            createdAt: new Date(),
          });
        }
      }
    }

    // Handle Experience Sync
    if (dto.experience && Array.isArray(dto.experience)) {
      const existing = await this.db.select().from(onboardingExperience).where(eq(onboardingExperience.onboardingId, onboardingId));
      const inputIds = dto.experience.map((e: any) => e.id).filter(Boolean) as number[];
      const toDelete = existing.filter((e) => !inputIds.includes(e.id) && e.hrStatus !== 'approved');
      for (const record of toDelete) {
        await this.db.delete(onboardingExperience).where(eq(onboardingExperience.id, record.id));
      }

      for (const e of dto.experience) {
        if (e.id) {
          const dbRecord = existing.find((r) => r.id === e.id);
          if (dbRecord && dbRecord.hrStatus === 'approved') {
            continue;
          }
        }

        const payload: any = {
          companyName: e.companyName,
          designation: e.designation,
          fromDate: e.fromDate || null,
          toDate: e.currentlyWorking ? null : (e.toDate || null),
          currentlyWorking: e.currentlyWorking === true || e.currentlyWorking === 'true',
          responsibilities: e.responsibilities || null,
          status: e.id ? 'resubmitted' : 'submitted',
          hrStatus: 'pending',
          hrRemark: null,
          updatedAt: new Date(),
        };

        if (e.id) {
          await this.db.update(onboardingExperience)
            .set(payload)
            .where(eq(onboardingExperience.id, e.id));
        } else {
          await this.db.insert(onboardingExperience).values({
            onboardingId: onboardingId,
            ...payload,
            createdAt: new Date(),
          });
        }
      }
    }

    await this.recalculateSubmissionStatuses(this.db, onboardingId);

    // If any stage data was resubmitted, reset parent request status from 'rejected' to 'pending'
    if (activeReqs[0].status === 'rejected') {
      await this.db.update(onboardingRequests)
        .set({ status: 'pending' })
        .where(eq(onboardingRequests.id, onboardingId));
    }

    return { success: true };
  }

  async submitOnboarding(userId: number) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('No active onboarding found.');
    }

    const onboardingId = activeReqs[0].id;

    // Fetch the latest profile record
    const [obProfile] = await this.db
      .select({ id: onboardingProfiles.id, status: onboardingProfiles.status, employeeCompleted: onboardingProfiles.employeeCompleted })
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.onboardingId, onboardingId))
      .orderBy(desc(onboardingProfiles.id))
      .limit(1);

    const alreadySubmitted = obProfile?.status === 'submitted' || obProfile?.employeeCompleted;
    if (alreadySubmitted) {
      return { success: true, message: 'Already submitted for review.' };
    }

    // Mark as submitted
    if (obProfile) {
      await this.db.update(onboardingProfiles).set({
        status: 'submitted',
        employeeCompleted: true,
        updatedAt: new Date(),
      } as any).where(eq(onboardingProfiles.id, obProfile.id));
    }

    await this.recalculateSubmissionStatuses(this.db, onboardingId);

    // Log the activity
    await this.db.insert(onboardingActivityLogs).values({
      onboardingId: onboardingId,
      action: 'EMPLOYEE_SUBMITTED',
      performedBy: userId,
    });

    return { success: true, message: 'Onboarding details submitted for review.' };
  }

  async addOnboardingEducation(userId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, progress: onboardingRequests.progress })
      .from(onboardingRequests)
      .where(and(
        eq(onboardingRequests.userId, userId),
        eq(onboardingRequests.status, 'approved')
      ))
      .orderBy(desc(onboardingRequests.createdAt)).limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].progress == 'pending';

    if (isOnboarding) {
      const [inserted] = await this.db.insert(onboardingEducation).values({
        onboardingId: activeReqs[0].id,
        degree: dto.degree,
        institution: dto.institution,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: dto.startDate ? (dto.startDate.length === 7 ? `${dto.startDate}-01` : dto.startDate) : null,
        endDate: dto.endDate ? (dto.endDate.length === 7 ? `${dto.endDate}-01` : dto.endDate) : null,
        grade: dto.grade,
        status: 'submitted',
        hrStatus: 'pending',
      }).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return inserted;
    }

    throw new BadRequestException('Education details can only be modified during onboarding.');
  }

  async updateOnboardingEducation(userId: number, eduId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, progress : onboardingRequests.progress })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].progress == 'pending';
    const [entry] = await this.db.select().from(onboardingEducation).where(eq(onboardingEducation.id, eduId));
    if (!entry) throw new NotFoundException('Education details not found');
    if (entry.hrStatus === 'approved') {
      throw new BadRequestException('Approved education details cannot be modified.');
    }

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingEducation).set({
        degree: dto.degree,
        institution: dto.institution,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: dto.startDate ? (dto.startDate.length === 7 ? `${dto.startDate}-01` : dto.startDate) : null,
        endDate: dto.endDate ? (dto.endDate.length === 7 ? `${dto.endDate}-01` : dto.endDate) : null,
        grade: dto.grade,
        status: 'resubmitted',
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      }).where(eq(onboardingEducation.id, eduId)).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return updated;
    }

    throw new BadRequestException('Education details can only be modified during onboarding.');
  }

  async updateMyOnboardingBankAccounts(userId: number, body: any) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('Bank details can only be modified during onboarding.');
    }

    const onboardingId = activeReqs[0].id;
    const { bankAccounts } = body;

    if (!bankAccounts || !Array.isArray(bankAccounts)) {
      throw new BadRequestException('bankAccounts array is required');
    }

    const existing = await this.db
      .select()
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, onboardingId));

    // Delete records that are no longer in the submitted array (skip approved)
    const inputIds = bankAccounts.map((b: any) => b.id).filter(Boolean) as number[];
    const toDelete = existing.filter((b) => !inputIds.includes(b.id) && b.hrStatus !== 'approved');
    for (const record of toDelete) {
      await this.db.delete(onboardingBankDetails).where(eq(onboardingBankDetails.id, record.id));
    }

    for (const b of bankAccounts) {
      // Skip approved entries — don't modify them
      if (b.id) {
        const dbRecord = existing.find((r) => r.id === b.id);
        if (dbRecord && dbRecord.hrStatus === 'approved') {
          continue;
        }
      }

      const payload: any = {
        bankName: b.bankName,
        accountHolderName: b.accountHolderName,
        accountNumber: b.accountNumber,
        ifscCode: b.ifscCode,
        branchName: b.branchName || null,
        branchAddress: b.branchAddress || null,
        upiId: b.upiId || null,
        isPrimary: b.isPrimary === true || b.isPrimary === 'true',
        status: b.id ? 'resubmitted' : 'submitted',
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      };

      if (b.id) {
        await this.db.update(onboardingBankDetails)
          .set(payload)
          .where(eq(onboardingBankDetails.id, b.id));
      } else {
        await this.db.insert(onboardingBankDetails).values({
          onboardingId,
          ...payload,
          createdAt: new Date(),
        });
      }
    }

    await this.recalculateSubmissionStatuses(this.db, onboardingId);

    // Reset parent request status from 'rejected' to 'pending' on resubmission
    if (activeReqs[0].status === 'rejected') {
      await this.db.update(onboardingRequests)
        .set({ status: 'pending' })
        .where(eq(onboardingRequests.id, onboardingId));
    }

    return { success: true };
  }

  async updateMyOnboardingEducations(userId: number, body: any) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('Education details can only be modified during onboarding.');
    }

    const { educations } = body;
    if (!educations || !Array.isArray(educations)) {
      throw new BadRequestException('Educations array is required');
    }

    const existing = await this.db
      .select()
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, activeReqs[0].id));

    const inputIds = educations.map((e: any) => e.id).filter(Boolean) as number[];
    const toDelete = existing.filter((e) => !inputIds.includes(e.id));
    for (const record of toDelete) {
      await this.db.delete(onboardingEducation).where(eq(onboardingEducation.id, record.id));
    }

    for (const e of educations) {
      const payload: any = {
        degree: e.degree,
        institution: e.institution,
        fieldOfStudy: e.fieldOfStudy || null,
        startDate: e.startDate ? (e.startDate.length === 7 ? `${e.startDate}-01` : e.startDate) : null,
        endDate: e.endDate ? (e.endDate.length === 7 ? `${e.endDate}-01` : e.endDate) : null,
        grade: e.grade || null,
        status: e.id ? 'resubmitted' : 'submitted',
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      };

      if (e.id) {
        await this.db.update(onboardingEducation)
          .set(payload)
          .where(eq(onboardingEducation.id, e.id));
      } else {
        await this.db.insert(onboardingEducation).values({
          onboardingId: activeReqs[0].id,
          ...payload,
          createdAt: new Date(),
        });
      }
    }

    await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

    // Reset parent request status from 'rejected' to 'pending' on resubmission
    if (activeReqs[0].status === 'rejected') {
      await this.db.update(onboardingRequests)
        .set({ status: 'pending' })
        .where(eq(onboardingRequests.id, activeReqs[0].id));
    }

    return { success: true };
  }

  async addOnboardingExperience(userId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, progress: onboardingRequests.progress })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].progress == 'pending';
    const parseDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : null;

    if (isOnboarding) {
      const [inserted] = await this.db.insert(onboardingExperience).values({
        onboardingId: activeReqs[0].id,
        companyName: dto.companyName,
        designation: dto.designation,
        fromDate: parseDate(dto.fromDate),
        toDate: parseDate(dto.toDate),
        currentlyWorking: dto.currentlyWorking,
        responsibilities: dto.responsibilities,
        status: 'submitted',
        hrStatus: 'pending',
      }).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return inserted;
    }

    throw new BadRequestException('Experience details can only be modified during onboarding.');
  }

  async updateOnboardingExperience(userId: number, expId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';
    const [entry] = await this.db.select().from(onboardingExperience).where(eq(onboardingExperience.id, expId));
    if (!entry) throw new NotFoundException('Experience details not found');
    if (entry.hrStatus === 'approved') {
      throw new BadRequestException('Approved experience details cannot be modified.');
    }

    const parseDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : undefined;

    const payload = {
      companyName: dto.companyName,
      designation: dto.designation,
      fromDate: dto.fromDate !== undefined ? parseDate(dto.fromDate) : undefined,
      toDate: dto.toDate !== undefined ? parseDate(dto.toDate) : undefined,
      currentlyWorking: dto.currentlyWorking,
      responsibilities: dto.responsibilities,
      status: 'resubmitted',
      hrStatus: 'pending',
      hrRemark: null,
      updatedAt: new Date(),
    };

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingExperience).set(payload)
        .where(eq(onboardingExperience.id, expId)).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return updated;
    }

    throw new BadRequestException('Experience details can only be modified during onboarding.');
  }

  async updateMyOnboardingExperiences(userId: number, body: any) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);

    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('Experience details can only be modified during onboarding.');
    }

    const { experiences } = body;
    if (!experiences || !Array.isArray(experiences)) {
      throw new BadRequestException('Experiences array is required');
    }

    const existing = await this.db
      .select()
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, activeReqs[0].id));

    const inputIds = experiences.map((e: any) => e.id).filter(Boolean) as number[];
    const toDelete = existing.filter((e) => !inputIds.includes(e.id));
    for (const record of toDelete) {
      await this.db.delete(onboardingExperience).where(eq(onboardingExperience.id, record.id));
    }

    for (const e of experiences) {
      const payload: any = {
        companyName: e.companyName,
        designation: e.designation,
        fromDate: e.fromDate || null,
        toDate: e.currentlyWorking ? null : (e.toDate || null),
        currentlyWorking: e.currentlyWorking === true || e.currentlyWorking === 'true',
        responsibilities: e.responsibilities || null,
        status: e.id ? 'resubmitted' : 'submitted',
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      };

      if (e.id) {
        await this.db.update(onboardingExperience)
          .set(payload)
          .where(eq(onboardingExperience.id, e.id));
      } else {
        await this.db.insert(onboardingExperience).values({
          onboardingId: activeReqs[0].id,
          ...payload,
          createdAt: new Date(),
        });
      }
    }

    await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

    // Reset parent request status from 'rejected' to 'pending' on resubmission
    if (activeReqs[0].status === 'rejected') {
      await this.db.update(onboardingRequests)
        .set({ status: 'pending' })
        .where(eq(onboardingRequests.id, activeReqs[0].id));
    }

    return { success: true };
  }

  async addOnboardingBankDetails(userId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [inserted] = await this.db.insert(onboardingBankDetails).values({
        onboardingId: activeReqs[0].id,
        bankName: dto.bankName,
        accountHolderName: dto.accountHolderName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        branchName: dto.branchName || null,
        branchAddress: dto.branchAddress || null,
        upiId: dto.upiId || null,
        isPrimary: dto.isPrimary || false,
        status: 'submitted',
        hrStatus: 'pending',
      }).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return inserted;
    }

    throw new BadRequestException('Bank details can only be modified during onboarding.');
  }

  async updateOnboardingBankDetails(userId: number, bankId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';
    const [entry] = await this.db.select().from(onboardingBankDetails).where(eq(onboardingBankDetails.id, bankId));
    
    if (isOnboarding && entry.hrStatus != "approved") {
      const [updated] = await this.db.update(onboardingBankDetails).set({
        bankName: dto.bankName,
        accountHolderName: dto.accountHolderName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        branchName: dto.branchName || null,
        branchAddress: dto.branchAddress || null,
        upiId: dto.upiId || null,
        isPrimary: dto.isPrimary || false,
        status: 'resubmitted',
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      }).where(eq(onboardingBankDetails.id, bankId)).returning();

      await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

      return updated;
    }

    throw new BadRequestException('Bank details can only be modified during onboarding.');
  }

  async uploadOnboardingDocument(
    userId: number,
    file: Express.Multer.File,
    dto: {
      docType: string;
      docCategory: string;
      issueDate: string | null;
      expiryDate: string | null;
    },
  ) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';
    const onboardingId = isOnboarding ? activeReqs[0].id : null;

    if (!isOnboarding) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('Documents can only be uploaded during onboarding.');
    }

    const existingDocs = await this.db
      .select({ docType: onboardingDocuments.docType })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId!));

    const duplicate = existingDocs.find(
      d => d.docType?.toLowerCase() === dto.docType.toLowerCase(),
    );

    if (duplicate) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new ConflictException(`A document of type "${dto.docType}" already exists. Use re-upload instead.`);
    }

    const fileUrl = `/uploads/hrms/employee-documents/${file.filename}`;

    const [inserted] = await this.db
      .insert(onboardingDocuments)
      .values({
        onboardingId: onboardingId!,
        docType: dto.docType,
        docCategory: dto.docCategory,
        fileUrl,
        issueDate: dto.issueDate || null,
        expiryDate: dto.expiryDate || null,
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();

    await this.recalculateSubmissionStatuses(this.db, onboardingId!);

    return {
      id: inserted.id,
      docType: inserted.docType,
      docCategory: inserted.docCategory,
      fileUrl: inserted.fileUrl,
      fileName: file.filename,
      issueDate: inserted.issueDate || null,
      expiryDate: inserted.expiryDate || null,
      verificationStatus: inserted.status,
      uploadedAt: inserted.createdAt?.toISOString() || null,
      remarks: null,
    };
  }

  async reuploadOnboardingDocument(
    userId: number,
    docId: number,
    file: Express.Multer.File,
    dto: {
      issueDate: string | null;
      expiryDate: string | null;
    },
  ) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('Documents can only be modified during onboarding.');
    }

    const [existing] = await this.db
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.id, docId))
      .limit(1);

    if (!existing) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new NotFoundException('Document not found');
    }

    if (existing.hrStatus === 'approved') {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('Approved documents cannot be re-uploaded.');
    }

    if (existing.onboardingId !== activeReqs[0].id) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new ForbiddenException('You do not own this document');
    }

    if (existing.fileUrl) {
      const oldFilename = existing.fileUrl.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(EMPLOYEE_DOCS_UPLOAD_DIR, oldFilename);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    const newFileUrl = `/uploads/hrms/employee-documents/${file.filename}`;

    const [updated] = await this.db
      .update(onboardingDocuments)
      .set({
        fileUrl: newFileUrl,
        issueDate: dto.issueDate || null,
        expiryDate: dto.expiryDate || null,
        status: 'resubmitted',
        verifiedBy: null,
        verificationDate: null,
        hrStatus: 'pending',
        hrRemark: null,
        updatedAt: new Date(),
      })
      .where(eq(onboardingDocuments.id, docId))
      .returning();

    await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);

    return {
      id: updated.id,
      docType: updated.docType,
      docCategory: updated.docCategory,
      fileUrl: updated.fileUrl,
      fileName: file.filename,
      issueDate: updated.issueDate || null,
      expiryDate: updated.expiryDate || null,
      verificationStatus: updated.status,
      uploadedAt: updated.createdAt?.toISOString() || null,
      remarks: null,
    };
  }

  async deleteOnboardingDocument(userId: number, docId: number): Promise<void> {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (!isOnboarding) {
      throw new BadRequestException('Documents can only be deleted during onboarding.');
    }

    const [existing] = await this.db
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.id, docId))
      .limit(1);

    if (!existing) throw new NotFoundException('Document not found');
    if (existing.hrStatus === 'approved') {
      throw new BadRequestException('Approved documents cannot be deleted.');
    }
    if (existing.onboardingId !== activeReqs[0].id) throw new ForbiddenException('You do not own this document');

    if (existing.fileUrl) {
      const filename = existing.fileUrl.split('/').pop();
      if (filename) {
        const diskPath = path.join(EMPLOYEE_DOCS_UPLOAD_DIR, filename);
        try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); } catch (_) {}
      }
    }

    await this.db.delete(onboardingDocuments).where(eq(onboardingDocuments.id, docId));
    await this.recalculateSubmissionStatuses(this.db, activeReqs[0].id);
  }

  private async recalculateSubmissionStatuses(txOrDb: any, onboardingId: number): Promise<void> {
    // 1. Profile
    const [profile] = await txOrDb
      .select({ status: onboardingProfiles.status })
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.onboardingId, onboardingId))
      .orderBy(desc(onboardingProfiles.id))
      .limit(1);

    const profileStatus = (profile?.status === 'submitted' || profile?.status === 'resubmitted') 
      ? profile.status 
      : 'pending';

    // 2. Education
    const educations = await txOrDb
      .select({ status: onboardingEducation.status })
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, onboardingId));

    let educationStatus = 'pending';
    if (educations.length > 0) {
      educationStatus = educations.some((e: any) => e.status === 'resubmitted') ? 'resubmitted' : 'submitted';
    }

    // 3. Experience
    const experiences = await txOrDb
      .select({ status: onboardingExperience.status })
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, onboardingId));

    let experienceStatus = 'pending';
    if (experiences.length > 0) {
      experienceStatus = experiences.some((e: any) => e.status === 'resubmitted') ? 'resubmitted' : 'submitted';
    }

    // 4. Bank Details
    const banks = await txOrDb
      .select({ status: onboardingBankDetails.status })
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, onboardingId));

    let bankStatus = 'pending';
    if (banks.length > 0) {
      bankStatus = banks.some((b: any) => b.status === 'resubmitted') ? 'resubmitted' : 'submitted';
    }

    // 5. Documents
    const currentDocs = await txOrDb
      .select({ docType: onboardingDocuments.docType, status: onboardingDocuments.status })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId));

    const allRequiredSubmitted = REQUIRED_DOC_TYPES.every((type) =>
      currentDocs.some((d: any) => d.docType === type && (d.status === 'submitted' || d.status === 'resubmitted'))
    );
    let documentStatus = 'pending';
    if (allRequiredSubmitted) {
      const hasResubmitted = currentDocs.some((d: any) => d.status === 'resubmitted');
      documentStatus = hasResubmitted ? 'resubmitted' : 'submitted';
    }

    await txOrDb
      .update(onboardingRequests)
      .set({
        profileStatus,
        educationStatus,
        experienceStatus,
        bankStatus,
        documentStatus,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));
  }
}
