import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/api/users.service'
import { userKeys } from './useUsers'
import { toast } from 'sonner'
import type { AssignPermissionsDto, UserPermission } from '@/types/api.types'

export const userPermissionsKey = {
    all: ['user-permissions'] as const,
    user: (userId: number) => [...userPermissionsKey.all, userId] as const,
}

export const useUserPermissions = (userId: number | null) => {
    return useQuery({
        queryKey: userId ? userPermissionsKey.user(userId) : ['user-permissions', null],
        queryFn: () => usersService.getUserPermissions(userId!),
        enabled: !!userId,
        select: (data) => data as unknown as UserPermission[],
    })
}

export const useAssignUserPermissions = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: AssignPermissionsDto }) =>
            usersService.assignPermissions(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userPermissionsKey.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('Permissions assigned successfully')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to assign permissions')
        },
    })
}

export const useUpdateUserPermissions = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: AssignPermissionsDto }) =>
            usersService.updateUserPermissions(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userPermissionsKey.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('Permissions updated successfully')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to update permissions')
        },
    })
}

export const useRemoveUserPermission = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, permissionId }: { userId: number; permissionId: number }) =>
            usersService.removeUserPermission(userId, permissionId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userPermissionsKey.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('Permission removed successfully')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to remove permission')
        },
    })
}
