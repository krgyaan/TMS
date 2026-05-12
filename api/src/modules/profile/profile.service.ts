import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { eq, desc, aliasedTable } from 'drizzle-orm';
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
    let activeReqs = await this.db
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
    
    // this is the final check that will tell us the request has been completed or not
    let isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed'; 

    let onboardingId = isOnboarding ? activeReqs[0].id : null;

    if (!isOnboarding) {
      const [userProfileRow] = await this.db.select({ profileCompleted: userProfiles.profileCompleted })
      .from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      
      // if profile completed -> we donot reinitiate and consider the employee to be onboarded already
      const isComplete = userProfileRow?.profileCompleted === true;

      if (!isComplete) {
        await this.onboardingService.initializeEmployeeOnboarding(userId, 0); // 0 for system trigger
        
        // Re-fetch
        activeReqs = await this.db
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
        
          if(!activeReqs){
            throw new NotFoundException("Something went wrong. Couldn't create a re-onboarding request for the user.");
          }
        
        isOnboarding = true;
        onboardingId = activeReqs[0].id;
      }
    }

    let profile: any = null;
    let address: any = null;
    let emergencyContact: any = null;
    let employeeProfile: any = null;
    let documents: any[] = [];
    let education: any[] = [];
    let experience: any[] = [];
    let onboardingStatus: any = null;
    let inductionTasks: any = null;
    let bankAccounts: any[] = [];

    if (isOnboarding) {
      // 2 & 3. Fetch Onboarding Profile Data
      const reportingTl = aliasedTable(users, 'reportingTl');

      //fetching the onboarding profile row
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
        .where(eq(onboardingProfiles.onboardingId, onboardingId!))
        .limit(1);

      if (obProfileRow) {
        //filling the data if already present else null
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
        employeeProfile = {
          employeeType: obProfile.employeeType,
          employeeStatus: obProfile.employeeStatus,
          workLocation: obProfile.workLocation,
          reportingTl: obProfileRow.reportingTl,
          probationMonths: obProfile.probationMonths,
          probationEndDate: obProfile.probationEndDate ? String(obProfile.probationEndDate).split('T')[0] : null,
          salaryType: obProfile.salaryType,
          joiningDate: obProfile.dateOfJoining ? String(obProfile.dateOfJoining).split('T')[0] : null,
          designation: obProfileRow.designationName || (obProfile.designationId ? `ID ${obProfile.designationId}` : null),
          department: obProfileRow.departmentName || (obProfile.departmentId ? `ID ${obProfile.departmentId}` : null),
        };
      }

      // 4. Fetch Onboarding Documents (Latest per category)
      const obDocsRows = await this.db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.onboardingId, onboardingId!))
        .orderBy(desc(onboardingDocuments.id));

      // Filter to show only latest per docType
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
        verificationStatus: d.status,
        hrStatus: d.hrStatus,
        verifiedBy: d.verifiedBy ? String(d.verifiedBy) : null,
        verificationDate: d.verificationDate || null,
        hrRemark: d.hrRemark || null,
        uploadedAt: d.createdAt?.toISOString() || null,
        status: d.status ? d.status : "pending",
      }));

      // 5. Fetch Onboarding Education 
      const obEduRows = await this.db
        .select()
        .from(onboardingEducation)
        .where(eq(onboardingEducation.onboardingId, onboardingId!))
        .orderBy(desc(onboardingEducation.id));

      // For simplicity, let's just group by degree/institution and take the latest
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
      }));

      // 6. Fetch Onboarding Experience
      const obExpRows = await this.db
        .select()
        .from(onboardingExperience)
        .where(eq(onboardingExperience.onboardingId, onboardingId!))
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
      }));

      // 7. Fetch Induction Tasks
      inductionTasks = await this.db
        .select()
        .from(onboardingInduction)
        .where(eq(onboardingInduction.onboardingId, onboardingId!));

      // 7.5 Fetch Onboarding Bank Details
      const obBankRows = await this.db
        .select()
        .from(onboardingBankDetails)
        .where(eq(onboardingBankDetails.onboardingId, onboardingId!))
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
        branchName: b.branchName,
        branchAddress: b.branchAddress,
        upiId: b.upiId,
        isPrimary: b.isPrimary,
        status: b.status,
        hrStatus: b.hrStatus,
      }));

      // 8. Build onboarding status for frontend
      const obReq = activeReqs[0];
      const obProfile = obProfileRow?.profile;

      // ── Status Derivations ────────────────────────────────────────────────── 
      // we will derive the final request derivations
      const profileStatus = obProfile?.status === 'submitted' ? 'submitted' : 'pending';
      const profileHrStatus = (obProfile?.hrStatus as any) || 'pending';

      const bankStatus = bankAccounts.length > 0 ? 'submitted' : 'pending';
      const bankHrStatus = bankAccounts.some((b: any) => b.hrStatus === 'rejected')
        ? 'rejected'
        : (bankAccounts.length > 0 && bankAccounts.every((b: any) => b.hrStatus === 'approved'))
          ? 'approved'
          : 'pending';

      const educationStatus = education.length > 0 ? 'submitted' : 'pending';
      const educationHrStatus = education.some((e: any ) => e.status == 'rejected') 
        ? 'rejected'
        : (education.length > 0 && education.every((e : any ) => e.status == 'approved')) 
          ? 'approved'
          : 'pending';

      const experienceStatus = experience.length > 0 ? 'submitted' : 'pending';
      const experienceHrStatus = experience.some((e : any) => e.status == 'rejected') 
        ? 'rejected'
        : (experience.length > 0 && experience.every((e : any) => e.status == 'approved'))
          ? 'approved'
          : 'pending';

      // Document status based on REQUIRED_DOC_TYPES
      const uploadedTypes = obDocsRows.map(d => d.docType);

      const missingDocs = REQUIRED_DOC_TYPES.filter(type => !uploadedTypes.includes(type));
      const allDocsUploaded = missingDocs.length === 0;

      const documentStatus = allDocsUploaded ? 'submitted' : 'pending';
      const documentHrStatus = documents.some((d: any) => d.hrStatus === 'rejected')
        ? 'rejected'
        : (documents.length > 0 && documents.every((d: any) => d.hrStatus === 'approved'))
          ? 'approved'
          : 'pending';

      const inductionStatus = inductionTasks.every((i : any) => i.status  == 'completed') ? 'completed' : 'pending';

      // Employee is only "completed" when all sections are submitted
      const employeeCompleted = 
        profileStatus === 'submitted' &&
        documentStatus === 'submitted' &&
        bankStatus === 'submitted' &&
        educationStatus === 'submitted' &&
        experienceStatus === 'submitted';

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
        // Per-entity HR remarks for rejection feedback
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

    } else {
      // -----------------------GETTING PERMANENT DETAILS OF THE EMPLOYEES ------------------------//

      // 2. Fetch User Profile Data (PERMANENT)

      //will have to check, maybe we'll get rid of user profiles altogether later
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

      // 7. Fetch Permanent Bank Details
      bankAccounts = await this.db
        .select()
        .from(employeeBankDetails)
        .where(eq(employeeBankDetails.userId, userId));
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
      isOnboarding,
      onboardingStatus,
      profile,
      employeeProfile,
      address,
      emergencyContact,
      education,
      experience,
      documents,
      inductionTasks,
      assets,
      bankAccounts,
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
      const onboardingId = activeReqs[0].id;

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

      // If current profile was rejected, INSERT a new record (audit trail)
      // Otherwise, UPDATE the existing one
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
      if (currentProfile?.hrStatus === 'rejected') {
        // Audit trail: create a fresh record, old rejected one is preserved
        [updated] = await this.db.insert(onboardingProfiles).values({
          ...profileData,
          status: 'submitted',
          hrStatus: 'pending',
        } as any).returning();
      } else if (currentProfile) {
        // Now every save is a submission
        [updated] = await this.db.update(onboardingProfiles)
          .set({ ...profileData, status: 'submitted' })
          .where(eq(onboardingProfiles.id, currentProfile.id))
          .returning();
      } else {
        // First time — insert as submitted
        [updated] = await this.db.insert(onboardingProfiles).values({
          ...profileData,
          status: 'submitted',
          hrStatus: 'pending',
        } as any).returning();
      }

      // Handle Bank Accounts Sync
      if (dto.bankAccounts && Array.isArray(dto.bankAccounts)) {
        await this.db.delete(onboardingBankDetails).where(eq(onboardingBankDetails.onboardingId, activeReqs[0].id));
        if (dto.bankAccounts.length > 0) {
          await this.db.insert(onboardingBankDetails).values(dto.bankAccounts.map((b: any) => ({
            onboardingId: activeReqs[0].id,
            bankName: b.bankName,
            accountHolderName: b.accountHolderName,
            accountNumber: b.accountNumber,
            ifscCode: b.ifscCode,
            branchName: b.branchName || null,
            branchAddress: b.branchAddress || null,
            upiId: b.upiId || null,
            isPrimary: b.isPrimary === true || b.isPrimary === 'true',
            status: 'submitted',
          })));
        }
      }

      // Handle Education Sync
      if (dto.education && Array.isArray(dto.education)) {
        // Simple strategy: delete existing and re-insert (or more complex sync)
        // For onboarding, re-inserting is often cleaner if IDs are not strictly managed on frontend
        await this.db.delete(onboardingEducation).where(eq(onboardingEducation.onboardingId, activeReqs[0].id));
        if (dto.education.length > 0) {
          await this.db.insert(onboardingEducation).values(dto.education.map((e: any) => ({
            onboardingId: activeReqs[0].id,
            degree: e.degree,
            institution: e.institution,
            fieldOfStudy: e.fieldOfStudy,
            startDate: e.startDate ? (e.startDate.length === 7 ? `${e.startDate}-01` : e.startDate) : null,
            endDate: e.endDate ? (e.endDate.length === 7 ? `${e.endDate}-01` : e.endDate) : null,
            grade: e.grade,
            status: 'submitted',
          })));
        }
      }

      // Handle Experience Sync
      if (dto.experience && Array.isArray(dto.experience)) {
        await this.db.delete(onboardingExperience).where(eq(onboardingExperience.onboardingId, activeReqs[0].id));
        if (dto.experience.length > 0) {
          await this.db.insert(onboardingExperience).values(dto.experience.map((e: any) => ({
            onboardingId: activeReqs[0].id,
            companyName: e.companyName,
            designation: e.designation,
            fromDate: e.fromDate || null,
            toDate: e.currentlyWorking ? null : (e.toDate || null),
            currentlyWorking: e.currentlyWorking === true || e.currentlyWorking === 'true',
            responsibilities: e.responsibilities,
            status: 'submitted',
          })));
        }
      }

      return { success: true, profile: updated };
    }

    return this.updateMyProfileEditMode(userId, dto);
  }

  async updateMyProfileEditMode(userId: number, dto: any) {
    const sanitized: Record<string, any> = {};
    if (dto.linkedinProfile !== undefined) sanitized.linkedinProfile = dto.linkedinProfile;
    // Note: Profile image update is handled via a separate upload endpoint, 
    // but we can whitelist the field here if it's ever sent in a basic PATCH.
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

  // --- Submit Onboarding ---

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

    // Fetch the latest profile record
    const [obProfile] = await this.db
      .select({ id: onboardingProfiles.id, status: onboardingProfiles.status, employeeCompleted: onboardingProfiles.employeeCompleted })
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.onboardingId, activeReqs[0].id))
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
    }).where(eq(onboardingRequests.id, activeReqs[0].id));

    // Log the activity
    await this.db.insert(onboardingActivityLogs).values({
      onboardingId: activeReqs[0].id,
      action: 'EMPLOYEE_SUBMITTED',
      performedBy: userId,
    });

    return { success: true, message: 'Onboarding details submitted for review.' };
  }

  // --- Education ---

  // request ->validate
  //check if onboarding on
  // if upddate -> check if rejected -> update

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
        startDate: dto.startDate ? (dto.startDate.length === 7 ? `${dto.startDate}-01` : dto.startDate) : null,
        endDate: dto.endDate ? (dto.endDate.length === 7 ? `${dto.endDate}-01` : dto.endDate) : null,
        grade: dto.grade,
        status: 'submitted',
        hrStatus: 'pending',
      }).returning();
      return inserted;
    }

    throw new BadRequestException('Education details can only be modified during onboarding.');
  }

  async updateEducation(userId: number, eduId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [current] = await this.db.select().from(onboardingEducation).where(eq(onboardingEducation.id, eduId)).limit(1);
      
      if (current?.hrStatus === 'rejected') {
        // Create new record for resubmission
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
        return inserted;
      }

      const [updated] = await this.db.update(onboardingEducation).set({
        degree: dto.degree,
        institution: dto.institution,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: dto.startDate ? (dto.startDate.length === 7 ? `${dto.startDate}-01` : dto.startDate) : null,
        endDate: dto.endDate ? (dto.endDate.length === 7 ? `${dto.endDate}-01` : dto.endDate) : null,
        grade: dto.grade,
        status: 'submitted',
        updatedAt: new Date(),
      }).where(eq(onboardingEducation.id, eduId)).returning();
      return updated;
    }

    throw new BadRequestException('Education details can only be modified during onboarding.');
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
        status: 'submitted',
        hrStatus: 'pending',
      }).returning();
      return inserted;
    }

    throw new BadRequestException('Experience details can only be modified during onboarding.');
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
      status: 'completed',
      updatedAt: new Date(),
    };

    if (isOnboarding) {
      const [current] = await this.db.select().from(onboardingExperience).where(eq(onboardingExperience.id, expId)).limit(1);

      if (current?.hrStatus === 'rejected') {
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
        return inserted;
      }

      const [updated] = await this.db.update(onboardingExperience).set({
        ...payload,
        status: 'submitted',
      }).where(eq(onboardingExperience.id, expId)).returning();
      return updated;
    }

    throw new BadRequestException('Experience details can only be modified during onboarding.');
  }


  // --- Bank Accounts ---

  async addBankDetails(userId: number, dto: any) {
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
      return inserted;
    }

    throw new BadRequestException('Bank details can only be modified during onboarding.');
  }

  async updateBankDetails(userId: number, bankId: number, dto: any) {
    const activeReqs = await this.db.select({ id: onboardingRequests.id, status: onboardingRequests.status })
      .from(onboardingRequests).where(eq(onboardingRequests.userId, userId)).orderBy(desc(onboardingRequests.createdAt)).limit(1);
    const isOnboarding = activeReqs.length > 0 && activeReqs[0].status !== 'fully_completed';

    if (isOnboarding) {
      const [updated] = await this.db.update(onboardingBankDetails).set({
        bankName: dto.bankName,
        accountHolderName: dto.accountHolderName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        branchName: dto.branchName || null,
        branchAddress: dto.branchAddress || null,
        upiId: dto.upiId || null,
        isPrimary: dto.isPrimary || false,
        status: 'completed',
        updatedAt: new Date(),
      }).where(eq(onboardingBankDetails.id, bankId)).returning();
      return updated;
    }

    throw new BadRequestException('Bank details can only be modified during onboarding.');
  }

  // --------- Experience Section -------------//

  async updateMyEducations(userId: number, body: any) {
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

    // Atomic sync: delete existing and re-insert
    await this.db.delete(onboardingEducation).where(eq(onboardingEducation.onboardingId, activeReqs[0].id));
    
    if (educations.length > 0) {
      await this.db.insert(onboardingEducation).values(educations.map((e: any) => ({
        onboardingId: activeReqs[0].id,
        degree: e.degree,
        institution: e.institution,
        fieldOfStudy: e.fieldOfStudy || null,
        startDate: e.startDate ? (e.startDate.length === 7 ? `${e.startDate}-01` : e.startDate) : null,
        endDate: e.endDate ? (e.endDate.length === 7 ? `${e.endDate}-01` : e.endDate) : null,
        grade: e.grade || null,
      })));
    }

    return { success: true };
  }

  async updateMyExperiences(userId: number, body: any) {
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

    // Atomic sync: delete existing and re-insert
    await this.db.delete(onboardingExperience).where(eq(onboardingExperience.onboardingId, activeReqs[0].id));
    
    if (experiences.length > 0) {
      await this.db.insert(onboardingExperience).values(experiences.map((e: any) => ({
        onboardingId: activeReqs[0].id,
        companyName: e.companyName,
        designation: e.designation,
        fromDate: e.fromDate || null,
        toDate: e.currentlyWorking ? null : (e.toDate || null),
        currentlyWorking: e.currentlyWorking === true || e.currentlyWorking === 'true',
        responsibilities: e.responsibilities || null,
      })));
    }

    return { success: true };
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

    // Edit mode: only allow Profile Photo
    if (dto.docType !== 'Profile Photo') {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('Documents can only be modified during onboarding.');
    }

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

    // Edit mode: only allow Profile Photo
    const [existing] = await this.db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, docId))
      .limit(1);

    if (!existing || existing.userId !== userId) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new NotFoundException('Document not found');
    }

    if (existing.docType !== 'Profile Photo') {
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('Documents can only be modified during onboarding.');
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
      await this.checkAndUpdateDocumentStatus(activeReqs[0].id);
      return;
    }
        const [existing] = await this.db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, docId))
      .limit(1);

    if (!existing) throw new NotFoundException('Document not found');
    if (existing.userId !== userId) throw new ForbiddenException('You do not own this document');

    if (existing.docType !== 'Profile Photo') {
      throw new BadRequestException('Documents can only be modified during onboarding.');
    }

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

  private async checkAndUpdateDocumentStatus(onboardingId: number) {
    const currentDocs = await this.db
      .select({ docType: onboardingDocuments.docType })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.onboardingId, onboardingId));

    const uploadedTypes = currentDocs.map((d) => d.docType);
    const allUploaded = REQUIRED_DOC_TYPES.every((type) => uploadedTypes.includes(type));

    const newStatus = allUploaded ? 'submitted' : 'pending';

    await this.db
      .update(onboardingRequests)
      .set({
        documentStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequests.id, onboardingId));
  }
}
