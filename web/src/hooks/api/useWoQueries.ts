import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woQueriesService } from '@/services/api/wo-queries.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { woDetailsKeys } from './useWoDetails';
import type {
  WoQueriesFilters,
  CreateWoQueryDto,
  CreateBulkWoQueriesDto,
  RespondToQueryDto,
  CloseQueryDto,
  UpdateQueryStatusDto,
} from '@/modules/operations/types/wo.types';

// ============================================
// QUERY KEYS
// ============================================

export const woQueriesKeys = {
  all: ['wo-queries'] as const,
  lists: () => [...woQueriesKeys.all, 'list'] as const,
  list: (filters?: WoQueriesFilters) => [...woQueriesKeys.lists(), filters] as const,
  details: () => [...woQueriesKeys.all, 'detail'] as const,
  detail: (id: number) => [...woQueriesKeys.details(), id] as const,
  byWoDetail: (woDetailId: number) => [...woQueriesKeys.all, 'by-wo-detail', woDetailId] as const,
  pendingByWoDetail: (woDetailId: number) => [...woQueriesKeys.all, 'pending-by-wo-detail', woDetailId] as const,
  byUser: (userId: number, type: string) => [...woQueriesKeys.all, 'by-user', userId, type] as const,
  allPending: () => [...woQueriesKeys.all, 'all-pending'] as const,
  allOverdue: () => [...woQueriesKeys.all, 'all-overdue'] as const,
  dashboardSummary: () => [...woQueriesKeys.all, 'dashboard-summary'] as const,
  responseTimeStats: () => [...woQueriesKeys.all, 'response-time-stats'] as const,
  userStats: (userId: number) => [...woQueriesKeys.all, 'user-stats', userId] as const,
  slaStatus: (woDetailId: number) => [...woQueriesKeys.all, 'sla-status', woDetailId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

export const useWoQueries = (filters?: WoQueriesFilters) => {
  return useQuery({
    queryKey: woQueriesKeys.list(filters),
    queryFn: () => woQueriesService.getAll(filters),
  });
};

export const useWoQueryById = (id: number) => {
  return useQuery({
    queryKey: woQueriesKeys.detail(id),
    queryFn: () => woQueriesService.getById(id),
    enabled: !!id,
  });
};

export const useWoQueriesByWoDetail = (woDetailId: number) => {
  return useQuery({
    queryKey: woQueriesKeys.byWoDetail(woDetailId),
    queryFn: () => woQueriesService.getByWoDetailId(woDetailId),
    enabled: !!woDetailId,
  });
};

export const usePendingQueriesByWoDetail = (woDetailId: number) => {
  return useQuery({
    queryKey: woQueriesKeys.pendingByWoDetail(woDetailId),
    queryFn: () => woQueriesService.getPendingByWoDetail(woDetailId),
    enabled: !!woDetailId,
  });
};

export const useQueriesByUser = (userId: number, type: 'raised' | 'received' = 'raised') => {
  return useQuery({
    queryKey: woQueriesKeys.byUser(userId, type),
    queryFn: () => woQueriesService.getByUser(userId, type),
    enabled: !!userId,
  });
};

export const useAllPendingQueries = () => {
  return useQuery({
    queryKey: woQueriesKeys.allPending(),
    queryFn: () => woQueriesService.getAllPending(),
  });
};

export const useAllOverdueQueries = () => {
  return useQuery({
    queryKey: woQueriesKeys.allOverdue(),
    queryFn: () => woQueriesService.getAllOverdue(),
  });
};

export const useQueriesDashboardSummary = () => {
  return useQuery({
    queryKey: woQueriesKeys.dashboardSummary(),
    queryFn: () => woQueriesService.getDashboardSummary(),
  });
};

export const useResponseTimeStatistics = () => {
  return useQuery({
    queryKey: woQueriesKeys.responseTimeStats(),
    queryFn: () => woQueriesService.getResponseTimeStatistics(),
  });
};

export const useUserQueryStatistics = (userId: number) => {
  return useQuery({
    queryKey: woQueriesKeys.userStats(userId),
    queryFn: () => woQueriesService.getUserQueryStatistics(userId),
    enabled: !!userId,
  });
};

export const useQuerySlaStatus = (woDetailId: number) => {
  return useQuery({
    queryKey: woQueriesKeys.slaStatus(woDetailId),
    queryFn: () => woQueriesService.getSlaStatus(woDetailId),
    enabled: !!woDetailId,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

export const useCreateWoQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoQueryDto) => woQueriesService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.timeline(data.woDetailId) });
      toast.success('Query created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useCreateBulkWoQueries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBulkWoQueriesDto) => woQueriesService.createBulk(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.timeline(data.woDetailId) });
      toast.success('Queries created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useRespondToQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RespondToQueryDto }) =>
      woQueriesService.respond(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      if (result.withinSla) {
        toast.success(`Query responded successfully (${result.responseTimeHours.toFixed(1)} hours)`);
      } else {
        toast.warning(`Query responded (${result.responseTimeHours.toFixed(1)} hours - exceeded SLA)`);
      }
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useCloseQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: CloseQueryDto }) =>
      woQueriesService.close(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      toast.success('Query closed successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateQueryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQueryStatusDto }) =>
      woQueriesService.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      toast.success('Query status updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useReopenQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woQueriesService.reopen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      toast.success('Query reopened successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoQuery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woQueriesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woQueriesKeys.all });
      toast.success('Query deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
