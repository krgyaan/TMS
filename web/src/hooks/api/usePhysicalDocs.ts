import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreatePhysicalDocsDto, UpdatePhysicalDocsDto } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'
import { physicalDocsService } from '@/services/api/physical-docs.service'

export const physicalDocsKey = {
    all: ['physical-docs'] as const,
    lists: () => [...physicalDocsKey.all, 'list'] as const,
    list: (filters?: any) => [...physicalDocsKey.lists(), { filters }] as const,
    details: () => [...physicalDocsKey.all, 'detail'] as const,
    detail: (id: number) => [...physicalDocsKey.details(), id] as const,
    byTender: (tenderId: number) => [...physicalDocsKey.all, 'by-tender', tenderId] as const,
}

export const usePhysicalDocs = () => {
    return useQuery({
        queryKey: physicalDocsKey.lists(),
        queryFn: () => physicalDocsService.getAll(),
    })
};

export const usePhysicalDoc = (id: number | null) => {
    return useQuery({
        queryKey: physicalDocsKey.detail(id ?? 0),
        queryFn: () => physicalDocsService.getById(id ?? 0),
        enabled: !!id,
    });
};

export const usePhysicalDocByTenderId = (tenderId: number | null) => {
    return useQuery({
        queryKey: physicalDocsKey.byTender(tenderId ?? 0),
        queryFn: () => physicalDocsService.getByTenderId(tenderId ?? 0),
        enabled: !!tenderId,
    });
};

export const useCreatePhysicalDoc = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreatePhysicalDocsDto) => physicalDocsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.lists() })
            toast.success('Physical doc created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useUpdatePhysicalDoc = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: UpdatePhysicalDocsDto) =>
            physicalDocsService.update(data.id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.lists() })
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.detail(data.id) })
            toast.success('Physical doc updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useDeletePhysicalDoc = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => physicalDocsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.lists() })
            toast.success('Physical doc deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
