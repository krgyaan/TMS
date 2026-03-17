import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woBasicDetailsService } from '@/services/api/wo-basic-details.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import type {
  WoBasicDetailsFilters,
  CreateWoBasicDetailDto,
  UpdateWoBasicDetailDto,
  AssignOeDto,
  BulkAssignOeDto,
  RemoveOeAssignmentDto,
  PauseWorkflowDto,
  ResumeWorkflowDto,
  UpdateWorkflowStageDto,
} from '@/modules/operations/types/wo.types';

// ============================================
// QUERY KEYS
// ============================================

export const woBasicDetailsKeys = {
  all: ['wo-basic-details'] as const,
  lists: () => [...woBasicDetailsKeys.all, 'list'] as const,
  list: (filters?: WoBasicDetailsFilters) => [...woBasicDetailsKeys.lists(), filters] as const,
  details: () => [...woBasicDetailsKeys.all, 'detail'] as const,
  detail: (id: number) => [...woBasicDetailsKeys.details(), id] as const,
  detailWithRelations: (id: number) => [...woBasicDetailsKeys.details(), id, 'with-relations'] as const,
  oeAssignments: (id: number) => [...woBasicDetailsKeys.all, 'oe-assignments', id] as const,
  byTender: (tenderId: number) => [...woBasicDetailsKeys.all, 'by-tender', tenderId] as const,
  byEnquiry: (enquiryId: number) => [...woBasicDetailsKeys.all, 'by-enquiry', enquiryId] as const,
  dashboardSummary: () => [...woBasicDetailsKeys.all, 'dashboard-summary'] as const,
  pendingAssignments: () => [...woBasicDetailsKeys.all, 'pending-assignments'] as const,
  workflowStatus: () => [...woBasicDetailsKeys.all, 'workflow-status'] as const,
  projectCodeCheck: (code: string) => [...woBasicDetailsKeys.all, 'project-code-check', code] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

export const useWoBasicDetails = (filters?: WoBasicDetailsFilters) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.list(filters),
    queryFn: () => woBasicDetailsService.getAll(filters),
  });
};

export const useWoBasicDetailById = (id: number) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.detail(id),
    queryFn: () => woBasicDetailsService.getById(id),
    enabled: !!id,
  });
};

export const useWoBasicDetailWithRelations = (id: number) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.detailWithRelations(id),
    queryFn: () => woBasicDetailsService.getByIdWithRelations(id),
    enabled: !!id,
  });
};

export const useWoBasicDetailsByTender = (tenderId: number) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.byTender(tenderId),
    queryFn: () => woBasicDetailsService.getByTenderId(tenderId),
    enabled: !!tenderId,
  });
};

export const useWoBasicDetailsByEnquiry = (enquiryId: number) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.byEnquiry(enquiryId),
    queryFn: () => woBasicDetailsService.getByEnquiryId(enquiryId),
    enabled: !!enquiryId,
  });
};

export const useOeAssignments = (id: number) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.oeAssignments(id),
    queryFn: () => woBasicDetailsService.getOeAssignments(id),
    enabled: !!id,
  });
};

export const useWoBasicDetailsDashboardSummary = () => {
  return useQuery({
    queryKey: woBasicDetailsKeys.dashboardSummary(),
    queryFn: () => woBasicDetailsService.getDashboardSummary(),
  });
};

export const usePendingOeAssignments = () => {
  return useQuery({
    queryKey: woBasicDetailsKeys.pendingAssignments(),
    queryFn: () => woBasicDetailsService.getPendingOeAssignments(),
  });
};

export const useWorkflowStatusSummary = () => {
  return useQuery({
    queryKey: woBasicDetailsKeys.workflowStatus(),
    queryFn: () => woBasicDetailsService.getWorkflowStatusSummary(),
  });
};

export const useCheckProjectCode = (projectCode: string) => {
  return useQuery({
    queryKey: woBasicDetailsKeys.projectCodeCheck(projectCode),
    queryFn: () => woBasicDetailsService.checkProjectCodeExists(projectCode),
    enabled: !!projectCode && projectCode.length > 0,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

export const useCreateWoBasicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoBasicDetailDto) => woBasicDetailsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      toast.success('WO Basic Detail created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWoBasicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWoBasicDetailDto }) =>
      woBasicDetailsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      toast.success('WO Basic Detail updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoBasicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woBasicDetailsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      toast.success('WO Basic Detail deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// OE Assignment Mutations
export const useAssignOe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignOeDto }) =>
      woBasicDetailsService.assignOe(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.oeAssignments(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.pendingAssignments() });
      toast.success('OE assigned successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useBulkAssignOe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BulkAssignOeDto }) =>
      woBasicDetailsService.bulkAssignOe(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.oeAssignments(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.pendingAssignments() });
      toast.success('OEs assigned successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useRemoveOeAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RemoveOeAssignmentDto }) =>
      woBasicDetailsService.removeOeAssignment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.oeAssignments(id) });
      toast.success('OE assignment removed successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

// Workflow Control Mutations
export const usePauseWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: PauseWorkflowDto }) =>
      woBasicDetailsService.pauseWorkflow(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.workflowStatus() });
      toast.success('Workflow paused successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useResumeWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: ResumeWorkflowDto }) =>
      woBasicDetailsService.resumeWorkflow(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.workflowStatus() });
      toast.success('Workflow resumed successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWorkflowStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkflowStageDto }) =>
      woBasicDetailsService.updateWorkflowStage(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.all });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.dashboardSummary() });
      toast.success('Workflow stage updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useCalculateGrossMargin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woBasicDetailsService.calculateGrossMargin(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detail(id) });
      toast.success('Gross margin calculated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
