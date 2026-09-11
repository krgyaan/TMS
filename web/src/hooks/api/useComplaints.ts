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
  details: () => [...complaintsKey.all, "detail"] as const,
  detail: (id: number) => [...complaintsKey.details(), id] as const,
};

/** Single enriched complaint (view page). */
export const useComplaint = (id: number | null) => {
  return useQuery({
    queryKey: id ? complaintsKey.detail(id) : complaintsKey.detail(0),
    queryFn: () => complaintsService.getById(id!),
    enabled: !!id,
  });
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

/** HR/admin lifecycle status update. */
export const useUpdateComplaintStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { status: string; remarks?: string };
    }) => complaintsService.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintsKey.all });
      toast.success("Status updated successfully");
    },
    onError: showErrorToast,
  });
};
