import { axiosInstance } from "@/lib/axios";

// ─── Onboarding Dashboard ─────────────────────────────────────────────────────

export interface OnboardingRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  profileStatus: string;
  documentStatus: string;
  inductionStatus: string;
  progress: number;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
}

export interface UpdateStatusDto {
  status: "approved" | "rejected";
  note?: string;
}

// ─── Profile Details ──────────────────────────────────────────────────────────

/** Shape returned by GET /hrms/onboarding/profiles (tracker list) */
export interface ProfileListItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  profileStatus: string;
  progress: number;
  approvedAt: string | null;
  updatedAt: string;
  reviewedBy: string | null;
  // HR Fields
  employeeType: string | null;
  workLocation: string | null;
  dateOfJoining: string | null;
  salaryType: string | null;
  basicSalary: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  hrCompleted: boolean;
  employeeCompleted: boolean;
}

/** Shape returned by GET /hrms/onboarding/:id/profile (full profile) */
export interface FullProfile {
  id: number;
  onboardingId: number;
  // Request fields
  name: string;
  email: string;
  phone: string;
  status: string;
  profileStatus: string;
  progress: number;
  approvedAt: string | null;
  reviewedBy: string | null;
  // Personal
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dob: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  aadharNumber: string | null;
  panNumber: string | null;
  currentAddress: Record<string, any>;
  permanentAddress: Record<string, any>;
  emergencyContact: Record<string, any>;
  // HR
  employeeType: string | null;
  workLocation: string | null;
  dateOfJoining: string | null;
  probationMonths: number | null;
  probationEndDate: string | null;
  salaryType: string | null;
  basicSalary: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  hrCompleted: boolean;
  employeeCompleted: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface UpdateProfileDto {
  employeeType?: string;
  workLocation?: string;
  dateOfJoining?: string;
  probationMonths?: number;
  probationEndDate?: string;
  salaryType?: string;
  basicSalary?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  hrCompleted?: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const onboardingService = {
  // Dashboard
  getDashboard: async (): Promise<OnboardingRequest[]> => {
    const { data } = await axiosInstance.get("/hrms/onboarding/dashboard");
    return data;
  },

  updateStatus: async (id: number, dto: UpdateStatusDto): Promise<OnboardingRequest> => {
    const { data } = await axiosInstance.patch(`/hrms/onboarding/${id}/status`, dto);
    return data;
  },

  deleteRequest: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/hrms/onboarding/${id}`);
  },

  // Profiles
  getProfileList: async (): Promise<ProfileListItem[]> => {
    const { data } = await axiosInstance.get("/hrms/onboarding/profiles");
    return data;
  },

  getProfile: async (id: number): Promise<FullProfile> => {
    const { data } = await axiosInstance.get(`/hrms/onboarding/${id}/profile`);
    return data;
  },

  updateProfile: async (id: number, dto: UpdateProfileDto): Promise<FullProfile> => {
    const { data } = await axiosInstance.patch(`/hrms/onboarding/${id}/profile`, dto);
    return data;
  },

  // Documents
  getDocumentTrackerList: async (): Promise<any[]> => {
    const { data } = await axiosInstance.get("/hrms/onboarding/documents-tracker");
    return data;
  },

  getEmployeeDocuments: async (id: number): Promise<any[]> => {
    const { data } = await axiosInstance.get(`/hrms/onboarding/${id}/documents`);
    return data;
  },

  verifyDocument: async (id: number, docId: number, status: string, reason?: string): Promise<void> => {
    await axiosInstance.patch(`/hrms/onboarding/${id}/documents/${docId}/verify`, { status, reason });
  },

  // Induction
  getInductionTrackerList: async (): Promise<any[]> => {
    const { data } = await axiosInstance.get("/hrms/onboarding/induction-tracker");
    return data;
  },

  getEmployeeInduction: async (id: number): Promise<any[]> => {
    const { data } = await axiosInstance.get(`/hrms/onboarding/${id}/induction`);
    return data;
  },

  updateInductionTask: async (id: number, taskId: number, updates: { status?: string; remarks?: string }): Promise<void> => {
    await axiosInstance.patch(`/hrms/onboarding/${id}/induction/${taskId}`, updates);
  },
};
