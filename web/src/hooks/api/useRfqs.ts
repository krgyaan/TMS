import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateRfqDto, UpdateRfqDto, VendorOrganizationWithRelations } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import { rfqsService } from '@/services/api/rfqs.services';
import { vendorOrganizationsService } from '@/services/api/vendor-organization.service';

export const rfqsKey = {
    all: ['rfqs'] as const,
    lists: () => [...rfqsKey.all, 'list'] as const,
    list: (filters?: any) => [...rfqsKey.lists(), { filters }] as const,
    details: () => [...rfqsKey.all, 'detail'] as const,
    detail: (id: number) => [...rfqsKey.details(), id] as const,
    byTender: (tenderId: number) => [...rfqsKey.all, 'by-tender', tenderId] as const,
}

export const useRfqs = () => {
    return useQuery({
        queryKey: rfqsKey.lists(),
        queryFn: () => rfqsService.getAll(),
    })
};

export const useRfq = (id: number | null) => {
    return useQuery({
        queryKey: rfqsKey.detail(id ?? 0),
        queryFn: () => rfqsService.getById(id ?? 0),
        enabled: !!id,
    });
};

export const useRfqByTenderId = (tenderId: number | null) => {
    return useQuery({
        queryKey: rfqsKey.byTender(tenderId ?? 0),
        queryFn: () => rfqsService.getByTenderId(tenderId ?? 0),
        enabled: !!tenderId,
    });
};

export const useCreateRfq = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateRfqDto) => rfqsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rfqsKey.lists() })
            toast.success('Rfq created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useUpdateRfq = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateRfqDto }) =>
            rfqsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: rfqsKey.lists() })
            queryClient.invalidateQueries({ queryKey: rfqsKey.detail(variables.id) })
            toast.success('Rfq updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useDeleteRfq = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => rfqsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: rfqsKey.lists() })
            toast.success('Rfq deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useRfqVendors = (rfqToIds: string | undefined) => {
    return useQuery({
        queryKey: ['rfq-vendors', rfqToIds],
        queryFn: async (): Promise<VendorOrganizationWithRelations[]> => {
            if (!rfqToIds) return [];

            // Parse comma-separated IDs and fetch all vendor organizations
            const ids = rfqToIds.split(',').filter(id => id.trim() !== '' && id !== '0').map(id => Number(id.trim()));

            if (ids.length === 0) return [];

            // Fetch all vendor organizations with relations
            const responses = await Promise.all(
                ids.map(id => vendorOrganizationsService.getByIdWithRelations(id))
            );

            return responses;
        },
        enabled: !!rfqToIds && rfqToIds !== '0' && rfqToIds.trim() !== '',
    });
}
