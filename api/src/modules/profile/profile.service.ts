import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { eq, desc, aliasedTable } from 'drizzle-orm';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@/db';
import * as fs from 'fs';
import * as path from 'path';

const EMPLOYEE_DOCS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hrms', 'employee-documents');

import { users } from '@/db/schemas/auth/users.schema';
import { userProfiles } from '@/db/schemas/auth/user-profiles.schema';
import { employeeProfiles } from '@/db/schemas/hrms/employee-profiles.schema';
import { employeeDocuments } from '@/db/schemas/hrms/employee-documents.schema';
import { employeeAssets } from '@/db/schemas/hrms/employee-assets.schema';
import { employeeEducation } from '@/db/schemas/hrms/employee-education.schema';
import { employeeExperience } from '@/db/schemas/hrms/employee-experience.schema';
import { 
  onboardingRequests, 
  onboardingDocuments, 
  onboardingProfiles,
  onboardingEducation,
  onboardingExperience
} from '@/db/schemas/hrms/onboarding';
import { complaints } from '@/db/schemas/hrms/complaints.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { designations } from '@/db/schemas/master/designations.schema';

@Injectable()
export class ProfileService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async getMyProfile(userId: number) {
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
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';
    const onboardingId = isOnboarding ? activeReqs[0].id : null;

    let profile: any = null;
    let address: any = null;
    let emergencyContact: any = null;
    let employeeProfile: any = null;
    let documents: any[] = [];
    let education: any[] = [];
    let experience: any[] = [];

    if (isOnboarding) {
      // 2 & 3. Fetch Onboarding Profile Data
      const [obProfile] = await this.db
        .select()
        .from(onboardingProfiles)
        .where(eq(onboardingProfiles.onboardingId, onboardingId!))
        .limit(1);

      if (obProfile) {
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
        employeeProfile = {
          employeeType: obProfile.employeeType,
          employeeStatus: obProfile.employeeStatus,
          workLocation: obProfile.workLocation,
          probationMonths: obProfile.probationMonths,
          probationEndDate: obProfile.probationEndDate ? String(obProfile.probationEndDate).split('T')[0] : null,
          salaryType: obProfile.salaryType,
          bankName: obProfile.bankName,
          accountHolderName: obProfile.accountHolderName,
          accountNumber: obProfile.accountNumber,
          ifscCode: obProfile.ifscCode,
          branchName: obProfile.branchName,
          joiningDate: obProfile.dateOfJoining ? String(obProfile.dateOfJoining).split('T')[0] : null,
          designation: obProfile.designationId ? `ID ${obProfile.designationId}` : null,
          department: obProfile.departmentId ? `ID ${obProfile.departmentId}` : null,
        };
      }

      // 4. Fetch Onboarding Documents
      const obDocsRows = await this.db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.onboardingId, onboardingId!));

      documents = obDocsRows.map(d => ({
        id: d.id,
        docCategory: d.docCategory,
        docType: d.docType,
        docNumber: d.docNumber,
        fileUrl: d.fileUrl,
        fileName: d.fileUrl ? d.fileUrl.split('/').pop() : null,
        issueDate: d.issueDate || null,
        expiryDate: d.expiryDate || null,
        verificationStatus: d.status,
        verifiedBy: d.verifiedBy ? String(d.verifiedBy) : null,
        verificationDate: d.verificationDate || null,
        remarks: d.remarks || null,
        uploadedAt: d.createdAt?.toISOString() || null,
      }));

      // 5. Fetch Onboarding Education
      education = await this.db
        .select()
        .from(onboardingEducation)
        .where(eq(onboardingEducation.onboardingId, onboardingId!));

      // 6. Fetch Onboarding Experience
      experience = await this.db
        .select()
        .from(onboardingExperience)
        .where(eq(onboardingExperience.onboardingId, onboardingId!));
    } else {
      // 2. Fetch User Profile Data (PERMANENT)
      const [userProfileRow] = await this.db
        .select({
          profile: userProfiles,
          designationName: designations.name,
          departmentName: teams.name,
        })
        .from(userProfiles)
        .leftJoin(designations, eq(userProfiles.designationId, designations.id))
        .leftJoin(teams, eq(userProfiles.primaryTeamId, teams.id))
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      const upr = userProfileRow?.profile;
      profile = upr ? {
        firstName: upr.firstName || '',
        middleName: upr.middleName || null,
        lastName: upr.lastName || null,
        dateOfBirth: upr.dateOfBirth || null,
        gender: upr.gender || null,
        maritalStatus: upr.maritalStatus || null,
        nationality: upr.nationality || null,
        personalEmail: upr.altEmail || userRow.email || null,
        phone: upr.phone || userRow.mobile || null,
        alternatePhone: null,
        aadharNumber: upr.aadharNumber || null,
        panNumber: upr.panNumber || null,
        employeeCode: upr.employeeCode || null,
        altEmail: upr.altEmail || null,
      } : null;

      address = upr ? {
        currentAddressLine1: (upr.currentAddress as any)?.line1 || null,
        currentAddressLine2: (upr.currentAddress as any)?.line2 || null,
        currentCity: (upr.currentAddress as any)?.city || null,
        currentState: (upr.currentAddress as any)?.state || null,
        currentCountry: (upr.currentAddress as any)?.country || null,
        currentPostalCode: (upr.currentAddress as any)?.postalCode || null,
        permanentAddressLine1: (upr.permanentAddress as any)?.line1 || null,
        permanentAddressLine2: (upr.permanentAddress as any)?.line2 || null,
        permanentCity: (upr.permanentAddress as any)?.city || null,
        permanentState: (upr.permanentAddress as any)?.state || null,
        permanentCountry: (upr.permanentAddress as any)?.country || null,
        permanentPostalCode: (upr.permanentAddress as any)?.postalCode || null,
      } : null;

      emergencyContact = upr ? {
        name: (upr.emergencyContact as any)?.name || null,
        relationship: (upr.emergencyContact as any)?.relationship || null,
        phone: (upr.emergencyContact as any)?.phone || null,
        altPhone: (upr.emergencyContact as any)?.altPhone || null,
        email: (upr.emergencyContact as any)?.email || null,
      } : null;

      // 3. Fetch HR Employee Profile (PERMANENT)
      const managerUsers = aliasedTable(users, 'manager');
      const [empProfileRow] = await this.db
        .select({
          employeeType: employeeProfiles.employeeType,
          employeeStatus: employeeProfiles.employeeStatus,
          workLocation: employeeProfiles.workLocation,
          officialEmail: employeeProfiles.officialEmail,
          reportingManager: managerUsers.name,
          probationMonths: employeeProfiles.probationMonths,
          probationEndDate: employeeProfiles.probationEndDate,
          salaryType: employeeProfiles.salaryType,
          bankName: employeeProfiles.bankName,
          accountHolderName: employeeProfiles.accountHolderName,
          accountNumber: employeeProfiles.accountNumber,
          ifscCode: employeeProfiles.ifscCode,
          branchName: employeeProfiles.branchName,
          uanNumber: employeeProfiles.uanNumber,
          pfNumber: employeeProfiles.pfNumber,
          esicNumber: employeeProfiles.esicNumber,
          offerLetterDate: employeeProfiles.offerLetterDate,
          joiningLetterIssued: employeeProfiles.joiningLetterIssued,
          inductionCompleted: employeeProfiles.inductionCompleted,
          inductionDate: employeeProfiles.inductionDate,
          idCardIssued: employeeProfiles.idCardIssued,
          idCardIssuedDate: employeeProfiles.idCardIssuedDate,
        })
        .from(employeeProfiles)
        .leftJoin(managerUsers, eq(employeeProfiles.reportingManagerId, managerUsers.id))
        .where(eq(employeeProfiles.userId, userId))
        .limit(1);

      employeeProfile = empProfileRow ? {
        ...empProfileRow,
        probationEndDate: empProfileRow.probationEndDate || null,
        offerLetterDate: empProfileRow.offerLetterDate || null,
        inductionDate: empProfileRow.inductionDate || null,
        idCardIssuedDate: empProfileRow.idCardIssuedDate || null,
        joiningDate: upr?.dateOfJoining || null,
        designation: userProfileRow?.designationName || null,
        department: userProfileRow?.departmentName || null,
      } : null;

      // 4. Fetch Permanent Documents
      const documentsRows = await this.db
        .select()
        .from(employeeDocuments)
        .where(eq(employeeDocuments.userId, userId));

      documents = documentsRows.map(d => ({
        id: d.id,
        docCategory: d.docCategory,
        docType: d.docType,
        docNumber: d.docNumber,
        fileUrl: d.fileUrl,
        fileName: d.fileUrl ? d.fileUrl.split('/').pop() : null,
        issueDate: d.issueDate || null,
        expiryDate: d.expiryDate || null,
        verificationStatus: d.verificationStatus,
        verifiedBy: d.verifiedBy ? String(d.verifiedBy) : null,
        verificationDate: d.verificationDate || null,
        remarks: d.remarks || null,
        uploadedAt: d.createdAt?.toISOString() || null,
      }));

      // 5. Fetch Permanent Education
      education = await this.db
        .select()
        .from(employeeEducation)
        .where(eq(employeeEducation.userId, userId));

      // 6. Fetch Permanent Experience
      experience = await this.db
        .select()
        .from(employeeExperience)
        .where(eq(employeeExperience.userId, userId));
    }

    // 5. Fetch Assets
    const assetsRows = await this.db
      .select()
      .from(employeeAssets)
      .where(eq(employeeAssets.userId, userId));

    const assets = assetsRows.map(a => ({
      id: a.id,
      assetCode: a.assetCode,
      assetType: a.assetType,
      brand: a.brand,
      model: a.model,
      serialNumber: a.serialNumber,
      assetCondition: a.assetCondition,
      assignedDate: a.assignedDate || null,
      assetStatus: a.assetStatus,
    }));

    // 6. Fetch Complaints
    const complaintsRows = await this.db
      .select()
      .from(complaints)
      .where(eq(complaints.complainantId, userId));

    const mappedComplaints = complaintsRows.map(c => ({
      id: c.id,
      complaintCode: c.complaintCode,
      subject: c.subject,
      status: c.status,
      priority: c.priority,
      createdAt: c.createdAt?.toISOString() || null,
    }));

    return {
      currentUser,
      profile,
      employeeProfile,
      address,
      emergencyContact,
      education,
      experience,
      documents,
      assets,
      complaints: mappedComplaints,
      notifications: [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data Input Methods (Education & Experience)
  // ─────────────────────────────────────────────────────────────────────────

  async updateMyProfile(userId: number, dto: any) {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingProfiles).set({
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
      }).where(eq(onboardingProfiles.onboardingId, activeReqs[0].id)).returning();

      return { success: true, profile: updated };
    }

    // TODO: Fallback to update userProfiles for permanent employees if needed.
    throw new BadRequestException('Updating permanent profile from this endpoint is not yet configured.');
  }

  // --- Education ---

  async addEducation(userId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [inserted] = await this.db.insert(onboardingEducation).values({
        onboardingId: activeReqs[0].id,
        degree: dto.degree,
        institution: dto.institution,
        fieldOfStudy: dto.fieldOfStudy,
        yearOfCompletion: dto.yearOfCompletion,
        grade: dto.grade,
      }).returning();
      return inserted;
    }

    const [inserted] = await this.db.insert(employeeEducation).values({
      userId,
      degree: dto.degree,
      institution: dto.institution,
      fieldOfStudy: dto.fieldOfStudy,
      yearOfCompletion: dto.yearOfCompletion,
      grade: dto.grade,
    }).returning();
    return inserted;
  }

  async updateEducation(userId: number, eduId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingEducation).set({
        degree: dto.degree,
        institution: dto.institution,
        fieldOfStudy: dto.fieldOfStudy,
        yearOfCompletion: dto.yearOfCompletion,
        grade: dto.grade,
        updatedAt: new Date(),
      }).where(eq(onboardingEducation.id, eduId)).returning();
      return updated;
    }

    const [updated] = await this.db.update(employeeEducation).set({
      degree: dto.degree,
      institution: dto.institution,
      fieldOfStudy: dto.fieldOfStudy,
      yearOfCompletion: dto.yearOfCompletion,
      grade: dto.grade,
      updatedAt: new Date(),
    }).where(eq(employeeEducation.id, eduId)).returning();
    return updated;
  }

  async deleteEducation(userId: number, eduId: number) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [existing] = await this.db.select().from(onboardingEducation).where(eq(onboardingEducation.id, eduId)).limit(1);
      if (existing && existing.onboardingId === activeReqs[0].id) {
        await this.db.delete(onboardingEducation).where(eq(onboardingEducation.id, eduId));
      }
      return;
    }

    const [existing] = await this.db.select().from(employeeEducation).where(eq(employeeEducation.id, eduId)).limit(1);
    if (existing && existing.userId === userId) {
      await this.db.delete(employeeEducation).where(eq(employeeEducation.id, eduId));
    }
  }

  // --- Experience ---

  async addExperience(userId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

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
      }).returning();
      return inserted;
    }

    const [inserted] = await this.db.insert(employeeExperience).values({
      userId,
      companyName: dto.companyName,
      designation: dto.designation,
      fromDate: parseDate(dto.fromDate),
      toDate: parseDate(dto.toDate),
      currentlyWorking: dto.currentlyWorking,
      responsibilities: dto.responsibilities,
    }).returning();
    return inserted;
  }

  async updateExperience(userId: number, expId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    const parseDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : undefined;

    const payload = {
      companyName: dto.companyName,
      designation: dto.designation,
      fromDate: dto.fromDate !== undefined ? parseDate(dto.fromDate) : undefined,
      toDate: dto.toDate !== undefined ? parseDate(dto.toDate) : undefined,
      currentlyWorking: dto.currentlyWorking,
      responsibilities: dto.responsibilities,
      updatedAt: new Date(),
    };

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingExperience).set(payload).where(eq(onboardingExperience.id, expId)).returning();
      return updated;
    }

    const [updated] = await this.db.update(employeeExperience).set(payload as any).where(eq(employeeExperience.id, expId)).returning();
    return updated;
  }

  async deleteExperience(userId: number, expId: number) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [existing] = await this.db.select().from(onboardingExperience).where(eq(onboardingExperience.id, expId)).limit(1);
      if (existing && existing.onboardingId === activeReqs[0].id) {
        await this.db.delete(onboardingExperience).where(eq(onboardingExperience.id, expId));
      }
      return;
    }

    const [existing] = await this.db.select().from(employeeExperience).where(eq(employeeExperience.id, expId)).limit(1);
    if (existing && existing.userId === userId) {
      await this.db.delete(employeeExperience).where(eq(employeeExperience.id, expId));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Document Upload Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Upload a new document for the authenticated user.
   * Rejects if a document of the same docType already exists.
   */
  async uploadDocument(
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

    if (isOnboarding) {
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
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning();

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

    // Check for duplicate docType

    const fileUrl = `/uploads/hrms/employee-documents/${file.filename}`;

    const [inserted] = await this.db
      .insert(employeeDocuments)
      .values({
        userId,
        docType: dto.docType,
        docCategory: dto.docCategory,
        fileUrl,
        issueDate: dto.issueDate || null,
        expiryDate: dto.expiryDate || null,
        verificationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: inserted.id,
      docType: inserted.docType,
      docCategory: inserted.docCategory,
      fileUrl: inserted.fileUrl,
      fileName: file.filename,
      issueDate: inserted.issueDate || null,
      expiryDate: inserted.expiryDate || null,
      verificationStatus: inserted.verificationStatus,
      uploadedAt: inserted.createdAt?.toISOString() || null,
      remarks: null,
    };
  }

  /**
   * Re-upload a rejected document.
   * Verifies ownership, deletes old file, inserts new file, resets status to 'pending'.
   */
  async reuploadDocument(
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

    if (isOnboarding) {
      const [existing] = await this.db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.id, docId))
        .limit(1);

      if (!existing) {
        try { fs.unlinkSync(file.path); } catch (_) {}
        throw new NotFoundException('Document not found');
      }

      // Check ownership (in onboarding, doc belongs to onboardingId)
      if (existing.onboardingId !== activeReqs[0].id) {
        try { fs.unlinkSync(file.path); } catch (_) {}
        throw new ForbiddenException('You do not own this document');
      }

      // Delete old file from disk
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
          status: 'pending',
          verifiedBy: null,
          verificationDate: null,
          remarks: null,
          updatedAt: new Date(),
        })
        .where(eq(onboardingDocuments.id, docId))
        .returning();

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


    const newFileUrl = `/uploads/hrms/employee-documents/${file.filename}`;

    const [updated] = await this.db
      .update(employeeDocuments)
      .set({
        fileUrl: newFileUrl,
        issueDate: dto.issueDate || null,
        expiryDate: dto.expiryDate || null,
        verificationStatus: 'pending',
        verifiedBy: null,
        verificationDate: null,
        remarks: null,
        updatedAt: new Date(),
      })
      .where(eq(employeeDocuments.id, docId))
      .returning();

    return {
      id: updated.id,
      docType: updated.docType,
      docCategory: updated.docCategory,
      fileUrl: updated.fileUrl,
      fileName: file.filename,
      issueDate: updated.issueDate || null,
      expiryDate: updated.expiryDate || null,
      verificationStatus: updated.verificationStatus,
      uploadedAt: updated.createdAt?.toISOString() || null,
      remarks: null,
    };
  }

  /**
   * Delete an uploaded document.
   * Verifies ownership, removes file from disk and DB.
   */
  async deleteDocument(userId: number, docId: number): Promise<void> {
    const activeReqs = await this.db
      .select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests)
      .where(eq(onboardingRequests.userId, userId))
      .orderBy(desc(onboardingRequests.createdAt))
      .limit(1);
    
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [existing] = await this.db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.id, docId))
        .limit(1);

      if (!existing) throw new NotFoundException('Document not found');
      if (existing.onboardingId !== activeReqs[0].id) throw new ForbiddenException('You do not own this document');

      if (existing.fileUrl) {
        const filename = existing.fileUrl.split('/').pop();
        if (filename) {
          const diskPath = path.join(EMPLOYEE_DOCS_UPLOAD_DIR, filename);
          try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); } catch (_) {}
        }
      }

      await this.db.delete(onboardingDocuments).where(eq(onboardingDocuments.id, docId));
      return;
    }
        const [existing] = await this.db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, docId))
      .limit(1);

    if (!existing) throw new NotFoundException('Document not found');
    if (existing.userId !== userId) throw new ForbiddenException('You do not own this document');

    // Delete file from disk
    if (existing.fileUrl) {
      const filename = existing.fileUrl.split('/').pop();
      if (filename) {
        const diskPath = path.join(EMPLOYEE_DOCS_UPLOAD_DIR, filename);
        try {
          if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        } catch (_) {}
      }
    }

    await this.db
      .delete(employeeDocuments)
      .where(eq(employeeDocuments.id, docId));
  }
}
