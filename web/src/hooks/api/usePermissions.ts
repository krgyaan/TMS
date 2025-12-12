import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissionsService } from '@/services/api/permissions.service'
import type { Permission } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const permissionsKey = {
    all: ['permissions'] as const,
    lists: () => [...permissionsKey.all, 'list'] as const,
    list: () => [...permissionsKey.lists()] as const,
    detail: (id: number) => [...permissionsKey.all, 'detail', id] as const,
}

export const usePermissions = () => {
    return useQuery({
        queryKey: permissionsKey.list(),
        queryFn: () => permissionsService.getAll(),
    })
}

export const usePermission = (id: number | null) => {
    return useQuery({
        queryKey: permissionsKey.detail(id!),
        queryFn: () => permissionsService.getById(id!),
        enabled: !!id,
    })
}

export const useCreatePermission = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: { module: string; action: string; description?: string }) =>
            permissionsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: permissionsKey.list() })
            toast.success('Permission created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useDeletePermission = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => permissionsService.deletePermission(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: permissionsKey.list() })
            toast.success('Permission deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
