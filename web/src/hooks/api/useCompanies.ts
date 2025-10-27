import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesService } from '@/services/api'
import { Company } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'

export const companyKeys = {
    all: ['companies'] as const,
    lists: () => [...companyKeys.all, 'list'] as const,
    list: (filters?: any) => [...companyKeys.lists(), { filters }] as const,
    details: () => [...companyKeys.all, 'detail'] as const,
    detail: (id: string) => [...companyKeys.details(), id] as const,
}

export const useCompanies = () => {
    return useQuery({
        queryKey: companyKeys.lists(),
        queryFn: () => companiesService.getAll(),
    })
}

export const useCompany = (id: string) => {
    return useQuery({
        queryKey: companyKeys.detail(id),
        queryFn: () => companiesService.getById(id),
        enabled: !!id,
    })
}

export const useCreateCompany = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: Partial<Company>) => companiesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
            toast.success('Company created successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useUpdateCompany = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
            companiesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
            queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.id) })
            toast.success('Company updated successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useDeleteCompany = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => companiesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
            toast.success('Company deleted successfully')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}
