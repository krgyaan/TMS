import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "@/services/api/onboarding.service";
import type { OnboardingRequest, UpdateStatusDto, UpdateProfileDto } from "@/services/api/onboarding.service";
import { toast } from "sonner";

// ─── Dashboard hooks ──────────────────────────────────────────────────────────

export const useOnboardingDashboard = () => {
  return useQuery({
    queryKey: ["onboarding", "dashboard"],
    queryFn: onboardingService.getDashboard,
  });
};

export const useUpdateOnboardingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateStatusDto }) =>
      onboardingService.updateStatus(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "dashboard"] });
      toast.success("Status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });
};

export const useDeleteOnboardingRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: onboardingService.deleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "dashboard"] });
      toast.success("Request deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete request");
    },
  });
};

// ─── Profile hooks ────────────────────────────────────────────────────────────

/** Fetch the tracker list (all approved employees + HR completion data) */
export const useProfileList = () => {
  return useQuery({
    queryKey: ["onboarding", "profiles"],
    queryFn: onboardingService.getProfileList,
  });
};

/** Fetch one employee's full profile */
export const useProfile = (id: number | null) => {
  return useQuery({
    queryKey: ["onboarding", "profile", id],
    queryFn: () => onboardingService.getProfile(id!),
    enabled: id !== null,
  });
};

/** HR submits employment / compensation / bank details */
export const useUpdateProfile = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => onboardingService.updateProfile(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "profile", id] });
      toast.success("Profile saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save profile");
    },
  });
};

// ─── Document hooks ───────────────────────────────────────────────────────────

export const useDocumentTrackerList = () => {
  return useQuery({
    queryKey: ["onboarding", "documents-tracker"],
    queryFn: onboardingService.getDocumentTrackerList,
  });
};

export const useEmployeeDocuments = (id: number | null) => {
  return useQuery({
    queryKey: ["onboarding", "documents", id],
    queryFn: () => onboardingService.getEmployeeDocuments(id!),
    enabled: !!id,
  });
};

export const useVerifyDocument = (onboardingId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docId, status, reason }: { docId: number; status: string; reason?: string }) =>
      onboardingService.verifyDocument(onboardingId, docId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "documents-tracker"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "documents", onboardingId] });
      toast.success("Document updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update document");
    },
  });
};

// ─── Induction hooks ──────────────────────────────────────────────────────────

export const useInductionTrackerList = () => {
  return useQuery({
    queryKey: ["onboarding", "induction-tracker"],
    queryFn: onboardingService.getInductionTrackerList,
  });
};

export const useEmployeeInduction = (id: number | null) => {
  return useQuery({
    queryKey: ["onboarding", "induction", id],
    queryFn: () => onboardingService.getEmployeeInduction(id!),
    enabled: !!id,
  });
};

export const useUpdateInductionTask = (onboardingId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: { status?: string; remarks?: string } }) =>
      onboardingService.updateInductionTask(onboardingId, taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", "induction-tracker"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding", "induction", onboardingId] });
      toast.success("Task updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update task");
    },
  });
};
