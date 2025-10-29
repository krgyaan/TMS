import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { statusesService } from '@/services/api'
import type { Status } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const statusKey = {
    all: ['statuses'] as const,
    lists: () => [...statusKey.all, 'list'] as const,
    list: (filters?: any) => [...statusKey.lists(), { filters }] as const,
    details: () => [...statusKey.all, 'detail'] as const,
    detail: (id: number) => [...statusKey.details(), id] as const,
}

// Get all statuses
export const useStatuses = () => {
    return useQuery({
        queryKey: statusKey.lists(),
        queryFn: () => statusesService.getAll(),
    })
}

// Get status by ID
export const useStatus = (id: number) => {
    return useQuery({
        queryKey: statusKey.detail(id),
        queryFn: () => statusesService.getById(id),
        enabled: !!id,
    })
}

// Create status
export const useCreateStatus = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<Status>) => statusesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: statusKey.lists() })
            toast.success('Status created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Update status
export const useUpdateStatus = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Status> }) =>
            statusesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: statusKey.lists() })
            queryClient.invalidateQueries({ queryKey: statusKey.detail(variables.id) })
            toast.success('Status updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Delete status
export const useDeleteStatus = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => statusesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: statusKey.lists() })
            toast.success('Status deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
