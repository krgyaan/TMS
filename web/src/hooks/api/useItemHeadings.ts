import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemsService } from '@/services/api'
import type { ItemHeading } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const itemHeadingKey = {
    all: ['items'] as const,
    lists: () => [...itemHeadingKey.all, 'list'] as const,
    list: (filters?: any) => [...itemHeadingKey.lists(), { filters }] as const,
    details: () => [...itemHeadingKey.all, 'detail'] as const,
    detail: (id: number) => [...itemHeadingKey.details(), id] as const,
}

// Get all statuses
export const useItemHeadings = () => {
    return useQuery({
        queryKey: itemHeadingKey.lists(),
        queryFn: () => itemsService.getAll(),
    })
}

// Get status by ID
export const useItemHeading = (id: number) => {
    return useQuery({
        queryKey: itemHeadingKey.detail(id),
        queryFn: () => itemsService.getById(id),
        enabled: !!id,
    })
}

// Create status
export const useCreateItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<ItemHeading>) => itemsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            toast.success('Item Heading created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Update status
export const useUpdateItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ItemHeading> }) =>
            itemsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.detail(variables.id) })
            toast.success('Item Heading updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Delete status
export const useDeleteItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => itemsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            toast.success('Item Heading deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
