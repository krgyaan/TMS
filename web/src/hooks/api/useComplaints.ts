import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complaintsService } from "@/services/api/complaints.service";
import type { ComplaintListParams } from "@/services/api/complaints.service";
import type {
  Complaint,
  CreateComplaintDto,
} from "@/modules/hrms/complaints/helpers/types";
import type { PaginatedResult } from "@/types/api.types";
import { toast } from "sonner";
import { showErrorToast } from "@/utils/errorToast";

export const complaintsKey = {
  all: ["hrms", "complaints"] as const,
  mine: () => [...complaintsKey.all, "mine"] as const,
  lists: () => [...complaintsKey.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...complaintsKey.lists(), { filters }] as const,
};

/** Admin list — every complaint (Coordinator+ guarded server-side). */
export const useAllComplaints = (
  params: ComplaintListParams = {},
  sort?: { sortBy?: string; sortOrder?: "asc" | "desc" }
) => {
  const filters: ComplaintListParams = {
    ...params,
    ...(sort?.sortBy && { sortBy: sort.sortBy }),
    ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
  };

  return useQuery<PaginatedResult<Complaint>>({
    queryKey: complaintsKey.list(filters),
    queryFn: () => complaintsService.getAll(filters),
    placeholderData: (prev) => {
      if (prev && typeof prev === "object" && "data" in prev && "meta" in prev)
        return prev;
      return undefined;
    },
  });
};

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComplaintDto) => complaintsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsKey.all });
      toast.success("Complaint submitted successfully");
    },
    onError: showErrorToast,
  });
};
