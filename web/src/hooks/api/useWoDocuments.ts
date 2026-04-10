import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { woDocumentsService } from '@/services/api/wo-documents.api';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { woDetailsKeys } from './useWoDetails';
import type {
  WoDocumentsFilters,
  CreateWoDocumentDto,
  UpdateWoDocumentDto,
  DocumentType,
} from '@/modules/operations/types/wo.types';

// QUERY KEYS
export const woDocumentsKeys = {
  all: ['wo-documents'] as const,
  lists: () => [...woDocumentsKeys.all, 'list'] as const,
  list: (filters?: WoDocumentsFilters) => [...woDocumentsKeys.lists(), filters] as const,
  details: () => [...woDocumentsKeys.all, 'detail'] as const,
  detail: (id: number) => [...woDocumentsKeys.details(), id] as const,
  byWoDetail: (woDetailId: number) => [...woDocumentsKeys.all, 'by-wo-detail', woDetailId] as const,
  byType: (woDetailId: number, type: string) =>
    [...woDocumentsKeys.all, 'by-type', woDetailId, type] as const,
  latest: (woDetailId: number, type: string) =>
    [...woDocumentsKeys.all, 'latest', woDetailId, type] as const,
  versions: (woDetailId: number, type: string) =>
    [...woDocumentsKeys.all, 'versions', woDetailId, type] as const,
  summary: (woDetailId: number) => [...woDocumentsKeys.all, 'summary', woDetailId] as const,
};

// QUERY HOOKS
export const useWoDocuments = (filters?: WoDocumentsFilters) => {
  return useQuery({
    queryKey: woDocumentsKeys.list(filters),
    queryFn: () => woDocumentsService.getAll(filters),
  });
};

export const useWoDocumentById = (id: number) => {
  return useQuery({
    queryKey: woDocumentsKeys.detail(id),
    queryFn: () => woDocumentsService.getById(id),
    enabled: !!id && id > 0,
  });
};

export const useWoDocumentsByWoDetail = (woDetailId: number) => {
  return useQuery({
    queryKey: woDocumentsKeys.byWoDetail(woDetailId),
    queryFn: () => woDocumentsService.getByWoDetailId(woDetailId),
    enabled: !!woDetailId && woDetailId > 0,
  });
};

export const useWoDocumentsByType = (woDetailId: number, type: DocumentType) => {
  return useQuery({
    queryKey: woDocumentsKeys.byType(woDetailId, type),
    queryFn: () => woDocumentsService.getByType(woDetailId, type),
    enabled: !!woDetailId && !!type,
  });
};

export const useLatestDocument = (woDetailId: number, type: DocumentType) => {
  return useQuery({
    queryKey: woDocumentsKeys.latest(woDetailId, type),
    queryFn: () => woDocumentsService.getLatestByType(woDetailId, type),
    enabled: !!woDetailId && !!type,
  });
};

export const useDocumentVersionHistory = (woDetailId: number, type: DocumentType) => {
  return useQuery({
    queryKey: woDocumentsKeys.versions(woDetailId, type),
    queryFn: () => woDocumentsService.getVersionHistory(woDetailId, type),
    enabled: !!woDetailId && !!type,
  });
};

export const useDocumentsSummary = (woDetailId: number) => {
  return useQuery({
    queryKey: woDocumentsKeys.summary(woDetailId),
    queryFn: () => woDocumentsService.getDocumentsSummary(woDetailId),
    enabled: !!woDetailId && woDetailId > 0,
  });
};

// MUTATION HOOKS
export const useUploadWoDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWoDocumentDto) => woDocumentsService.upload(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detailWithRelations(data.woDetailId) });
      toast.success('Document uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUploadBulkWoDocuments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { woDetailId: number; documents: Omit<CreateWoDocumentDto, 'woDetailId'>[] }) =>
      woDocumentsService.uploadBulk(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.byWoDetail(data.woDetailId) });
      queryClient.invalidateQueries({ queryKey: woDetailsKeys.detailWithRelations(data.woDetailId) });
      toast.success('Documents uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useUpdateWoDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWoDocumentDto }) =>
      woDocumentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      toast.success('Document updated successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useReplaceWoDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, filePath }: { id: number; filePath: string }) =>
      woDocumentsService.replace(id, { filePath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      toast.success('Document replaced successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteWoDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => woDocumentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteAllDocumentsByWoDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (woDetailId: number) => woDocumentsService.removeAllByWoDetail(woDetailId),
    onSuccess: (_, woDetailId) => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.byWoDetail(woDetailId) });
      toast.success('All documents deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};

export const useDeleteDocumentsByType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ woDetailId, type }: { woDetailId: number; type: DocumentType }) =>
      woDocumentsService.removeByType(woDetailId, type),
    onSuccess: (_, { woDetailId, type }) => {
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.all });
      queryClient.invalidateQueries({ queryKey: woDocumentsKeys.byType(woDetailId, type) });
      toast.success('Documents deleted successfully');
    },
    onError: (error: any) => {
      toast.error(handleQueryError(error));
    },
  });
};
