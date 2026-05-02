import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woContactsService } from '@/services/api/wo-contacts.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { woBasicDetailsKeys } from './useWoBasicDetails';
import type {
  WoContactsFilters,
  CreateWoContactDto,
  UpdateWoContactDto,
  CreateBulkWoContactsDto,
} from '@/modules/operations/types/wo.types';

// ============================================
// QUERY KEYS
// ============================================

export const woContactsKeys = {
  all: ['wo-contacts'] as const,
  lists: () => [...woContactsKeys.all, 'list'] as const,
  list: (filters?: WoContactsFilters) => [...woContactsKeys.lists(), filters] as const,
  details: () => [...woContactsKeys.all, 'detail'] as const,
  detail: (id: number) => [...woContactsKeys.details(), id] as const,
  byBasicDetail: (woBasicDetailId: number) => [...woContactsKeys.all, 'by-basic-detail', woBasicDetailId] as const,
  byDepartment: (woBasicDetailId: number, department: string) =>
    [...woContactsKeys.all, 'by-department', woBasicDetailId, department] as const,
  summary: (woBasicDetailId: number) => [...woContactsKeys.all, 'summary', woBasicDetailId] as const,
};

// QUERY HOOKS
export const useWoContacts = (filters?: WoContactsFilters) => {
  return useQuery({
    queryKey: woContactsKeys.list(filters),
    queryFn: () => woContactsService.getAll(filters),
  });
};

export const useWoContactById = (id: number) => {
  return useQuery({
    queryKey: woContactsKeys.detail(id),
    queryFn: () => woContactsService.getById(id),
    enabled: !!id && id > 0,
  });
};

export const useWoContactsByBasicDetail = (woBasicDetailId: number) => {
  return useQuery({
    queryKey: woContactsKeys.byBasicDetail(woBasicDetailId),
    queryFn: () => woContactsService.getByWoBasicDetailId(woBasicDetailId),
    enabled: !!woBasicDetailId && woBasicDetailId > 0,
  });
};

export const useWoContactsByDepartment = (woBasicDetailId: number, department: string) => {
  return useQuery({
    queryKey: woContactsKeys.byDepartment(woBasicDetailId, department),
    queryFn: () => woContactsService.getByDepartment(woBasicDetailId, department),
    enabled: !!woBasicDetailId && !!department,
  });
};

export const useContactsSummary = (woBasicDetailId: number) => {
  return useQuery({
    queryKey: woContactsKeys.summary(woBasicDetailId),
    queryFn: () => woContactsService.getContactsSummary(woBasicDetailId),
    enabled: !!woBasicDetailId && woBasicDetailId > 0,
  });
};

// MUTATION HOOKS
export const useCreateWoContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoContactDto) => woContactsService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woContactsKeys.all });
      queryClient.invalidateQueries({ queryKey: woContactsKeys.byBasicDetail(data.woBasicDetailId) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detailWithRelations(data.woBasicDetailId) });
      toast.success('Contact created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useCreateBulkWoContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBulkWoContactsDto) => woContactsService.createBulk(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woContactsKeys.all });
      queryClient.invalidateQueries({ queryKey: woContactsKeys.byBasicDetail(data.woBasicDetailId) });
      queryClient.invalidateQueries({ queryKey: woBasicDetailsKeys.detailWithRelations(data.woBasicDetailId) });
      toast.success('Contacts created successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWoContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWoContactDto }) =>
      woContactsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woContactsKeys.all });
      toast.success('Contact updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woContactsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woContactsKeys.all });
      toast.success('Contact deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteAllContactsByBasicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woBasicDetailId: number) => woContactsService.removeAllByBasicDetail(woBasicDetailId),
    onSuccess: (_, woBasicDetailId) => {
      queryClient.invalidateQueries({ queryKey: woContactsKeys.all });
      queryClient.invalidateQueries({ queryKey: woContactsKeys.byBasicDetail(woBasicDetailId) });
      toast.success('All contacts deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
