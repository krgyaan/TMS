import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentChecklistService } from '@/services/api/document-checklist.service';
import { toast } from 'sonner';

export const documentChecklistKeys = {
    all: ['documentChecklists'] as const,
    lists: () => [...documentChecklistKeys.all, 'list'] as const,
    detail: (id: number) => [...documentChecklistKeys.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...documentChecklistKeys.all, 'byTender', tenderId] as const,
};

export const useDocumentChecklists = () => {
    return useQuery({
        queryKey: documentChecklistKeys.lists(),
        queryFn: () => documentChecklistService.getAll(),
    });
};

export const useDocumentChecklistByTender = (tenderId: number) => {
    return useQuery({
        queryKey: documentChecklistKeys.byTender(tenderId),
        queryFn: () => documentChecklistService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useCreateDocumentChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: documentChecklistService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.all });
            toast.success('Document checklist submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit document checklist');
        },
    });
};

export const useUpdateDocumentChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: documentChecklistService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.all });
            toast.success('Document checklist updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update document checklist');
        },
    });
};
