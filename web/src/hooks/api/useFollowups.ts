import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupsService } from '@/services/api/followups.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { CreateFollowupRequest } from '@/modules/crm/followups/helpers/followup.types';

export const followupsKey = {
    all: ['followups'] as const,
    byLead: (leadId: number) => [...followupsKey.all, 'lead', leadId] as const,
    detail: (leadId: number, id: number) => [...followupsKey.byLead(leadId), id] as const,
};

export const useFollowups = (leadId: number) => {
    return useQuery({
        queryKey: followupsKey.byLead(leadId),
        queryFn: () => followupsService.getAll(leadId),
        enabled: !!leadId,
    });
};

export const useFollowup = (leadId: number, followupId: number) => {
    return useQuery({
        queryKey: followupsKey.detail(leadId, followupId),
        queryFn: () => followupsService.getById(leadId, followupId),
        enabled: !!leadId && !!followupId,
    });
};

export const useCreateFollowup = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateFollowupRequest) =>
            followupsService.create(leadId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupsKey.byLead(leadId) });
            queryClient.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
            toast.success('Follow-up saved successfully');
        },
        onError: showErrorToast,
    });
};

export const useDeleteFollowup = (leadId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (followupId: number) =>
            followupsService.remove(leadId, followupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupsKey.byLead(leadId) });
            queryClient.invalidateQueries({ queryKey: ['leads', 'detail', leadId] });
            toast.success('Follow-up deleted successfully');
        },
        onError: showErrorToast,
    });
};