import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woDetailsService } from '@/services/api/wo-details.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { useTeamFilter } from '../useTeamFilter';
import { woBasicDetailsKeys } from './useWoBasicDetails';
import type {
  WoDetailsFilters,
  CreateWoDetailDto,
  UpdateWoDetailDto,
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

  // Wizard-specific keys
  wizardProgress: (id: number) => [...woDetailsKeys.all, 'wizard-progress', id] as const,
  pageData: (id: number, pageNum: number) => [...woDetailsKeys.all, 'page-data', id, pageNum] as const,

  // Dashboard
  dashboardSummary: (teamId?: number) => [...woDetailsKeys.all, 'dashboard-summary', teamId] as const,
  pendingAcceptance: () => [...woDetailsKeys.all, 'pending-acceptance'] as const,
  pendingQueries: () => [...woDetailsKeys.all, 'pending-queries'] as const,
  amendmentsSummary: () => [...woDetailsKeys.all, 'amendments-summary'] as const,
  slaCompliance: () => [...woDetailsKeys.all, 'sla-compliance'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

export const useWoDetails = (filters?: WoDetailsFilters) => {
  const { teamId, userId, dataScope } = useTeamFilter();

  const combinedFilters = {
    ...filters,
    teamId: (filters?.teamId || teamId) ?? undefined,
    userId: (filters?.userId || userId) ?? undefined,
    dataScope: filters?.dataScope || dataScope,
  };

  return useQuery({
    queryKey: woDetailsKeys.list(combinedFilters),
    queryFn: () => woDetailsService.getAll(combinedFilters),
  });
};

export const useWoDetailById = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.detail(id),
    queryFn: () => woDetailsService.getById(id),
    enabled: !!id && id > 0,
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
    enabled: !!woBasicDetailId && woBasicDetailId > 0,
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

// ============================================
// WIZARD QUERY HOOKS (NEW)
// ============================================

export const useWizardProgress = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.wizardProgress(id),
    queryFn: () => woDetailsService.getWizardProgress(id),
    enabled: !!id && id > 0,
  });
};

export const usePageData = (woDetailId: number, pageNum: number) => {
  return useQuery({
    queryKey: woDetailsKeys.pageData(woDetailId, pageNum),
    queryFn: () => woDetailsService.getPageData(woDetailId, pageNum),
    enabled: !!woDetailId && woDetailId > 0 && pageNum >= 1 && pageNum <= 7,
  });
};

// ============================================
// DASHBOARD QUERY HOOKS
// ============================================

export const useWoDetailsDashboardSummary = () => {
  const { teamId } = useTeamFilter();

  return useQuery({
    queryKey: woDetailsKeys.dashboardSummary(teamId ?? undefined),
    queryFn: () => woDetailsService.getDashboardSummary(teamId ?? undefined),
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
    onSuccess: (result, data) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(data.woBasicDetailId) });
      toast.success('WO Detail created successfully');
      return result;
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

// ============================================
// WIZARD MUTATION HOOKS (NEW)
// ============================================

export const useSavePageData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woDetailId, pageNum, data }: { woDetailId: number; pageNum: number; data: any }) =>
      woDetailsService.savePage(woDetailId, pageNum, data),
    onSuccess: (_, { woDetailId, pageNum }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.wizardProgress(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.pageData(woDetailId, pageNum) });
      toast.success('Page saved as draft');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useSubmitPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woDetailId, pageNum, data }: { woDetailId: number; pageNum: number; data: any }) =>
      woDetailsService.submitPage(woDetailId, pageNum, data),
    onSuccess: (_, { woDetailId, pageNum }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.wizardProgress(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.pageData(woDetailId, pageNum) });
      toast.success(`Page ${pageNum} submitted successfully`);
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useSkipPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woDetailId, pageNum, reason }: { woDetailId: number; pageNum: number; reason?: string }) =>
      woDetailsService.skipPage(woDetailId, pageNum, reason),
    onSuccess: (_, { woDetailId, pageNum }) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.wizardProgress(woDetailId) });
      toast.info(`Page ${pageNum} skipped`);
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useSubmitForReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woDetailId: number) => woDetailsService.submitForReview(woDetailId),
    onSuccess: (_, woDetailId) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.wizardProgress(woDetailId) });
      toast.success('WO Details submitted for TL review');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// ============================================
// ACCEPTANCE WORKFLOW MUTATIONS
// ============================================

export const useAcceptWo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: {tlId?: number; notes?: string;} }) =>
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
