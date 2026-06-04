// src/modules/hrms/onboarding/onboarding.service.ts

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
  onboardingInduction,
  onboardingActivityLogs,
  type NewOnboardingRequest,
  type NewOnboardingProfile,
  onboardingProfiles,
  onboardingEducation,
  onboardingExperience,
  onboardingBankDetails,
  OnboardingRequest,
} from '@/db/schemas/hrms/onboarding';
import { users } from '@/db/schemas/auth/users.schema';
import { userProfiles } from '@/db/schemas/auth/user-profiles.schema';
import { employeeProfiles } from '@/db/schemas/hrms/employee-profiles.schema';
import { employeeEducation } from '@/db/schemas/hrms/employee-education.schema';
import { employeeExperience } from '@/db/schemas/hrms/employee-experience.schema';
import { employeeDocuments } from '@/db/schemas/hrms/employee-documents.schema';
import { employeeBankDetails } from '@/db/schemas/hrms/employee-bank-details.schema';
import { eq, desc, aliasedTable, inArray, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const EMPLOYEE_DOCS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hrms', 'employee-documents');

const REQUIRED_DOC_TYPES = [
  'Aadhar Card',
  'Graduation Certificate',
  'Resume / CV',
  'Passport Size Photo',
  'Bank Passbook / Cancelled Cheque',
];
import { designations } from '@/db/schemas/master/designations.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { oauthAccounts } from '@/db/schemas';

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

export interface UpdateProfileDto {
  // Employment
  employeeType?: string;
  workLocation?: string;
  dateOfJoining?: string;
  probationMonths?: number;
  probationEndDate?: string;
  // Core HR
  designationId?: number;
  departmentId?: number;
  reportingTl?: number;
  // Compensation
  salaryType?: string;
  basicSalary?: string;
  // Bank
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  // Completion flag
  hrCompleted?: boolean;
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
   * Helper to recalculate the progress of an onboarding request across all three stages.
   * Auto-flips statuses to 'completed' when conditions are met.
   */
  private async recalculateProgress(tx: any, onboardingId: number): Promise<void> {
    // 1. Profile
    const [profile] = await tx
      .select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.onboardingId, onboardingId))
      .orderBy(desc(onboardingProfiles.id))
      .limit(1);
    
    const profileCompleted = (profile?.status === 'submitted' || profile?.status === 'resubmitted') && profile?.hrStatus === 'approved';
    const profileRejected = profile?.hrStatus === 'rejected';
    
    let newProfileStatus: string;
    if (profile?.hrStatus === 'approved') newProfileStatus = 'approved';
    else if (profile?.hrStatus === 'rejected') newProfileStatus = 'rejected';
    else if (profile?.status === 'resubmitted') newProfileStatus = 'resubmitted';
    else if (profile?.status === 'submitted') newProfileStatus = 'submitted';
    else if (profile?.firstName) newProfileStatus = 'in_progress';
    else newProfileStatus = 'pending';

    // 2. Documents
    const docs = await tx
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId));
    
    const docsApproved = docs.length > 0 && docs.every((d: any) => d.hrStatus === 'approved');
    const docsRejected = docs.some((d: any) => d.hrStatus === 'rejected');
    const docsResubmitted = docs.some((d: any) => d.status === 'resubmitted');
    
    let newDocumentStatus: string;
    if (docsApproved) newDocumentStatus = 'approved';
    else if (docsRejected) newDocumentStatus = 'rejected';
    else if (docsResubmitted) newDocumentStatus = 'resubmitted';
    else if (docs.length > 0) newDocumentStatus = 'submitted';
    else newDocumentStatus = 'pending';

    // 3. Education
    const education = await tx
      .select()
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, onboardingId));
    
    const eduApproved = education.length > 0 && education.every((e: any) => e.hrStatus === 'approved');
    const eduRejected = education.some((e: any) => e.hrStatus === 'rejected');
    const eduResubmitted = education.some((e: any) => e.status === 'resubmitted');
    
    let newEducationStatus: string;
    if (eduApproved) newEducationStatus = 'approved';
    else if (eduRejected) newEducationStatus = 'rejected';
    else if (eduResubmitted) newEducationStatus = 'resubmitted';
    else if (education.length > 0) newEducationStatus = 'submitted';
    else newEducationStatus = 'pending';

    // 4. Experience
    const experience = await tx
      .select()
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, onboardingId));
    
    const expApproved = experience.length > 0 && experience.every((e: any) => e.hrStatus === 'approved');
    const expRejected = experience.some((e: any) => e.hrStatus === 'rejected');
    const expResubmitted = experience.some((e: any) => e.status === 'resubmitted');
    
    let newExperienceStatus: string;
    if (expApproved) newExperienceStatus = 'approved';
    else if (expRejected) newExperienceStatus = 'rejected';
    else if (expResubmitted) newExperienceStatus = 'resubmitted';
    else if (experience.length > 0) newExperienceStatus = 'submitted';
    else newExperienceStatus = 'pending';

    // 5. Bank Details
    const bank = await tx
      .select()
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, onboardingId));
    
    const bankApproved = bank.length > 0 && bank.every((b: any) => b.hrStatus === 'approved');
    const bankRejected = bank.some((b: any) => b.hrStatus === 'rejected');
    const bankResubmitted = bank.some((b: any) => b.status === 'resubmitted');
    
    let newBankStatus: string;
    if (bankApproved) newBankStatus = 'approved';
    else if (bankRejected) newBankStatus = 'rejected';
    else if (bankResubmitted) newBankStatus = 'resubmitted';
    else if (bank.length > 0) newBankStatus = 'submitted';
    else newBankStatus = 'pending';

    // 6. Induction
    const tasks = await tx
      .select()
      .from(onboardingInduction)
      .where(eq(onboardingInduction.onboardingId, onboardingId));
      
    const inductionCompleted = tasks.length > 0 && tasks.every((t: any) => t.status === 'completed');
    const newInductionStatus = inductionCompleted ? 'completed' : (tasks.length > 0 ? 'in_progress' : 'pending');

    // 7. Progress %
    let progress = 0;
    if (profileCompleted) progress += 20;
    if (docsApproved) progress += 20;
    if (eduApproved) progress += 20;
    if (expApproved) progress += 20;
    if (bankApproved) progress += 20;
    
    await tx
      .update(onboardingRequests)
      .set({
        profileStatus: newProfileStatus,
        documentStatus: newDocumentStatus,
        educationStatus: newEducationStatus,
        experienceStatus: newExperienceStatus,
        bankStatus: newBankStatus,
        inductionStatus: newInductionStatus,
        progress: Math.floor(progress),
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));

    const allDone = profileCompleted && docsApproved && eduApproved && expApproved && bankApproved && inductionCompleted;
    if (allDone) {
      const [req] = await tx.select({ requestType: onboardingRequests.requestType, userId: onboardingRequests.userId })
        .from(onboardingRequests).where(eq(onboardingRequests.id, onboardingId)).limit(1);
      
      if (req?.requestType === 're_onboarding' && req.userId) {
        await this.completeReOnboarding(onboardingId, 0, tx); // 0 = system-triggered
      }
    }
  }

  /**
   * Helper to seed default induction tasks for an onboarding request.
   */
  private async seedInductionTasks(tx: any, onboardingId: number): Promise<void> {
    const defaultTasks = [
      ...['Documents collection form completed', 'DISC form completed', 'Workstation identified', 
        'Email ID created', 'Employee added to systems', 'Visiting card ordered', 'ID card ordered']
        .map(t => ({ onboardingId, taskName: t, taskType: 'BEFORE', status: 'pending' })),
      ...['HR policy training completed', 'Leave policy training completed', 'Attendance training completed', 
        'Laptop allotted', 'Office tour completed', 'Reporting manager introduction completed', 
        'PF initiation (if applicable)', 'Candidate profile shared', 'Buddy assigned', 'Training needs identified', 
        'Welcome session completed', 'Employee database updated', 'PF office updated', 'ID / Visiting card provided', 
        'Welcome kit arranged']
        .map(t => ({ onboardingId, taskName: t, taskType: 'AFTER', status: 'pending' }))
    ];

    await tx.insert(onboardingInduction).values(defaultTasks as any);
  }

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

  async initializeEmployeeOnboarding(userId: number, adminId: number): Promise<{ onboardingId: number }> {
    return this.db.transaction(async (tx) => {
      // 1. Fetch user
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new NotFoundException('User not found');

      // Guard condition
      const [userProfile] = await tx.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      if (userProfile?.profileCompleted) {
        throw new ConflictException('Profile already completed');
      }

      // Check for active re_onboarding requests to avoid duplicates
      const existingReqs = await tx.select()
        .from(onboardingRequests)
        .where(eq(onboardingRequests.userId, userId))
        .orderBy(desc(onboardingRequests.createdAt))
        .limit(1);
        
      if (existingReqs.length > 0 && existingReqs[0].status !== 'fully_completed') {
        return { onboardingId: existingReqs[0].id };
      }

      const [employeeProfile] = await tx.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId)).limit(1);

      // INSERT onboardingRequests
      const [request] = await tx.insert(onboardingRequests).values({
        userId,
        name: user.name,
        email: user.email as string,
        phone: user.mobile || null,
        status: 'approved',
        requestType: 're_onboarding',
        approvedBy: adminId,
        approvedAt: new Date(),
        profileStatus: 'in_progress',
        documentStatus: 'pending',
        inductionStatus: 'pending',
      } as any).returning();

      // INSERT onboardingProfiles
      const currentAddress = (userProfile?.currentAddress as any) || {};
      const permanentAddress = (userProfile?.permanentAddress as any) || {};
      const emergencyContact = (userProfile?.emergencyContact as any) || {};

      await tx.insert(onboardingProfiles).values({
        onboardingId: request.id,
        firstName: userProfile?.firstName || user.name.split(' ')[0],
        middleName: userProfile?.middleName || null,
        lastName: userProfile?.lastName || user.name.split(' ').slice(1).join(' ') || null,
        dob: userProfile?.dateOfBirth || null,
        gender: userProfile?.gender || null,
        maritalStatus: userProfile?.maritalStatus || null,
        nationality: userProfile?.nationality || null,
        email: userProfile?.altEmail || user.email,
        phone: userProfile?.phone || user.mobile || null,
        aadharNumber: userProfile?.aadharNumber || null,
        panNumber: userProfile?.panNumber || null,
        bloodGroup: userProfile?.bloodGroup || null,
        linkedinProfile: userProfile?.linkedinProfile || null,
        currentAddress,
        permanentAddress,
        emergencyContact,

        employeeType: employeeProfile?.employeeType || null,
        workLocation: employeeProfile?.workLocation || null,
        designationId: userProfile?.designationId || null,
        departmentId: userProfile?.primaryTeamId || null,
        reportingTl: employeeProfile?.reportingTl || null,
        probationMonths: employeeProfile?.probationMonths || null,
        probationEndDate: employeeProfile?.probationEndDate || null,
        salaryType: employeeProfile?.salaryType || null,
        basicSalary: employeeProfile?.basicSalary || null,

        employeeCompleted: false,
        hrCompleted: false,
      } as any);

      // Education
      const eduRows = await tx.select().from(employeeEducation).where(eq(employeeEducation.userId, userId));
      if (eduRows.length > 0) {
        await tx.insert(onboardingEducation).values(
          eduRows.map(e => ({
            onboardingId: request.id,
            degree: e.degree,
            institution: e.institution,
            fieldOfStudy: e.fieldOfStudy,
            yearOfCompletion: e.yearOfCompletion,
            grade: e.grade,
            status: 'pending',
          })) as any
        );
      }

      // Experience
      const expRows = await tx.select().from(employeeExperience).where(eq(employeeExperience.userId, userId));
      if (expRows.length > 0) {
        await tx.insert(onboardingExperience).values(
          expRows.map(e => ({
            onboardingId: request.id,
            companyName: e.companyName,
            designation: e.designation,
            fromDate: e.fromDate,
            toDate: e.toDate,
            currentlyWorking: e.currentlyWorking,
            responsibilities: e.responsibilities,
            status: 'pending',
          })) as any
        );
      }

      // Bank Details
      const bankRows = await tx.select().from(employeeBankDetails).where(eq(employeeBankDetails.userId, userId));
      if (bankRows.length > 0) {
        await tx.insert(onboardingBankDetails).values(
          bankRows.map(b => ({
            onboardingId: request.id,
            bankName: b.bankName,
            accountHolderName: b.accountHolderName,
            accountNumber: b.accountNumber,
            ifscCode: b.ifscCode,
            branchName: b.branchName,
            branchAddress: b.branchAddress,
            upiId: b.upiId,
            isPrimary: b.isPrimary,
            status: 'pending',
          })) as any
        );
      }

      // Documents
      const docRows = await tx.select().from(employeeDocuments).where(eq(employeeDocuments.userId, userId));
      if (docRows.length > 0) {
        await tx.insert(onboardingDocuments).values(
          docRows.map(d => ({
            onboardingId: request.id,
            docCategory: d.docCategory,
            docType: d.docType,
            docNumber: d.docNumber,
            fileUrl: d.fileUrl,
            issueDate: d.issueDate,
            expiryDate: d.expiryDate,
            status: d.verificationStatus,
            verifiedBy: d.verifiedBy,
            verificationDate: d.verificationDate,
            remarks: d.remarks,
          })) as any
        );
      }

      await this.seedInductionTasks(tx, request.id);

      await tx.insert(onboardingActivityLogs).values({
        onboardingId: request.id,
        action: 'RE_ONBOARDING_INITIATED',
        performedBy: adminId,
      });

      return { onboardingId: request.id };
    });
  }

  async bulkInitializeOnboarding(adminId: number) {
    const allUsers = await this.db.select({ id: users.id }).from(users);
    
    let created = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const u of allUsers) {
      try {
        await this.initializeEmployeeOnboarding(u.id, adminId);
        created++;
      } catch (err: any) {
        if (err instanceof ConflictException) {
          skipped++;
        } else {
          errors.push({ userId: u.id, error: err.message });
        }
      }
    }

    return { total: allUsers.length, created, skipped, errors };
  }

  async completeReOnboarding(onboardingId: number, adminId: number, existingTx?: any) {
    const doWork = async (tx: any) => {
      const [req] = await tx.select().from(onboardingRequests).where(eq(onboardingRequests.id, onboardingId)).limit(1);
      if (!req || req.requestType !== 're_onboarding' || !req.userId) {
        throw new BadRequestException('Invalid re-onboarding request');
      }
      const userId = req.userId;

      const [obProfile] = await tx.select().from(onboardingProfiles).where(eq(onboardingProfiles.onboardingId, onboardingId)).limit(1);
      if (!obProfile) throw new BadRequestException('Profile missing');

      const obEdu = await tx.select().from(onboardingEducation).where(eq(onboardingEducation.onboardingId, onboardingId));
      const obExp = await tx.select().from(onboardingExperience).where(eq(onboardingExperience.onboardingId, onboardingId));
      const obBank = await tx.select().from(onboardingBankDetails).where(eq(onboardingBankDetails.onboardingId, onboardingId));
      const obDocs = await tx.select().from(onboardingDocuments).where(eq(onboardingDocuments.onboardingId, onboardingId));

      // UPSERT user_profiles
      const [existingProfile] = await tx.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      const profileData = {
        firstName: obProfile.firstName,
        middleName: obProfile.middleName,
        lastName: obProfile.lastName,
        dateOfBirth: obProfile.dob,
        gender: obProfile.gender,
        maritalStatus: obProfile.maritalStatus,
        nationality: obProfile.nationality,
        phone: obProfile.phone,
        aadharNumber: obProfile.aadharNumber,
        panNumber: obProfile.panNumber,
        bloodGroup: obProfile.bloodGroup,
        linkedinProfile: obProfile.linkedinProfile,
        currentAddress: obProfile.currentAddress,
        permanentAddress: obProfile.permanentAddress,
        emergencyContact: obProfile.emergencyContact,
        profileCompleted: true,
        updatedAt: new Date(),
      };

      if (existingProfile) {
        await tx.update(userProfiles).set(profileData).where(eq(userProfiles.userId, userId));
      } else {
        await tx.insert(userProfiles).values({ userId, ...profileData } as any);
      }

      // UPDATE employee_profiles
      const [existingEmp] = await tx.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId)).limit(1);
      const empData = {
        employeeType: obProfile.employeeType,
        workLocation: obProfile.workLocation,
        probationMonths: obProfile.probationMonths,
        probationEndDate: obProfile.probationEndDate,
        salaryType: obProfile.salaryType,
        basicSalary: obProfile.basicSalary,
      };

      if (existingEmp) {
        await tx.update(employeeProfiles).set(empData).where(eq(employeeProfiles.userId, userId));
      } else {
        await tx.insert(employeeProfiles).values({ userId, ...empData } as any);
      }

      // Education Full Replace
      await tx.delete(employeeEducation).where(eq(employeeEducation.userId, userId));
      if (obEdu.length > 0) {
        await tx.insert(employeeEducation).values(obEdu.map(e => ({
          userId,
          degree: e.degree,
          institution: e.institution,
          fieldOfStudy: e.fieldOfStudy,
          yearOfCompletion: e.yearOfCompletion,
          grade: e.grade,
        })) as any);
      }

      // Experience Full Replace
      await tx.delete(employeeExperience).where(eq(employeeExperience.userId, userId));
      if (obExp.length > 0) {
        await tx.insert(employeeExperience).values(obExp.map(e => ({
          userId,
          companyName: e.companyName,
          designation: e.designation,
          fromDate: e.fromDate,
          toDate: e.toDate,
          currentlyWorking: e.currentlyWorking,
          responsibilities: e.responsibilities,
        })) as any);
      }

      // Bank Details Full Replace
      await tx.delete(employeeBankDetails).where(eq(employeeBankDetails.userId, userId));
      if (obBank.length > 0) {
        await tx.insert(employeeBankDetails).values(obBank.map(b => ({
          userId,
          bankName: b.bankName,
          accountHolderName: b.accountHolderName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          branchName: b.branchName,
          branchAddress: b.branchAddress,
          upiId: b.upiId,
          isPrimary: b.isPrimary,
        })) as any);
      }

      // Documents Full Replace
      await tx.delete(employeeDocuments).where(eq(employeeDocuments.userId, userId));
      if (obDocs.length > 0) {
        await tx.insert(employeeDocuments).values(obDocs.map(d => ({
          userId,
          docCategory: d.docCategory,
          docType: d.docType,
          docNumber: d.docNumber,
          fileUrl: d.fileUrl,
          issueDate: d.issueDate,
          expiryDate: d.expiryDate,
          verificationStatus: d.status,
          verifiedBy: d.verifiedBy,
          verificationDate: d.verificationDate,
          remarks: d.remarks,
        })) as any);
      }

      await tx.update(onboardingRequests)
        .set({ status: 'fully_completed', updatedAt: new Date() })
        .where(eq(onboardingRequests.id, onboardingId));

      await tx.insert(onboardingActivityLogs).values({
        onboardingId,
        action: 'RE_ONBOARDING_COMPLETED',
        performedBy: adminId,
      });
    };

    if (existingTx) {
      await doWork(existingTx);
    } else {
      await this.db.transaction(doWork);
    }
  }

  //writing the function to get the profile submission status progress
  async findSubmissionProgress(onboardingRequest : OnboardingRequest) {
    // we need to calculate the total progress of each request
    const statuses = [
      onboardingRequest?.profileStatus,
      onboardingRequest?.documentStatus,
      onboardingRequest?.educationStatus,
      onboardingRequest?.experienceStatus,
      onboardingRequest?.bankStatus,
      onboardingRequest?.inductionStatus,
    ];

    // Filter out undefined/null statuses to handle optional fields safely
    const validStatuses = statuses.filter((s) => s !== undefined && s !== null);
    if (validStatuses.length === 0) return 0;

    // A detail is considered submitted if the status is not 'pending'
    const submittedCount = validStatuses.filter((s) => s == 'submitted').length;
    
    // If all details are submitted, progress is 100%
    const progress = Math.round((submittedCount / validStatuses.length) * 100);

    return progress;
  }

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
          userId : onboardingRequests.userId,
          email: onboardingRequests.email,
          phone: onboardingRequests.phone,
          status: onboardingRequests.status,
          profileStatus: onboardingRequests.profileStatus,
          documentStatus: onboardingRequests.documentStatus,
          educationStatus: onboardingRequests.educationStatus,
          experienceStatus: onboardingRequests.experienceStatus,
          bankStatus: onboardingRequests.bankStatus,
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

      if (rows.length === 0) {
        return [];
      }

      const requestIds = rows.map((r) => r.id);
      const userIds = rows.map((r) => r.userId).filter(Boolean) as number[];

      const [profiles, documents, education, experience, bankDetails, induction, oauthAccs] = await Promise.all([
        this.db.select().from(onboardingProfiles).where(inArray(onboardingProfiles.onboardingId, requestIds)),
        this.db.select().from(onboardingDocuments).where(inArray(onboardingDocuments.onboardingId, requestIds)),
        this.db.select().from(onboardingEducation).where(inArray(onboardingEducation.onboardingId, requestIds)),
        this.db.select().from(onboardingExperience).where(inArray(onboardingExperience.onboardingId, requestIds)),
        this.db.select().from(onboardingBankDetails).where(inArray(onboardingBankDetails.onboardingId, requestIds)),
        this.db.select().from(onboardingInduction).where(inArray(onboardingInduction.onboardingId, requestIds)),
        userIds.length > 0 ? this.db.select().from(oauthAccounts).where(inArray(oauthAccounts.userId, userIds)) : Promise.resolve([] as any[]),
      ]);


      const calculateHrStatus = (items: any[]) => {
        if (!items || items.length === 0) return 'pending';
        if (items.some((i) => i.hrStatus === 'rejected')) return 'rejected';
        if (items.every((i) => i.hrStatus === 'approved')) return 'approved';
        return 'pending';
      };

      const calculateHrRate = (items: any[]) => {
        if (!items || items.length === 0) return { text: '0/0', percentage: 0 };
        const approvedCount = items.filter((i) => i.hrStatus === 'approved').length;
        const totalPercentage = Math.round((approvedCount / items.length) * 100);
        return { text: `${approvedCount}/${items.length}`, percentage: totalPercentage };
      };

      // Induction uses 'status' instead of 'hrStatus'
      const calculateInductionHrStatus = (items: any[]) => {
        if (!items || items.length === 0) return 'pending';
        if (items.every((i) => i.status === 'completed')) return 'approved';
        return 'pending';
      };

      const calculateInductionRate = (items: any[]) => {
        if (!items || items.length === 0) return { text: '0/0', percentage: 0 };
        const completedCount = items.filter((i) => i.status === 'completed').length;
        const totalPercentage = Math.round((completedCount / items.length) * 100);
        return { text: `${completedCount}/${items.length}`, percentage: totalPercentage };
      };

      const enrichedRows = rows.map((row) => {
        // 1. Filter child items for this row
        const rowProfile = profiles.find((p) => p.onboardingId === row.id) || null;
        const rowDocs = documents.filter((d) => d.onboardingId === row.id);
        const rowEdu = education.filter((e) => e.onboardingId === row.id);
        const rowExp = experience.filter((e) => e.onboardingId === row.id);
        const rowBank = bankDetails.filter((b) => b.onboardingId === row.id);
        const rowInduction = induction.filter((i) => i.onboardingId === row.id);

        // 2. Employee Progress %
        // We look at the 5 main statuses tracked on the base request
        const statuses = [
          row.profileStatus,
          row.documentStatus,
          row.educationStatus,
          row.experienceStatus,
          row.bankStatus,
          // row.inductionStatus,
        ];

        const submittedCount = statuses.filter((s) => s == 'submitted').length;
        const employeeProgressPercent = Math.round((submittedCount / statuses.length) * 100);

        // 3. HR Progress Calculations
        let profileHrStatus = 'pending';
        let profileHrRate = { text: '0/0', percentage: 0 };
        if (rowProfile) {
          if (rowProfile.hrStatus === 'rejected') profileHrStatus = 'rejected';
          else if (rowProfile.hrStatus === 'approved') {
            profileHrStatus = 'approved';
            profileHrRate = { text: '1/1', percentage: 100 };
          } else {
            profileHrRate = { text: '0/1', percentage: 0 };
          }
        }

        const oauthPhoto = oauthAccs.find((o) => o.userId === row.userId)?.avatar;
        const docProfilePhoto = rowDocs.find((d) => d.docType === 'Passport Size Photo')?.fileUrl;
        const profilePhoto = docProfilePhoto || oauthPhoto || null;

        return {
          ...row,
          progress: row.progress === 'pending' || !row.progress ? 0 : Number(row.progress) || 0,
          employeeProgress: employeeProgressPercent,
          profilePhoto : profilePhoto,

          // The raw arrays/objects so the frontend can display remarks/details
          profile: rowProfile,
          documents: rowDocs,
          education: rowEdu,
          experience: rowExp,
          bankDetails: rowBank,
          // induction: rowInduction,

          // Aggregated top-level statuses (rejected if one rejected, etc.)
          hrStatuses: {
            profile: profileHrStatus,
            documents: calculateHrStatus(rowDocs),
            education: calculateHrStatus(rowEdu),
            experience: calculateHrStatus(rowExp),
            bankDetails: calculateHrStatus(rowBank),
            induction: calculateInductionHrStatus(rowInduction),
          },

          // HR Approval fractions & percentages
          hrRates: {
            profile: profileHrRate,
            documents: calculateHrRate(rowDocs),
            education: calculateHrRate(rowEdu),
            experience: calculateHrRate(rowExp),
            bankDetails: calculateHrRate(rowBank),
            induction: calculateInductionRate(rowInduction),
          },
        };
      });

      return enrichedRows;
    } catch (err) {
      this.logger.error('OnboardingService.findAll failed', { err });
      throw err;
    }
  }

  /**
   * GET /hrms/onboarding/profiles
   * All approved onboarding requests joined with their profile data.
   * Used by the Profile Details tracker dashboard.
   */
  async getProfileList(): Promise<any[]> {
    const rows = await this.db
      .select({
        id: onboardingRequests.id,
        name: onboardingRequests.name,
        email: onboardingRequests.email,
        phone: onboardingRequests.phone,
        profileStatus: onboardingRequests.profileStatus,
        progress: onboardingRequests.progress,
        approvedAt: onboardingRequests.approvedAt,
        updatedAt: onboardingRequests.updatedAt,
        // Profile HR fields
        employeeType: onboardingProfiles.employeeType,
        workLocation: onboardingProfiles.workLocation,
        dateOfJoining: onboardingProfiles.dateOfJoining,
        salaryType: onboardingProfiles.salaryType,
        basicSalary: onboardingProfiles.basicSalary,
        hrCompleted: onboardingProfiles.hrCompleted,
        employeeCompleted: onboardingProfiles.employeeCompleted,
        // Employee personal fields
        firstName: onboardingProfiles.firstName,
        lastName: onboardingProfiles.lastName,
        // Reviewer name (who approved)
        reviewedBy: users.name,
      })
      .from(onboardingRequests)
      .innerJoin(onboardingProfiles, eq(onboardingProfiles.onboardingId, onboardingRequests.id))
      .leftJoin(users, eq(onboardingRequests.approvedBy, users.id))
      .where(eq(onboardingRequests.status, 'approved'))
      .orderBy(desc(onboardingRequests.approvedAt));

    return rows;
  }

  /**
   * GET /hrms/onboarding/:id/profile
   * Full profile for a single onboarding request.
   */
  async getProfile(id: number): Promise<any> {
    const reportingTl = aliasedTable(users, 'reportingTl');

    const [profileRow] = await this.db
      .select({
        profile: onboardingProfiles,
        designationName: designations.name,
        departmentName: teams.name,
        reportingTlName: reportingTl.name,
      })
      .from(onboardingProfiles)
      .leftJoin(designations, eq(onboardingProfiles.designationId, designations.id))
      .leftJoin(teams, eq(onboardingProfiles.departmentId, teams.id))
      .leftJoin(reportingTl, eq(onboardingProfiles.reportingTl, reportingTl.id))
      .where(eq(onboardingProfiles.onboardingId, id))
      .limit(1);

    if (!profileRow) throw new NotFoundException(`Profile not found for onboarding #${id}`);

    const [request] = await this.db
      .select({
        name: onboardingRequests.name,
        email: onboardingRequests.email,
        phone: onboardingRequests.phone,
        status: onboardingRequests.status,
        profileStatus: onboardingRequests.profileStatus,
        documentStatus: onboardingRequests.documentStatus,
        educationStatus: onboardingRequests.educationStatus,
        experienceStatus: onboardingRequests.experienceStatus,
        bankStatus: onboardingRequests.bankStatus,
        inductionStatus: onboardingRequests.inductionStatus,
        progress: onboardingRequests.progress,
        approvedAt: onboardingRequests.approvedAt,
        reviewedBy: users.name,
      })
      .from(onboardingRequests)
      .leftJoin(users, eq(onboardingRequests.approvedBy, users.id))
      .where(eq(onboardingRequests.id, id))
      .limit(1);

    const education = await this.db
      .select()
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, id))
      .orderBy(desc(onboardingEducation.id));

    const experience = await this.db
      .select()
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, id))
      .orderBy(desc(onboardingExperience.id));

    const bankDetails = await this.db
      .select()
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, id))
      .orderBy(desc(onboardingBankDetails.id));

    const documents = await this.db
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, id))
      .orderBy(desc(onboardingDocuments.id));

    return {
      ...profileRow.profile,
      ...request,
      designation: profileRow.designationName,
      department: profileRow.departmentName,
      reportingTl: profileRow.reportingTlName,
      education,
      experience,
      bankDetails,
      documents: documents.map(d => ({
        ...d,
        fileName: d.fileUrl ? d.fileUrl.split('/').pop() : null,
      })),
      onboardingId: id,
    };
  }

  /**
   * PATCH /hrms/onboarding/:id/profile
   * HR fills employment, compensation, and bank details.
   * Automatically updates profileStatus on the request row.
   */
  async updateProfile(id: number, dto: UpdateProfileDto, adminId: number): Promise<any> {
    return this.db.transaction(async (tx) => {
      // Update the profile row
      const [updated] = await tx
        .update(onboardingProfiles)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(onboardingProfiles.onboardingId, id))
        .returning();

      if (!updated) throw new NotFoundException(`Profile not found for onboarding #${id}`);

      // We rely on recalculateProgress to handle the progress % and status changes
      await this.recalculateProgress(tx, id);

      // Log the action
      await tx.insert(onboardingActivityLogs).values({
        onboardingId: id,
        action: 'PROFILE_UPDATED',
        performedBy: adminId,
        metadata: { fields: Object.keys(dto), hrCompleted: dto.hrCompleted ?? false },
      });

      return updated;
    });
  }

  /**
   * GET /hrms/onboarding/documents
   * All approved onboarding requests with their profile basic info and all fetched documents.
   * Grouped and returned as EmployeeDocRecord[] for tracker.
   */
  async getDocumentTrackerList(): Promise<any[]> {
    const rows = await this.db
      .select({
        id: onboardingRequests.id,
        name: onboardingRequests.name,
        email: onboardingRequests.email,
        documentStatus: onboardingRequests.documentStatus,
        progress: onboardingRequests.progress,
        firstName: onboardingProfiles.firstName,
        lastName: onboardingProfiles.lastName,
        designation: onboardingProfiles.employeeType, // Sticking to basic profile fields as designation proxy
        department: onboardingProfiles.departmentId, 
        dateOfJoining: onboardingProfiles.dateOfJoining,
      })
      .from(onboardingRequests)
      .leftJoin(onboardingProfiles, eq(onboardingProfiles.onboardingId, onboardingRequests.id))
      .where(eq(onboardingRequests.status, 'approved'))
      .orderBy(desc(onboardingRequests.approvedAt));

    const docRows = await this.db
      .select()
      .from(onboardingDocuments);

    const docsByEmpId = docRows.reduce((acc, doc) => {
      const eId = doc.onboardingId;
      if (!acc[eId]) acc[eId] = [];
      acc[eId].push({
        id: doc.id.toString(),
        name: doc.docType || 'Unknown Document',
        category: doc.docCategory || 'other',
        required: true, // Assuming true for now or driven by dictionary
        status: doc.status,
        uploadedAt: doc.createdAt?.toISOString(),
        verifiedBy: doc.verifiedBy?.toString(),
        verifiedAt: doc.verificationDate,
        rejectedReason: doc.hrRemark,
        fileName: doc.fileUrl ? doc.fileUrl.split('/').pop() : 'document.pdf',
        fileSize: '1.2 MB', // Dummy
        fileType: 'application/pdf',
      });
      return acc;
    }, {} as Record<number, any[]>);

    return rows.map((r) => ({
      ...r,
      employeeId: `EMP-${r.id.toString().padStart(4, '0')}`,
      documents: docsByEmpId[r.id] || [],
    }));
  }

  /**
   * GET /hrms/onboarding/:id/documents
   */
  async getEmployeeDocuments(onboardingId: number): Promise<any[]> {
    const docRows = await this.db
      .select({
        id: onboardingDocuments.id,
        docType: onboardingDocuments.docType,
        docCategory: onboardingDocuments.docCategory,
        status: onboardingDocuments.status,
        hrStatus: onboardingDocuments.hrStatus,
        createdAt: onboardingDocuments.createdAt,
        verifiedBy: users.name,
        verificationDate: onboardingDocuments.verificationDate,
        hrRemark: onboardingDocuments.hrRemark,
        fileUrl: onboardingDocuments.fileUrl,
      })
      .from(onboardingDocuments)
      .leftJoin(users, eq(onboardingDocuments.verifiedBy, users.id))
      .where(eq(onboardingDocuments.onboardingId, onboardingId));

    // Remap to frontend expected format
    return docRows.map(doc => ({
      id: doc.id.toString(),
      name: doc.docType || 'Unknown Document',
      category: doc.docCategory || 'other',
      required: true,
      status: doc.status,
      hrStatus: doc.hrStatus === 'verified' ? 'approved' : doc.hrStatus,
      uploadedAt: doc.createdAt?.toISOString(),
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verificationDate,
      rejectedReason: doc.hrRemark,
      hrRemark: doc.hrRemark,
      fileName: doc.fileUrl ? doc.fileUrl.split('/').pop() : 'document.pdf',
      fileSize: '2.4 MB',
      fileType: 'application/pdf',
      fileUrl: doc.fileUrl,
    }));
  }


  // ─── Induction Endpoints ──────────────────────────────────────────────────

  /**
   * GET /hrms/onboarding/induction-tracker
   */
  async getInductionTrackerList(): Promise<any[]> {
    const rows = await this.db
      .select({
        id: onboardingRequests.id,
        email: onboardingRequests.email,
        inductionStatus: onboardingRequests.inductionStatus,
        progress: onboardingRequests.progress,
        approvedAt: onboardingRequests.approvedAt,
        firstName: onboardingProfiles.firstName,
        lastName: onboardingProfiles.lastName,
        middleName: onboardingProfiles.middleName,
        designation: onboardingProfiles.employeeType,
        department: onboardingProfiles.departmentId, 
        dateOfJoining: onboardingProfiles.dateOfJoining,
      })
      .from(onboardingRequests)
      .leftJoin(onboardingProfiles, eq(onboardingProfiles.onboardingId, onboardingRequests.id))
      .where(eq(onboardingRequests.status, 'approved'))
      .orderBy(desc(onboardingRequests.approvedAt));

    const taskRows = await this.db
      .select()
      .from(onboardingInduction);

    const tasksByEmpId = taskRows.reduce((acc, task) => {
      const eId = task.onboardingId;
      if (!acc[eId]) acc[eId] = [];
      acc[eId].push({
        id: task.id.toString(),
        name: task.taskName || 'Unknown Task',
        phase: task.taskType === 'AFTER' ? 'after_joining' : 'before_joining',
        assignedTo: 'HR', // Simplified for now since assignedTo is bigint in DB
        required: true,
        status: task.status || 'pending',
        completedAt: task.completedAt?.toISOString(),
        remarks: task.remarks,
      });
      return acc;
    }, {} as Record<number, any[]>);

    return rows.map((r) => ({
      ...r,
      employeeId: `EMP-${r.id.toString().padStart(4, '0')}`,
      tasks: tasksByEmpId[r.id] || [],
      inductionCoordinator: 'System Admin',
    }));
  }

  /**
   * GET /hrms/onboarding/:id/induction
   */
  async getEmployeeInduction(onboardingId: number): Promise<any[]> {
    const taskRows = await this.db
      .select({
        id: onboardingInduction.id,
        taskName: onboardingInduction.taskName,
        taskType: onboardingInduction.taskType,
        assignedTo: onboardingInduction.assignedTo,
        status: onboardingInduction.status,
        completedAt: onboardingInduction.completedAt,
        remarks: onboardingInduction.remarks,
        completedBy: users.name,
      })
      .from(onboardingInduction)
      .leftJoin(users, eq(onboardingInduction.assignedTo, users.id))
      .where(eq(onboardingInduction.onboardingId, onboardingId));

    return taskRows.map(task => ({
      id: task.id.toString(),
      name: task.taskName || 'Unknown Task',
      phase: task.taskType === 'AFTER' ? 'after_joining' : 'before_joining',
      assignedTo: 'HR', // Simplified or logic based on role
      required: true,
      status: task.status || 'pending',
      completedAt: task.completedAt?.toISOString(),
      completedBy: task.completedBy,
      remarks: task.remarks,
    }));
  }

  /**
   * PATCH /hrms/onboarding/:id/induction/:taskId
   */
  async updateInductionTask(onboardingId: number, taskId: number, updates: { status?: string; remarks?: string }, adminId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const updateData: any = { updatedAt: new Date() };

      if (updates.status) {
        updateData.status = updates.status;
        if (updates.status === 'completed') {
          updateData.completedAt = new Date();
          updateData.assignedTo = adminId;
        } else {
          updateData.completedAt = null;
        }
      }

      if (updates.remarks !== undefined) {
        updateData.remarks = updates.remarks;
      }

      await tx
        .update(onboardingInduction)
        .set(updateData)
        .where(eq(onboardingInduction.id, taskId));

      await tx.insert(onboardingActivityLogs).values({
        onboardingId,
        action: `INDUCTION_TASK_UPDATED`,
        performedBy: adminId,
        metadata: { taskId, updates },
      });
      
      await this.recalculateProgress(tx, onboardingId);
    });
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

      // ── 1. Create User and Seed Tasks if Approved ────────────────────────
      let newUserId: number | null = null;
      
      if (dto.status === 'approved') {
        if ((request as any).requestType === 're_onboarding') {
          // User already exists — just seed tasks
          await this.seedInductionTasks(tx, id);
          // userId is already set on the request — no need to update it
        } else {
          const [onProf] = await tx
            .select()
            .from(onboardingProfiles)
            .where(eq(onboardingProfiles.onboardingId, id))
            .limit(1);

          if (onProf) {
            // Generate a temporary password
            const tempPassword = crypto.randomBytes(8).toString('hex');

            // Hash using Argon2
            const hashedPassword = await argon2.hash(tempPassword, {
              type: argon2.argon2id, // recommended variant
              memoryCost: 2 ** 16,   // 64 MB
              timeCost: 3,           // iterations
              parallelism: 1,        // threads
            });

            const fullName = [onProf.firstName, onProf.middleName, onProf.lastName].filter(Boolean).join(' ');
            const baseUsername = onProf.email?.split('@')[0] || `user${Date.now()}`;
            const username = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;

            this.logger.info(`Generated temporary password for ${onProf.email}: ${tempPassword}`);

            // Insert into Users schema
            const [newUser] = await tx
              .insert(users)
              .values({
                name: fullName,
                username: username,
                email: onProf.email as string,
                mobile: onProf.phone,
                password: hashedPassword,
                isActive: true, // Login enabled immediately per requirements
                createdAt: new Date(),
              })
              .returning({ id: users.id });
              
            newUserId = newUser.id;

            // Seed default induction tasks
            await this.seedInductionTasks(tx, id);
          }
        }
      }

      // ── 2. Update Request Status ─────────────────────────────────────────
      const updateData: any = {
        status: dto.status,
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (newUserId) {
        updateData.userId = newUserId;
      }

      const [updated] = await tx
        .update(onboardingRequests)
        .set(updateData)
        .where(eq(onboardingRequests.id, id))
        .returning();

      // ── 3. Log the HR action ─────────────────────────────────────────────
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

  // ─── Per-Section HR Approval ───────────────────────────────────────────────

  async approveProfileSection(id: number, hrStatus: 'approved' | 'rejected', hrRemark: string, adminId: number) {
    return this.db.transaction(async (tx) => {
      const [latestProfile] = await tx.select().from(onboardingProfiles)
        .where(eq(onboardingProfiles.onboardingId, id))
        .orderBy(desc(onboardingProfiles.id))
        .limit(1);

      if (!latestProfile) throw new NotFoundException('Profile record not found');

      await tx.update(onboardingProfiles).set({
        hrStatus,
        hrRemark,
        hrCompleted: hrStatus === 'approved',
        updatedAt: new Date(),
      }).where(eq(onboardingProfiles.id, latestProfile.id));

      if (hrStatus === 'approved') {
        const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);
        if (req?.userId) {
          await this.syncProfileToEmployee(tx, req.userId, latestProfile);
        }
      }

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
  }

  async approveEducationRecord(id: number, eduId: number, hrStatus: 'approved' | 'rejected', adminId: number, hrRemark?: string, ) {
    return this.db.transaction(async (tx) => {
      const [edu] = await tx.select().from(onboardingEducation).where(eq(onboardingEducation.id, eduId)).limit(1);
      if (!edu) throw new NotFoundException('Education record not found');

      await tx.update(onboardingEducation).set({
        hrStatus,
        hrRemark,
        updatedAt: new Date(),
      }).where(eq(onboardingEducation.id, eduId));

      const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);
      
      if (hrStatus === 'approved') {
        if (req?.userId) {
          await this.syncEducationToEmployee(tx, req.userId, edu);
        }
      }

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
  }

  async approveExperienceRecord(id: number, expId: number, hrStatus: 'approved' | 'rejected', hrRemark: string, adminId: number) {
    return this.db.transaction(async (tx) => {
      const [exp] = await tx.select().from(onboardingExperience).where(eq(onboardingExperience.id, expId)).limit(1);
      if (!exp) throw new NotFoundException('Experience record not found');

      await tx.update(onboardingExperience).set({
        hrStatus,
        hrRemark,
        updatedAt: new Date(),
      }).where(eq(onboardingExperience.id, expId));

      const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);

      await this.updateOnboardingRequestStatus(id, hrStatus, tx);

      if (hrStatus === 'approved') {
        if (req?.userId) {
          await this.syncExperienceToEmployee(tx, req.userId, exp);
        }
      }

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
  }

  async approveBankRecord(id: number, bankId: number, hrStatus: 'approved' | 'rejected', hrRemark: string, adminId: number) {
    return this.db.transaction(async (tx) => {
      const [bank] = await tx.select().from(onboardingBankDetails).where(eq(onboardingBankDetails.id, bankId)).limit(1);
      if (!bank) throw new NotFoundException('Bank record not found');

      await tx.update(onboardingBankDetails).set({
        hrStatus,
        hrRemark,
        updatedAt: new Date(),
      }).where(eq(onboardingBankDetails.id, bankId));

      await this.updateOnboardingRequestStatus(id, hrStatus, tx);

      if (hrStatus === 'approved') {
        const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);
        if (req?.userId) {
          await this.syncBankToEmployee(tx, req.userId, bank);
        }
      }

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
  }


  async verifyDocument(id: number, docId: number, status: string, reason: string | undefined, adminId: number) {
    return this.db.transaction(async (tx) => {
      await tx.update(onboardingDocuments).set({
        status: status === 'verified' ? 'submitted' : 'pending', // map internal status
        hrStatus: status,
        hrRemark: reason || null,
        verifiedBy: adminId,
        verificationDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      }).where(eq(onboardingDocuments.id, docId));

      await this.updateOnboardingRequestStatus(id, status, tx);

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
  }

  private async updateOnboardingRequestStatus(requestId : number, status: string, tx: typeof this.db){
          //updating the request status
      await tx.update(onboardingRequests)
            .set({
              status: status
            })
            .where(eq(onboardingRequests.id, requestId));
  }

  // ─── Data Sync Helpers (Onboarding -> Employee) ──────────────────────────────

  private async syncProfileToEmployee(tx: any, userId: number, onProf: any) {
    const fullName = [onProf.firstName, onProf.middleName, onProf.lastName].filter(Boolean).join(' ');
    
    // 1. Update userProfiles
    await tx.update(userProfiles).set({
      firstName: onProf.firstName,
      middleName: onProf.middleName,
      lastName: onProf.lastName,
      dob: onProf.dob,
      gender: onProf.gender,
      maritalStatus: onProf.maritalStatus,
      nationality: onProf.nationality,
      aadharNumber: onProf.aadharNumber,
      panNumber: onProf.panNumber,
      phone: onProf.phone,
      bloodGroup: onProf.bloodGroup,
      linkedinProfile: onProf.linkedinProfile,
      currentAddress: onProf.currentAddress,
      permanentAddress: onProf.permanentAddress,
      emergencyContact: onProf.emergencyContact,
      profileCompleted: true,
      updatedAt: new Date(),
    }).where(eq(userProfiles.userId, userId));

    // 2. Upsert employeeProfiles
    const [existingEmp] = await tx.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId)).limit(1);
    const empData = {
      userId,
      employeeType: onProf.employeeType,
      status: onProf.employeeStatus || 'Active',
      designationId: onProf.designationId,
      departmentId: onProf.departmentId,
      reportingManagerId: onProf.reportingManagerId,
      workLocation: onProf.workLocation,
      dateOfJoining: onProf.dateOfJoining,
      probationMonths: onProf.probationMonths,
      probationEndDate: onProf.probationEndDate,
      salaryType: onProf.salaryType,
      basicSalary: onProf.basicSalary,
      hra: onProf.hra,
      allowances: onProf.allowances,
      bonus: onProf.bonus,
      pfApplicable: onProf.pfApplicable,
      esicApplicable: onProf.esicApplicable,
      updatedAt: new Date(),
    };

    if (existingEmp) {
      await tx.update(employeeProfiles).set(empData).where(eq(employeeProfiles.userId, userId));
    } else {
      await tx.insert(employeeProfiles).values({ ...empData, createdAt: new Date() });
    }
  }

  private async syncEducationToEmployee(tx: any, userId: number, edu: any) {
    let yearOfCompletion = new Date().getFullYear();
    if (edu.endDate) {
      const parsedYear = new Date(edu.endDate).getFullYear();
      if (!isNaN(parsedYear)) {
        yearOfCompletion = parsedYear;
      }
    }

    await tx.insert(employeeEducation).values({
      userId,
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      yearOfCompletion,
      grade: edu.grade,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async syncExperienceToEmployee(tx: any, userId: number, exp: any) {
    await tx.insert(employeeExperience).values({
      userId,
      companyName: exp.companyName,
      designation: exp.designation,
      fromDate: exp.fromDate,
      toDate: exp.toDate,
      currentlyWorking: exp.currentlyWorking,
      responsibilities: exp.responsibilities,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private async syncBankToEmployee(tx: any, userId: number, bank: any) {
    await tx.insert(employeeBankDetails).values({
      userId,
      bankName: bank.bankName,
      accountHolderName: bank.accountHolderName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifscCode,
      branchName: bank.branchName,
      branchAddress: bank.branchAddress,
      upiId: bank.upiId,
      isPrimary: bank.isPrimary,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * DELETE /hrms/onboarding/:id
   */
  async delete(id: number): Promise<void> {
    await this.db.delete(onboardingRequests).where(eq(onboardingRequests.id, id));
  }

  // ── Stage Details Getters ──────────────────────────────────────────────────

  async getEmployeeEducation(onboardingId: number) {
    return this.db.select().from(onboardingEducation).where(eq(onboardingEducation.onboardingId, onboardingId)).orderBy(desc(onboardingEducation.id));
  }

  async getEmployeeExperience(onboardingId: number) {
    return this.db.select().from(onboardingExperience).where(eq(onboardingExperience.onboardingId, onboardingId)).orderBy(desc(onboardingExperience.id));
  }

  async getEmployeeBankDetails(onboardingId: number) {
    return this.db.select().from(onboardingBankDetails).where(eq(onboardingBankDetails.onboardingId, onboardingId)).orderBy(desc(onboardingBankDetails.id));
  }

  // ─── Employee-Facing Onboarding Methods ──────────────────────────────────────

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

    const uploadedTypes = obDocsRows.map(d => d.docType);
    const missingDocs = REQUIRED_DOC_TYPES.filter(type => !uploadedTypes.includes(type));
    const allDocsUploaded = missingDocs.length === 0;

    const hasResubmittedDoc = obDocsRows.some(d => d.status === 'resubmitted');
    const documentStatus = allDocsUploaded ? (hasResubmittedDoc ? 'resubmitted' : 'submitted') : 'pending';
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

      let updated: any;
      if (currentProfile) {
        [updated] = await this.db.update(onboardingProfiles)
          .set({ ...profileData, status: 'resubmitted', hrStatus: 'pending', hrRemark: null })
          .where(eq(onboardingProfiles.id, currentProfile.id))
          .returning();
      } else {
        [updated] = await this.db.insert(onboardingProfiles).values({
          ...profileData,
          status: 'submitted',
          hrStatus: 'pending',
        } as any).returning();
      }

      // Update profileStatus on the onboarding request
      await this.db.update(onboardingRequests).set({
        profileStatus: currentProfile ? 'resubmitted' : 'submitted',
        updatedAt: new Date(),
      }).where(eq(onboardingRequests.id, onboardingId));
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

      const hasExistingBank = dto.bankAccounts.some((b: any) => b.id);
      await this.db.update(onboardingRequests)
        .set({
          bankStatus: hasExistingBank ? 'resubmitted' : 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, onboardingId));
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

      const hasExistingEdu = dto.education.some((e: any) => e.id);
      await this.db.update(onboardingRequests)
        .set({
          educationStatus: hasExistingEdu ? 'resubmitted' : 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, onboardingId));
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

      const hasExistingExp = dto.experience.some((e: any) => e.id);
      await this.db.update(onboardingRequests)
        .set({
          experienceStatus: hasExistingExp ? 'resubmitted' : 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, onboardingId));
    }

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

    // Update the profileStatus on the onboarding request
    await this.db.update(onboardingRequests).set({
      profileStatus: 'submitted',
      updatedAt: new Date(),
    }).where(eq(onboardingRequests.id, onboardingId));

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

      await this.db.update(onboardingRequests)
        .set({ educationStatus: 'submitted', updatedAt: new Date() })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

      // Update the request stage status
      await this.db.update(onboardingRequests)
        .set({
          educationStatus: 'resubmitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

    const hasExistingBank = bankAccounts.some((b: any) => b.id);
    await this.db.update(onboardingRequests)
      .set({
        bankStatus: hasExistingBank ? 'resubmitted' : 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));

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

    const hasExistingEdu = educations.some((e: any) => e.id);
    await this.db.update(onboardingRequests)
      .set({
        educationStatus: hasExistingEdu ? 'resubmitted' : 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, activeReqs[0].id));

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

      await this.db.update(onboardingRequests)
        .set({ experienceStatus: 'submitted', updatedAt: new Date() })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

      await this.db.update(onboardingRequests)
        .set({
          experienceStatus: 'resubmitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

    const hasExistingExp = experiences.some((e: any) => e.id);
    await this.db.update(onboardingRequests)
      .set({
        experienceStatus: hasExistingExp ? 'resubmitted' : 'submitted',
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, activeReqs[0].id));

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

      await this.db.update(onboardingRequests)
        .set({ bankStatus: 'submitted', updatedAt: new Date() })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

      await this.db.update(onboardingRequests)
        .set({
          bankStatus: 'resubmitted',
          updatedAt: new Date(),
        })
        .where(eq(onboardingRequests.id, activeReqs[0].id));

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

    await this.checkAndUpdateDocumentStatus(onboardingId!);

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

    await this.checkAndUpdateDocumentStatus(activeReqs[0].id);

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
    await this.checkAndUpdateDocumentStatus(activeReqs[0].id);
  }

  private async checkAndUpdateDocumentStatus(onboardingId: number) {
    const currentDocs = await this.db
      .select({ docType: onboardingDocuments.docType, status: onboardingDocuments.status })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId));

    const uploadedTypes = currentDocs.map((d) => d.docType);
    const allUploaded = REQUIRED_DOC_TYPES.every((type) => uploadedTypes.includes(type));

    const hasResubmitted = currentDocs.some((d) => d.status === 'resubmitted');
    const newStatus = allUploaded ? (hasResubmitted ? 'resubmitted' : 'submitted') : 'pending';

    await this.db
      .update(onboardingRequests)
      .set({
        documentStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));
  }


  async rejectOnboardingRequest(requestId: number) {
    const onboardingRequest = await this.db
      .select()
      .from(onboardingRequests)
      .where(eq(onboardingRequests.id, requestId));

    if (!onboardingRequest || onboardingRequest.length === 0) {
      throw new NotFoundException('Onboarding Request Not Found.');
    }

    await this.db
      .update(onboardingRequests)
      .set({
        status: 'rejected',
      })
      .where(eq(onboardingRequests.id, requestId));
  }
}