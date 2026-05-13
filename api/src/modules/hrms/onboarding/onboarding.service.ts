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
  onboardingDocuments,
  onboardingInduction,
  onboardingActivityLogs,
  type NewOnboardingRequest,
  type NewOnboardingProfile,
  onboardingProfiles,
  onboardingEducation,
  onboardingExperience,
  onboardingBankDetails,
} from '@/db/schemas/hrms/onboarding';
import { users } from '@/db/schemas/auth/users.schema';
import { userProfiles } from '@/db/schemas/auth/user-profiles.schema';
import { employeeProfiles } from '@/db/schemas/hrms/employee-profiles.schema';
import { employeeEducation } from '@/db/schemas/hrms/employee-education.schema';
import { employeeExperience } from '@/db/schemas/hrms/employee-experience.schema';
import { employeeDocuments } from '@/db/schemas/hrms/employee-documents.schema';
import { employeeBankDetails } from '@/db/schemas/hrms/employee-bank-details.schema';
import { eq, desc, aliasedTable, inArray } from 'drizzle-orm';
import { designations } from '@/db/schemas/master/designations.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

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
    
    const profileCompleted = profile?.status === 'submitted' && profile?.hrStatus === 'approved';
    const profileRejected = profile?.hrStatus === 'rejected';
    
    let newProfileStatus: string;
    if (profile?.hrStatus === 'approved') newProfileStatus = 'approved';
    else if (profile?.hrStatus === 'rejected') newProfileStatus = 'rejected';
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
    
    let newDocumentStatus: string;
    if (docsApproved) newDocumentStatus = 'approved';
    else if (docsRejected) newDocumentStatus = 'rejected';
    else if (docs.length > 0) newDocumentStatus = 'submitted';
    else newDocumentStatus = 'pending';

    // 3. Education
    const education = await tx
      .select()
      .from(onboardingEducation)
      .where(eq(onboardingEducation.onboardingId, onboardingId));
    
    const eduApproved = education.length > 0 && education.every((e: any) => e.hrStatus === 'approved');
    const eduRejected = education.some((e: any) => e.hrStatus === 'rejected');
    
    let newEducationStatus: string;
    if (eduApproved) newEducationStatus = 'approved';
    else if (eduRejected) newEducationStatus = 'rejected';
    else if (education.length > 0) newEducationStatus = 'submitted';
    else newEducationStatus = 'pending';

    // 4. Experience
    const experience = await tx
      .select()
      .from(onboardingExperience)
      .where(eq(onboardingExperience.onboardingId, onboardingId));
    
    const expApproved = experience.length > 0 && experience.every((e: any) => e.hrStatus === 'approved');
    const expRejected = experience.some((e: any) => e.hrStatus === 'rejected');
    
    let newExperienceStatus: string;
    if (expApproved) newExperienceStatus = 'approved';
    else if (expRejected) newExperienceStatus = 'rejected';
    else if (experience.length > 0) newExperienceStatus = 'submitted';
    else newExperienceStatus = 'pending';

    // 5. Bank Details
    const bank = await tx
      .select()
      .from(onboardingBankDetails)
      .where(eq(onboardingBankDetails.onboardingId, onboardingId));
    
    const bankApproved = bank.length > 0 && bank.every((b: any) => b.hrStatus === 'approved');
    const bankRejected = bank.some((b: any) => b.hrStatus === 'rejected');
    
    let newBankStatus: string;
    if (bankApproved) newBankStatus = 'approved';
    else if (bankRejected) newBankStatus = 'rejected';
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
          educationStatus: onboardingRequests.educationStatus,
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

      const [profiles, documents, education, experience, bankDetails, induction] = await Promise.all([
        this.db.select().from(onboardingProfiles).where(inArray(onboardingProfiles.onboardingId, requestIds)),
        this.db.select().from(onboardingDocuments).where(inArray(onboardingDocuments.onboardingId, requestIds)),
        this.db.select().from(onboardingEducation).where(inArray(onboardingEducation.onboardingId, requestIds)),
        this.db.select().from(onboardingExperience).where(inArray(onboardingExperience.onboardingId, requestIds)),
        this.db.select().from(onboardingBankDetails).where(inArray(onboardingBankDetails.onboardingId, requestIds)),
        this.db.select().from(onboardingInduction).where(inArray(onboardingInduction.onboardingId, requestIds)),
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
          row.bankStatus,
          row.inductionStatus,
        ];
        const submittedCount = statuses.filter((s) => s !== 'pending').length;
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

        return {
          ...row,
          employeeProgressPercent,

          // The raw arrays/objects so the frontend can display remarks/details
          profile: rowProfile,
          documents: rowDocs,
          education: rowEdu,
          experience: rowExp,
          bankDetails: rowBank,
          induction: rowInduction,

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
      uploadedAt: doc.createdAt?.toISOString(),
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verificationDate,
      rejectedReason: doc.hrRemark,
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

  async approveEducationRecord(id: number, eduId: number, hrStatus: 'approved' | 'rejected', hrRemark: string, adminId: number) {
    return this.db.transaction(async (tx) => {
      const [edu] = await tx.select().from(onboardingEducation).where(eq(onboardingEducation.id, eduId)).limit(1);
      if (!edu) throw new NotFoundException('Education record not found');

      await tx.update(onboardingEducation).set({
        hrStatus,
        hrRemark,
        updatedAt: new Date(),
      }).where(eq(onboardingEducation.id, eduId));

      if (hrStatus === 'approved') {
        const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);
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

      if (hrStatus === 'approved') {
        const [req] = await tx.select({ userId: onboardingRequests.userId }).from(onboardingRequests).where(eq(onboardingRequests.id, id)).limit(1);
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
        hrStatus: status === 'verified' ? 'approved' : 'rejected',
        hrRemark: reason || null,
        verifiedBy: adminId,
        verificationDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      }).where(eq(onboardingDocuments.id, docId));

      await this.recalculateProgress(tx, id);
      return { success: true };
    });
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
    await tx.insert(employeeEducation).values({
      userId,
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: edu.startDate,
      endDate: edu.endDate,
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
}