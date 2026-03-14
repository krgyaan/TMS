import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woDetailsService } from '@/services/api/wo-details.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { woBasicDetailsKeys } from './useWoBasicDetails';
import type {
  WoDetailsFilters,
  CreateWoDetailDto,
  UpdateWoDetailDto,
  AcceptWoDto,
  RequestAmendmentDto,
  WoAcceptanceDecisionDto,
} from '@/modules/operations/types/wo.types';

// ============================================
// QUERY KEYS
// ============================================

export const woDetailsKeys = {
  all: ['wo-details'] as const,
  lists: () => [...woDetailsKeys.all, 'list'] as const,
  list: (filters?: WoDetailsFilters) => [...woDetailsKeys.lists(), filters] as const,
  details: () => [...woDetailsKeys.all, 'detail'] as const,
  detail: (id: number) => [...woDetailsKeys.details(), id] as const,
  detailWithRelations: (id: number) => [...woDetailsKeys.details(), id, 'with-relations'] as const,
  byBasicDetail: (woBasicDetailId: number) => [...woDetailsKeys.all, 'by-basic-detail', woBasicDetailId] as const,
  acceptanceStatus: (id: number) => [...woDetailsKeys.all, 'acceptance-status', id] as const,
  timeline: (id: number) => [...woDetailsKeys.all, 'timeline', id] as const,
  dashboardSummary: () => [...woDetailsKeys.all, 'dashboard-summary'] as const,
  pendingAcceptance: () => [...woDetailsKeys.all, 'pending-acceptance'] as const,
  pendingQueries: () => [...woDetailsKeys.all, 'pending-queries'] as const,
  amendmentsSummary: () => [...woDetailsKeys.all, 'amendments-summary'] as const,
  slaCompliance: () => [...woDetailsKeys.all, 'sla-compliance'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

export const useWoDetails = (filters?: WoDetailsFilters) => {
  return useQuery({
    queryKey: woDetailsKeys.list(filters),
    queryFn: () => woDetailsService.getAll(filters),
  });
};

export const useWoDetailById = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.detail(id),
    queryFn: () => woDetailsService.getById(id),
    enabled: !!id,
  });
};

export const useWoDetailWithRelations = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.detailWithRelations(id),
    queryFn: () => woDetailsService.getByIdWithRelations(id),
    enabled: !!id,
  });
};

export const useWoDetailByBasicDetail = (woBasicDetailId: number) => {
  return useQuery({
    queryKey: woDetailsKeys.byBasicDetail(woBasicDetailId),
    queryFn: () => woDetailsService.getByWoBasicDetailId(woBasicDetailId),
    enabled: !!woBasicDetailId,
  });
};

export const useAcceptanceStatus = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.acceptanceStatus(id),
    queryFn: () => woDetailsService.getAcceptanceStatus(id),
    enabled: !!id,
  });
};

export const useWoTimeline = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.timeline(id),
    queryFn: () => woDetailsService.getTimeline(id),
    enabled: !!id,
  });
};

export const useWoDetailsDashboardSummary = () => {
  return useQuery({
    queryKey: woDetailsKeys.dashboardSummary(),
    queryFn: () => woDetailsService.getDashboardSummary(),
  });
};

export const usePendingAcceptance = () => {
  return useQuery({
    queryKey: woDetailsKeys.pendingAcceptance(),
    queryFn: () => woDetailsService.getPendingAcceptance(),
  });
};

export const useAllPendingQueries = () => {
  return useQuery({
    queryKey: woDetailsKeys.pendingQueries(),
    queryFn: () => woDetailsService.getAllPendingQueries(),
  });
};

export const useAmendmentsSummaryDashboard = () => {
  return useQuery({
    queryKey: woDetailsKeys.amendmentsSummary(),
    queryFn: () => woDetailsService.getAmendmentsSummary(),
  });
};

export const useSlaComplianceReport = () => {
  return useQuery({
    queryKey: woDetailsKeys.slaCompliance(),
    queryFn: () => woDetailsService.getSlaComplianceReport(),
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

export const useCreateWoDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoDetailDto) => woDetailsService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(data.woBasicDetailId) });
      toast.success('WO Detail created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWoDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWoDetailDto }) =>
      woDetailsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(id) });
      toast.success('WO Detail updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woDetailsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      toast.success('WO Detail deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Acceptance Workflow Mutations
export const useAcceptWo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AcceptWoDto }) =>
      woDetailsService.acceptWo(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.acceptanceStatus(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.pendingAcceptance() });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      toast.success('WO accepted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useRequestAmendment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RequestAmendmentDto }) =>
      woDetailsService.requestAmendment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.acceptanceStatus(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      toast.success('Amendment requested successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useMakeAcceptanceDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WoAcceptanceDecisionDto }) =>
      woDetailsService.makeAcceptanceDecision(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.acceptanceStatus(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.pendingAcceptance() });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      toast.success('Decision recorded successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
