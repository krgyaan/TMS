import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsService } from '@/services/api'
import type { Location } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const locationKey = {
    all: ['locations'] as const,
    lists: () => [...locationKey.all, 'list'] as const,
    list: (filters?: any) => [...locationKey.lists(), { filters }] as const,
    details: () => [...locationKey.all, 'detail'] as const,
    detail: (id: number) => [...locationKey.details(), id] as const,
}

// Get all locations
export const useLocations = () => {
    return useQuery({
        queryKey: locationKey.lists(),
        queryFn: () => locationsService.getAll(),
    })
}

// Get location by ID
export const useLocation = (id: number) => {
    return useQuery({
        queryKey: locationKey.detail(id),
        queryFn: () => locationsService.getById(id),
        enabled: !!id,
    })
}

// Create location
export const useCreateLocation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<Location>) => locationsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: locationKey.lists() })
            toast.success('Location created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Update location
export const useUpdateLocation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) =>
            locationsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: locationKey.lists() })
            queryClient.invalidateQueries({ queryKey: locationKey.detail(variables.id) })
            toast.success('Location updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

// Delete location
export const useDeleteLocation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => locationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: locationKey.lists() })
            toast.success('Location deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
