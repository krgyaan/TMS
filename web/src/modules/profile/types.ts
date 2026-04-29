export type UserData = {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  team: string;
};

export type ProfileData = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  personalEmail: string;
  phone: string;
  alternatePhone: string;
  aadharNumber: string;
  panNumber: string;
  employeeCode: string;
  altEmail: string;
  bloodGroup: string;
  linkedinProfile: string;
};

export type EmployeeProfileData = {
  employeeType: string;
  employeeStatus: string;
  workLocation: string;
  officialEmail: string;
  reportingManager: string;
  probationMonths: number;
  probationEndDate: string;
  salaryType: string;
  uanNumber: string;
  pfNumber: string;
  esicNumber: string;
  offerLetterDate: string;
  joiningLetterIssued: boolean;
  inductionCompleted: boolean;
  inductionDate: string;
  idCardIssued: boolean;
  idCardIssuedDate: string;
  joiningDate: string;
  designation: string;
  department: string;
};

export type AddressData = {
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentCity: string;
  currentState: string;
  currentCountry: string;
  currentPostalCode: string;
  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentCity: string;
  permanentState: string;
  permanentCountry: string;
  permanentPostalCode: string;
};

export type EmergencyContactData = {
  name: string;
  relationship: string;
  phone: string;
  altPhone: string;
  email: string;
};

export type DocumentData = {
  id: number;
  docCategory: string;
  docType: string;
  docNumber: string | null;
  fileUrl: string;
  fileName: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: string;
  verifiedBy: string | null;
  verificationDate: string | null;
  remarks: string | null;
  uploadedAt: string | null;
};

export type InductionTaskData = {
  id: number;
  taskName: string;
  taskType: string;
  status: string;
  completedAt: string | null;
  remarks: string | null;
};

export type EducationData = {
  id: number;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  status: string;
};

export type ExperienceData = {
  id: number;
  companyName: string;
  designation: string;
  fromDate: string;
  toDate: string | null;
  currentlyWorking: boolean;
  responsibilities: string | null;
  status: string;
};

export type BankDetailData = {
  id: number;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string | null;
  branchAddress: string | null;
  upiId: string | null;
  isPrimary: boolean;
  status: string;
};

export type ProfileResponse = {
  currentUser: UserData;
  isOnboarding: boolean;
  profile: ProfileData | null;
  employeeProfile: EmployeeProfileData | null;
  address: AddressData | null;
  emergencyContact: EmergencyContactData | null;
  documents: DocumentData[];
  education: EducationData[];
  experience: ExperienceData[];
  bankAccounts: BankDetailData[];
  inductionTasks: InductionTaskData[];
  assets: AssetData[];
  complaints: ComplaintData[];
  notifications: NotificationData[];
  onboardingStatus: OnboardingStatus | null;
};


export type OnboardingStageStatus = "pending" | "submitted";
export type OnboardingApprovalStatus = "pending" | "approved" | "rejected";

export type OnboardingStatus = {
  id: number;
  requestType: "new_hire" | "re_onboarding";
  status: "pending" | "approved" | "rejected" | "fully_completed";
  
  // Employee Progress Statuses
  profileStatus: OnboardingStageStatus;
  documentStatus: OnboardingStageStatus;
  bankStatus: OnboardingStageStatus;
  educationStatus: OnboardingStageStatus;
  experienceStatus: OnboardingStageStatus;
  inductionStatus: OnboardingStageStatus;
  
  // HR Approval Statuses
  profileHrStatus: OnboardingApprovalStatus;
  bankHrStatus: OnboardingApprovalStatus;
  educationHrStatus: OnboardingApprovalStatus;
  experienceHrStatus: OnboardingApprovalStatus;
  documentHrStatus: OnboardingApprovalStatus;
  
  progress: number;
  
  /** HR remarks shown on stage cards when rejected */
  profileHrRemark?: string | null;
  bankHrRemark?: string | null;
  educationHrRemark?: string | null;
  experienceHrRemark?: string | null;
  documentHrRemark?: string | null;

  employeeCompleted: boolean;
  hrCompleted: boolean;
  
  createdAt: string;
  updatedAt: string;
};







export type AssetData = {
  id: number;
  assetCode: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber: string;
  assetCondition: string;
  assignedDate: string;
  assetStatus: string;
};

export type NotificationData = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "error" | "warning" | "info";
};

export type ComplaintData = {
  id: number;
  complaintCode: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
};