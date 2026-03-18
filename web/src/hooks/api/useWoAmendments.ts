import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woAmendmentsService } from '@/services/api/wo-amendments.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { woDetailsKeys } from './useWoDetails';
import type {
  WoAmendmentsFilters,
  CreateWoAmendmentDto,
  UpdateWoAmendmentDto,
  CreateBulkWoAmendmentsDto,
} from '@/modules/operations/types/wo.types';

// ============================================
// QUERY KEYS
// ============================================

export const woAmendmentsKeys = {
  all: ['wo-amendments'] as const,
  lists: () => [...woAmendmentsKeys.all, 'list'] as const,
  list: (filters?: WoAmendmentsFilters) => [...woAmendmentsKeys.lists(), filters] as const,
  details: () => [...woAmendmentsKeys.all, 'detail'] as const,
  detail: (id: number) => [...woAmendmentsKeys.details(), id] as const,
  byWoDetail: (woDetailId: number) => [...woAmendmentsKeys.all, 'by-wo-detail', woDetailId] as const,
  summary: (woDetailId: number) => [...woAmendmentsKeys.all, 'summary', woDetailId] as const,
  topClauses: () => [...woAmendmentsKeys.all, 'top-clauses'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

export const useWoAmendments = (filters?: WoAmendmentsFilters) => {
  return useQuery({
    queryKey: woAmendmentsKeys.list(filters),
    queryFn: () => woAmendmentsService.getAll(filters),
  });
};

export const useWoAmendmentById = (id: number) => {
  return useQuery({
    queryKey: woAmendmentsKeys.detail(id),
    queryFn: () => woAmendmentsService.getById(id),
    enabled: !!id && id > 0,
  });
};

export const useWoAmendmentsByWoDetail = (woDetailId: number) => {
  return useQuery({
    queryKey: woAmendmentsKeys.byWoDetail(woDetailId),
    queryFn: () => woAmendmentsService.getByWoDetailId(woDetailId),
    enabled: !!woDetailId && woDetailId > 0,
  });
};

export const useAmendmentsSummary = (woDetailId: number) => {
  return useQuery({
    queryKey: woAmendmentsKeys.summary(woDetailId),
    queryFn: () => woAmendmentsService.getAmendmentsSummary(woDetailId),
    enabled: !!woDetailId && woDetailId > 0,
  });
};

export const useTopClausesStatistics = () => {
  return useQuery({
    queryKey: woAmendmentsKeys.topClauses(),
    queryFn: () => woAmendmentsService.getTopClausesStatistics(),
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

export const useCreateWoAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoAmendmentDto) => woAmendmentsService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(data.woDetailId) });
      toast.success('Amendment created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useCreateBulkWoAmendments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBulkWoAmendmentsDto) => woAmendmentsService.createBulk(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(data.woDetailId) });
      toast.success('Amendments created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWoAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWoAmendmentDto }) =>
      woAmendmentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Amendment updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woAmendmentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Amendment deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteAllAmendmentsByWoDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woDetailId: number) => woAmendmentsService.removeAllByWoDetail(woDetailId),
    onSuccess: (_, woDetailId) => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.byWoDetail(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(woDetailId) });
      toast.success('All amendments deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// TL Review Actions
export const useApproveAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      woAmendmentsService.approveAmendment(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Amendment approved');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useRejectAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      woAmendmentsService.rejectAmendment(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Amendment rejected');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Client Communication
export const useMarkAmendmentCommunicated = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woAmendmentsService.markCommunicated(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Marked as communicated');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useRecordClientResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, response, proof }: { id: number; response: string; proof?: string }) =>
      woAmendmentsService.recordClientResponse(id, response, proof),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Client response recorded');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useResolveAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woAmendmentsService.markResolved(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woAmendmentsKeys.all });
      toast.success('Amendment resolved');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
