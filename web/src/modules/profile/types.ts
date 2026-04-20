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
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
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
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: string;
  remarks: string | null;
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

export type ProfileResponse = {
  currentUser: UserData;
  profile: ProfileData | null;
  employeeProfile: EmployeeProfileData | null;
  address: AddressData | null;
  emergencyContact: EmergencyContactData | null;
  documents: DocumentData[];
  assets: AssetData[];
  complaints: ComplaintData[];
  notifications: NotificationData[];
};
