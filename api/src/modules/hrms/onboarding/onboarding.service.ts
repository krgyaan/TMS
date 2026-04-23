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
} from '@/db/schemas/hrms/onboarding';
import { users } from '@/db/schemas/auth/users.schema';
import { eq, desc } from 'drizzle-orm';
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
      .limit(1);
    
    // Employee side done at signup. HR side done when hrCompleted flag is true.
    const profileCompleted = profile?.employeeCompleted && profile?.hrCompleted;
    const newProfileStatus = profileCompleted ? 'completed' : 'in_progress';

    // 2. Documents
    const docs = await tx
      .select()
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId));
    
    // Assuming docs are completed if there is at least one doc and NO docs are pending/rejected
    const docsCompleted = docs.length > 0 && docs.every((d: any) => d.status === 'verified');
    const newDocumentStatus = docsCompleted ? 'completed' : (docs.length > 0 ? 'in_progress' : 'pending');

    // 3. Induction
    const tasks = await tx
      .select()
      .from(onboardingInduction)
      .where(eq(onboardingInduction.onboardingId, onboardingId));
      
    // Induction completed if there are tasks and ALL tasks are completed
    const inductionCompleted = tasks.length > 0 && tasks.every((t: any) => t.status === 'completed');
    const newInductionStatus = inductionCompleted ? 'completed' : (tasks.length > 0 ? 'in_progress' : 'pending');

    // 4. Progress %
    let progress = 0;
    if (profileCompleted) progress += 33.33;
    if (docsCompleted) progress += 33.33;
    if (inductionCompleted) progress += 33.34;
    
    await tx
      .update(onboardingRequests)
      .set({
        profileStatus: newProfileStatus,
        documentStatus: newDocumentStatus,
        inductionStatus: newInductionStatus,
        progress: Math.floor(progress),
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));
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
        bankName: onboardingProfiles.bankName,
        accountNumber: onboardingProfiles.accountNumber,
        ifscCode: onboardingProfiles.ifscCode,
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
    const [profile] = await this.db
      .select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.onboardingId, id))
      .limit(1);

    if (!profile) throw new NotFoundException(`Profile not found for onboarding #${id}`);

    const [request] = await this.db
      .select({
        name: onboardingRequests.name,
        email: onboardingRequests.email,
        phone: onboardingRequests.phone,
        status: onboardingRequests.status,
        profileStatus: onboardingRequests.profileStatus,
        progress: onboardingRequests.progress,
        approvedAt: onboardingRequests.approvedAt,
        reviewedBy: users.name,
      })
      .from(onboardingRequests)
      .leftJoin(users, eq(onboardingRequests.approvedBy, users.id))
      .where(eq(onboardingRequests.id, id))
      .limit(1);

    return { ...profile, ...request, onboardingId: id };
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
        rejectedReason: doc.remarks,
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
        remarks: onboardingDocuments.remarks,
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
      rejectedReason: doc.remarks,
      fileName: doc.fileUrl ? doc.fileUrl.split('/').pop() : 'document.pdf',
      fileSize: '2.4 MB',
      fileType: 'application/pdf',
      fileUrl: doc.fileUrl,
    }));
  }

  /**
   * PATCH /hrms/onboarding/:id/documents/:docId/verify
   */
  async verifyDocument(onboardingId: number, docId: number, status: string, reason: string | undefined, adminId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(onboardingDocuments)
        .set({
          status,
          remarks: reason || null,
          verifiedBy: status === 'verified' ? adminId : null,
          verificationDate: status === 'verified' ? (new Date() as any) : null,
          updatedAt: new Date(),
        })
        .where(eq(onboardingDocuments.id, docId));

      await tx.insert(onboardingActivityLogs).values({
        onboardingId,
        action: `DOCUMENT_${status.toUpperCase()}`,
        performedBy: adminId,
        metadata: { docId, reason },
      });
      
      await this.recalculateProgress(tx, onboardingId);
    });
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
        const defaultTasks = [
          ...['Documents collection form completed', 'DISC form completed', 'Workstation identified', 
            'Email ID created', 'Employee added to systems', 'Visiting card ordered', 'ID card ordered']
            .map(t => ({ onboardingId: id, taskName: t, taskType: 'BEFORE', status: 'pending' })),
          ...['HR policy training completed', 'Leave policy training completed', 'Attendance training completed', 
            'Laptop allotted', 'Office tour completed', 'Reporting manager introduction completed', 
            'PF initiation (if applicable)', 'Candidate profile shared', 'Buddy assigned', 'Training needs identified', 
            'Welcome session completed', 'Employee database updated', 'PF office updated', 'ID / Visiting card provided', 
            'Welcome kit arranged']
            .map(t => ({ onboardingId: id, taskName: t, taskType: 'AFTER', status: 'pending' }))
        ];

        await tx.insert(onboardingInduction).values(defaultTasks as any);
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

  /**
   * DELETE /hrms/onboarding/:id
   */
  async delete(id: number): Promise<void> {
    await this.db.delete(onboardingRequests).where(eq(onboardingRequests.id, id));
  }
}