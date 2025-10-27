import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/api'
import type { User } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters?: any) => [...userKeys.lists(), { filters }] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: number) => [...userKeys.details(), id] as const,
}

// Get all users
export const useUsers = () => {
    return useQuery({
        queryKey: userKeys.lists(),
        queryFn: () => usersService.getAll(),
    })
}

// Get user by ID
export const useUser = (id: number) => {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: () => usersService.getById(id),
        enabled: !!id,
    })
}

// Create user
export const useCreateUser = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<User>) => usersService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('User created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Update user
export const useUpdateUser = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
            usersService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
            toast.success('User updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Delete user
export const useDeleteUser = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => usersService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            toast.success('User deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
