import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { eq, desc, aliasedTable, and } from 'drizzle-orm';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@/db';
import * as fs from 'fs';
import * as path from 'path';

const EMPLOYEE_DOCS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hrms', 'employee-documents');

//final list of requires docs every employee needs to upload
const REQUIRED_DOC_TYPES = [
  'Aadhar Card',
  'Graduation Certificate',
  'Resume / CV',
  'Passport Size Photo',
  'Bank Passbook / Cancelled Cheque',
]; 


import { users } from '@/db/schemas/auth/users.schema';
import { userProfiles } from '@/db/schemas/auth/user-profiles.schema';
import { employeeProfiles } from '@/db/schemas/hrms/employee-profiles.schema';
import { employeeDocuments } from '@/db/schemas/hrms/employee-documents.schema';
import { employeeAssets } from '@/db/schemas/hrms/employee-assets.schema';
import { employeeEducation } from '@/db/schemas/hrms/employee-education.schema';
import { employeeExperience } from '@/db/schemas/hrms/employee-experience.schema';
import { employeeBankDetails } from '@/db/schemas/hrms/employee-bank-details.schema';
import { 
  onboardingRequests, 
  onboardingDocuments, 
  onboardingProfiles,
  onboardingEducation,
  onboardingExperience,
  onboardingActivityLogs,
  onboardingInduction,
  onboardingBankDetails
} from '@/db/schemas/hrms/onboarding';
import { complaints } from '@/db/schemas/hrms/complaints.schema';
import { teams } from '@/db/schemas/master/teams.schema';
import { designations } from '@/db/schemas/master/designations.schema';
import { OnboardingService } from '../hrms/onboarding/onboarding.service';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbInstance,
    private readonly onboardingService: OnboardingService,
  ) {}

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
    const [userProfileRow] = await this.db.select({ profileCompleted: userProfiles.profileCompleted })
      .from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      
    const isComplete = userProfileRow?.profileCompleted === true;

    if (!isComplete) {
      // Fetch active onboarding request status
      const activeReqs = await this.db
        .select({
          id: onboardingRequests.id,
          status: onboardingRequests.status,
          hrStatus: onboardingRequests.hrStatus,
          progress: onboardingRequests.progress,
        })
        .from(onboardingRequests)
        .where(eq(onboardingRequests.userId, userId))
        .orderBy(desc(onboardingRequests.createdAt))
        .limit(1);

      let onboardingStatus: any = null;
      if (activeReqs.length > 0) {
        const obReq = activeReqs[0];
        
        // Also fetch onboardingProfile to see if employeeCompleted is true
        const [obProfile] = await this.db
          .select({ employeeCompleted: onboardingProfiles.employeeCompleted })
          .from(onboardingProfiles)
          .where(eq(onboardingProfiles.onboardingId, obReq.id))
          .orderBy(desc(onboardingProfiles.id))
          .limit(1);

        onboardingStatus = {
          id: obReq.id,
          status: obReq.status,
          hrStatus: obReq.hrStatus,
          progress: obReq.progress || 0,
          employeeCompleted: obProfile?.employeeCompleted || false,
        };
      }

      return {
        currentUser,
        isOnboarding: true,
        onboardingStatus,
        profile: null,
        employeeProfile: null,
        address: null,
        emergencyContact: null,
        education: [],
        experience: [],
        documents: [],
        inductionTasks: [],
        assets: [],
        bankAccounts: [],
        complaints: [],
        notifications: [],
      };
    }

    let profile: any = null;
    let address: any = null;
    let emergencyContact: any = null;
    let employeeProfile: any = null;
    let documents: any[] = [];
    let education: any[] = [];
    let experience: any[] = [];
    let bankAccounts: any[] = [];

    // 2. Fetch User Profile Data (PERMANENT)
    const [userProfileRowData] = await this.db
      .select({
          profile: userProfiles,
          designationName: designations.name,
          departmentName: teams.name,
        })
      .from(userProfiles)
      .leftJoin(users, eq(users.id, userProfiles.userId))
      .leftJoin(designations, eq(userProfiles.designationId, designations.id))
      .leftJoin(teams, eq(users.primaryTeamId, teams.id))
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const upr = userProfileRowData?.profile;

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
      bloodGroup: (upr as any).bloodGroup || null,
      linkedinProfile: (upr as any).linkedinProfile || null,
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
      .leftJoin(managerUsers, eq(employeeProfiles.reportingTl, managerUsers.id))
      .where(eq(employeeProfiles.userId, userId))
      .limit(1);

    employeeProfile = empProfileRow ? {
      ...empProfileRow,
      probationEndDate: empProfileRow.probationEndDate || null,
      offerLetterDate: empProfileRow.offerLetterDate || null,
      inductionDate: empProfileRow.inductionDate || null,
      idCardIssuedDate: empProfileRow.idCardIssuedDate || null,
      joiningDate: upr?.dateOfJoining || null,
      designation: userProfileRowData?.designationName || null,
      department: userProfileRowData?.departmentName || null,
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

    // 7. Fetch Permanent Bank Details
    bankAccounts = await this.db
      .select()
      .from(employeeBankDetails)
      .where(eq(employeeBankDetails.userId, userId));

    // 8. Fetch Assets
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

    // 9. Fetch Complaints
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
      isOnboarding: false,
      onboardingStatus: null,
      profile,
      employeeProfile,
      address,
      emergencyContact,
      education,
      experience,
      documents,
      inductionTasks: [],
      assets,
      bankAccounts,
      complaints: mappedComplaints,
      notifications: [],
    };
  }

  async updateMyProfileEditMode(userId: number, dto: any) {
    const sanitized: Record<string, any> = {};
    if (dto.linkedinProfile !== undefined) sanitized.linkedinProfile = dto.linkedinProfile;
    if (dto.image !== undefined) sanitized.image = dto.image;

    if (Object.keys(sanitized).length === 0) {
      return { success: true, message: 'No editable fields provided.' };
    }

    sanitized.updatedAt = new Date();

    const [updated] = await this.db
      .update(userProfiles)
      .set(sanitized)
      .where(eq(userProfiles.userId, userId))
      .returning();

    return { success: true, profile: updated };
  }
}
