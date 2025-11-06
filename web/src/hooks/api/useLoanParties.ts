import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loanPartiesService } from '@/services/api';
import type { CreateLoanPartyDto, UpdateLoanPartyDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const loanPartiesKey = {
    all: ['loanParties'] as const,
    lists: () => [...loanPartiesKey.all, 'list'] as const,
    list: (filters?: any) => [...loanPartiesKey.lists(), { filters }] as const,
    details: () => [...loanPartiesKey.all, 'detail'] as const,
    detail: (id: number) => [...loanPartiesKey.details(), id] as const,
};

// Get all lead types
export const useLoanParties = () => {
    return useQuery({
        queryKey: loanPartiesKey.lists(),
        queryFn: () => loanPartiesService.getAll(),
    });
};

// Get lead type by ID
export const useLoanParty = (id: number | null) => {
    return useQuery({
        queryKey: loanPartiesKey.detail(id!),
        queryFn: () => loanPartiesService.getById(id!),
        enabled: !!id,
    });
};

// Search lead types
export const useLoanPartySearch = (query: string) => {
    return useQuery({
        queryKey: [...loanPartiesKey.all, 'search', query],
        queryFn: () => loanPartiesService.search(query),
        enabled: query.length > 0,
    });
};

// Create lead type
export const useCreateLoanParty = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLoanPartyDto) => loanPartiesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: loanPartiesKey.lists() });
            toast.success('Lead Type created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update lead type
export const useUpdateLoanParty = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLoanPartyDto }) =>
            loanPartiesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: loanPartiesKey.lists() });
            queryClient.invalidateQueries({ queryKey: loanPartiesKey.detail(variables.id) });
            toast.success('Lead Type updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete lead type
// export const useDeleteLoanParty = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => loanPartiesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: loanPartiesKey.lists() });
//             toast.success('Lead Type deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
