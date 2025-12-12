import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/api/users.service'
import { userKeys } from './useUsers'
import { toast } from 'sonner'
import type { AssignRoleDto } from '@/types/api.types'
import type { UserRole } from '@/types/auth.types'

export const userRolesKey = {
    all: ['user-roles'] as const,
    user: (userId: number) => [...userRolesKey.all, userId] as const,
}

export const useUserRole = (userId: number | null) => {
    return useQuery({
        queryKey: userId ? userRolesKey.user(userId) : ['user-role', null],
        queryFn: () => usersService.getUserRole(userId!),
        enabled: !!userId,
        select: (data) => data as unknown as UserRole | null,
    })
}

export const useAssignUserRole = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: AssignRoleDto }) =>
            usersService.assignRole(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userRolesKey.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('Role assigned successfully')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to assign role')
        },
    })
}

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: AssignRoleDto }) =>
            usersService.updateUserRole(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userRolesKey.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('Role updated successfully')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to update role')
        },
    })
}
