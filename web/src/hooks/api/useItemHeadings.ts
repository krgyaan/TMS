import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemHeadingsService } from '@/services/api'
import type { ItemHeading } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const itemHeadingKey = {
    all: ['itemHeadings'] as const,
    lists: () => [...itemHeadingKey.all, 'list'] as const,
    list: (filters?: any) => [...itemHeadingKey.lists(), { filters }] as const,
    details: () => [...itemHeadingKey.all, 'detail'] as const,
    detail: (id: number) => [...itemHeadingKey.details(), id] as const,
}

export const useItemHeadings = () => {
    return useQuery({
        queryKey: itemHeadingKey.lists(),
        queryFn: () => itemHeadingsService.getAll(),
    })
}

export const useItemHeading = (id: number) => {
    return useQuery({
        queryKey: itemHeadingKey.detail(id),
        queryFn: () => itemHeadingsService.getById(id),
        enabled: !!id,
    })
}

export const useCreateItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<ItemHeading>) => itemHeadingsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            toast.success('Item heading created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useUpdateItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ItemHeading> }) =>
            itemHeadingsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.detail(variables.id) })
            toast.success('Item heading updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useDeleteItemHeading = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => itemHeadingsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemHeadingKey.lists() })
            toast.success('Item heading deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
