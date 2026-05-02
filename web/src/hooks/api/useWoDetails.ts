import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { woDetailsService } from '@/services/api/wo-details.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { useTeamFilter } from '../useTeamFilter';
import { woBasicDetailsKeys } from './useWoBasicDetails';
import type { WoDetailsFilters, CreateWoDetailDto, UpdateWoDetailDto, RequestAmendmentDto, WoAcceptanceDecisionDto } from '@/modules/operations/types/wo.types';
import type { Page1FormValues, Page2FormValues, Page3FormValues, Page4FormValues, Page5FormValues, Page6FormValues, Page7FormValues, WizardValidationResult, PageData } from '@/modules/operations/wo-details/helpers/woDetail.types';

// QUERY KEYS
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
  wizardValidation: (id: number) => [...woDetailsKeys.all, 'wizard-validation', id] as const,
  pageData: (id: number, pageNum: number) => [...woDetailsKeys.all, 'page-data', id, pageNum] as const,
  draftState: (id: number, pageNum: number) => [...woDetailsKeys.all, 'draft', id, pageNum] as const,

  // Dashboard
  dashboardSummary: (teamId?: number) => [...woDetailsKeys.all, 'dashboard-summary', teamId] as const,
  pendingAcceptance: () => [...woDetailsKeys.all, 'pending-acceptance'] as const,
  pendingQueries: () => [...woDetailsKeys.all, 'pending-queries'] as const,
  amendmentsSummary: () => [...woDetailsKeys.all, 'amendments-summary'] as const,
  slaCompliance: () => [...woDetailsKeys.all, 'sla-compliance'] as const,
};

// WIZARD QUERY HOOKS (ESSENTIAL - USED BY FORMS)
console.log('🔷 woDetailsService:', woDetailsService);
console.log('🔷 Available methods:', Object.keys(woDetailsService));

export const useWoDetailByBasicDetail = (woBasicDetailId: number) => {
  return useQuery({
    queryKey: woDetailsKeys.byBasicDetail(woBasicDetailId),
    queryFn: () => woDetailsService.getByWoBasicDetailId(woBasicDetailId),
    enabled: !!woBasicDetailId && woBasicDetailId > 0,
  });
};

export const useWizardProgress = (woDetailId: number | null) => {
  return useQuery({
    queryKey: woDetailsKeys.wizardProgress(woDetailId || 0),
    queryFn: () => woDetailsService.getWizardProgress(woDetailId!),
    enabled: !!woDetailId && woDetailId > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useWizardValidation = (woDetailId: number | null) => {
  return useQuery<WizardValidationResult>({
    queryKey: woDetailsKeys.wizardValidation(woDetailId || 0),
    queryFn: () => woDetailsService.validateWizard(woDetailId!),
    enabled: false, // Manual trigger only
  });
};

// Generic page data hook with type parameter
export const usePageData = <T = PageData>(woDetailId: number | null, pageNum: number) => {
  return useQuery<T>({
    queryKey: woDetailsKeys.pageData(woDetailId || 0, pageNum),
    queryFn: () => woDetailsService.getPageData(woDetailId!, pageNum) as Promise<T>,
    enabled: !!woDetailId && woDetailId > 0 && pageNum >= 1 && pageNum <= 7,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Typed page data hooks for each page
export const usePage1Data = (woDetailId: number | null) => {
  return usePageData<Page1FormValues>(woDetailId, 1);
};

export const usePage2Data = (woDetailId: number | null) => {
  return usePageData<Page2FormValues>(woDetailId, 2);
};

export const usePage3Data = (woDetailId: number | null) => {
  return usePageData<Page3FormValues>(woDetailId, 3);
};

export const usePage4Data = (woDetailId: number | null) => {
  return usePageData<Page4FormValues>(woDetailId, 4);
};

export const usePage5Data = (woDetailId: number | null) => {
  return usePageData<Page5FormValues>(woDetailId, 5);
};

export const usePage6Data = (woDetailId: number | null) => {
  return usePageData<Page6FormValues>(woDetailId, 6);
};

export const usePage7Data = (woDetailId: number | null) => {
  return usePageData<Page7FormValues>(woDetailId, 7);
};

// WIZARD MUTATION HOOKS (ESSENTIAL - USED BY FORMS)
// Initialize wizard (create empty WoDetail)
export const useInitializeWizard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woBasicDetailId: number) => woDetailsService.initializeWizard(woBasicDetailId),
    onSuccess: (result, woBasicDetailId) => {
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.byBasicDetail(woBasicDetailId) });
      return result;
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Save page as draft (silent - no toast)
export const useSavePageDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      woDetailId,
      pageNum,
      data,
    }: {
      woDetailId: number;
      pageNum: number;
      data: any;
    }) => woDetailsService.savePageDraft(woDetailId, pageNum, data),
    onSuccess: (_, { woDetailId, pageNum }) => {
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.pageData(woDetailId, pageNum),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.wizardProgress(woDetailId),
        exact: true,
      });
      // Silent success for drafts - no toast
    },
    onError: (error: any) => {
      console.error('Draft save failed:', error);
      // Silent failure for auto-save - no toast
    },
  });
};

// Submit page (validate and save)
export const useSubmitPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      woDetailId,
      pageNum,
      data,
    }: {
      woDetailId: number;
      pageNum: number;
      data: any;
    }) => woDetailsService.submitPage(woDetailId, pageNum, data),
    onSuccess: (result, { woDetailId, pageNum }) => {
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.pageData(woDetailId, pageNum),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.wizardProgress(woDetailId),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.detail(woDetailId),
      });
      toast.success(`Page ${pageNum} saved successfully`);
      return result;
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Skip page
export const useSkipPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      woDetailId,
      pageNum,
      reason,
    }: {
      woDetailId: number;
      pageNum: number;
      reason?: string;
    }) => woDetailsService.skipPage(woDetailId, pageNum, reason),
    onSuccess: (_, { woDetailId }) => {
      queryClient.invalidateQueries({
        queryKey: woDetailsKeys.wizardProgress(woDetailId),
        exact: true,
      });
      toast.info('Page skipped');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Submit wizard for review
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

// AUTO-SAVE HOOK (ESSENTIAL - USED BY FORMS)
export const useAutoSave = (
  woDetailId: number | null,
  pageNum: number,
  enabled: boolean = true
) => {
  const { mutate: saveDraft, isPending } = useSavePageDraft();
  const lastSavedRef = useRef<string | null>(null);

  const debouncedSave = useDebouncedCallback((data: any) => {
    if (!woDetailId || woDetailId <= 0 || !enabled) return;

    const dataString = JSON.stringify(data);
    if (dataString === lastSavedRef.current) return; // No changes

    saveDraft(
      { woDetailId, pageNum, data },
      {
        onSuccess: () => {
          lastSavedRef.current = dataString;
        },
      }
    );
  }, 2000);

  const saveNow = useCallback(
    (data: any) => {
      if (!woDetailId || woDetailId <= 0) return;
      saveDraft({ woDetailId, pageNum, data });
    },
    [woDetailId, pageNum, saveDraft]
  );

  return {
    autoSave: debouncedSave,
    saveNow,
    isSaving: isPending,
  };
};

// PREFETCH HOOK (ESSENTIAL - USED BY WIZARD)
export const usePrefetchNextPage = (woDetailId: number | null, currentPage: number) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!woDetailId || woDetailId <= 0 || currentPage >= 7) return;

    const nextPage = currentPage + 1;
    queryClient.prefetchQuery({
      queryKey: woDetailsKeys.pageData(woDetailId, nextPage),
      queryFn: () => woDetailsService.getPageData(woDetailId, nextPage),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [woDetailId, currentPage, queryClient]);
};

// IMPORT/INTEGRATION HOOKS
export const useImportTenderContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      woBasicDetailId,
      woDetailId,
    }: {
      woBasicDetailId: number;
      woDetailId: number;
    }) => woDetailsService.importTenderContacts(woBasicDetailId, woDetailId),
    onSuccess: (data, { woDetailId }) => {
      queryClient.setQueryData(woDetailsKeys.pageData(woDetailId, 1), (old: any) => ({
        ...old,
        contacts: data.contacts,
      }));
      toast.success('Tender contacts imported');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useFetchCostingData = (woBasicDetailId: number) => {
  return useQuery({
    queryKey: ['pricing', 'costing-sheet', woBasicDetailId],
    queryFn: () => woDetailsService.getCostingSheetData(woBasicDetailId),
    enabled: !!woBasicDetailId && woBasicDetailId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// BASIC QUERY HOOKS
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
    enabled: !!id && id > 0,
  });
};

export const useAcceptanceStatus = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.acceptanceStatus(id),
    queryFn: () => woDetailsService.getAcceptanceStatus(id),
    enabled: !!id && id > 0,
  });
};

export const useWoTimeline = (id: number) => {
  return useQuery({
    queryKey: woDetailsKeys.timeline(id),
    queryFn: () => woDetailsService.getTimeline(id),
    enabled: !!id && id > 0,
  });
};

// DASHBOARD QUERY HOOKS
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

// BASIC MUTATION HOOKS
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
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.wizardProgress(id) });
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

// Legacy alias for backward compatibility
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

// ACCEPTANCE WORKFLOW MUTATIONS
export const useAcceptWo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { tlId?: number; notes?: string } }) =>
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
