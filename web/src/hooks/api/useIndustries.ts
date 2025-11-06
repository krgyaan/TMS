import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { industriesService } from '@/services/api';
import type { CreateIndustryDto, UpdateIndustryDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const industriesKey = {
    all: ['industries'] as const,
    lists: () => [...industriesKey.all, 'list'] as const,
    list: (filters?: any) => [...industriesKey.lists(), { filters }] as const,
    details: () => [...industriesKey.all, 'detail'] as const,
    detail: (id: number) => [...industriesKey.details(), id] as const,
};

export const useIndustries = () => {
    return useQuery({
        queryKey: industriesKey.lists(),
        queryFn: () => industriesService.getAll(),
    });
};

export const useIndustry = (id: number | null) => {
    return useQuery({
        queryKey: industriesKey.detail(id!),
        queryFn: () => industriesService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateIndustry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateIndustryDto) => industriesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: industriesKey.lists() });
            toast.success('Industry created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateIndustry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateIndustryDto }) =>
            industriesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: industriesKey.lists() });
            queryClient.invalidateQueries({ queryKey: industriesKey.detail(variables.id) });
            toast.success('Industry updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// export const useDeleteIndustry = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => industriesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: industriesKey.lists() });
//             toast.success('Industry deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
