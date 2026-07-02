import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { infoSheetsService } from '@/services/api'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'
import type { SaveTenderInfoSheetDto } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types'

export const infoSheetsKey = {
    all: ['info-sheets'] as const,
    details: () => [...infoSheetsKey.all, 'detail'] as const,
    detail: (tenderId: number) =>
        [...infoSheetsKey.details(), tenderId] as const,
}

export const useInfoSheet = (tenderId: number | null) => {
    return useQuery({
        queryKey: infoSheetsKey.detail(tenderId ?? 0),
        queryFn: () => infoSheetsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
        retry: (failureCount, error: any) => {
            if (error?.status === 404 || error?.response?.status === 404) {
                return false // Don't retry on 404
            }
            return failureCount < 2
        },
    })
}

export const useCreateInfoSheet = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            tenderId,
            data,
        }: {
            tenderId: number
            data: SaveTenderInfoSheetDto
        }) => infoSheetsService.create(tenderId, data),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: infoSheetsKey.detail(variables.tenderId),
            })
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.all })

            // Differentiate success message based on recommendation
            const isRejection = variables.data.teRecommendation === 'NO'
            toast.success(
                isRejection
                    ? 'Tender marked as not recommended and saved successfully'
                    : 'Tender info sheet created successfully'
            )
        },

        onError: (error) => {
            const errorMessage = handleQueryError(error)
            toast.error(resolveErrorMessage(errorMessage, 'create'), {
                duration: resolveErrorDuration(errorMessage),
            })
        },
    })
}

export const useUpdateInfoSheet = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            tenderId,
            data,
        }: {
            tenderId: number
            data: SaveTenderInfoSheetDto
        }) => infoSheetsService.update(tenderId, data),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: infoSheetsKey.detail(variables.tenderId),
            })
            queryClient.invalidateQueries({ queryKey: infoSheetsKey.all })

            // Differentiate success message based on recommendation
            const isRejection = variables.data.teRecommendation === 'NO'
            toast.success(
                isRejection
                    ? 'Tender marked as not recommended and updated successfully'
                    : 'Tender info sheet updated successfully'
            )
        },

        onError: (error) => {
            const errorMessage = handleQueryError(error)
            toast.error(resolveErrorMessage(errorMessage, 'update'), {
                duration: resolveErrorDuration(errorMessage),
            })
        },
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveErrorMessage = (
    errorMessage: string,
    operation: 'create' | 'update'
): string => {
    const lower = errorMessage.toLowerCase()

    if (lower.includes('invalid field values') || lower.includes('validation')) {
        return `Validation Error: ${errorMessage}. Please check all required fields.`
    }

    if (lower.includes('not found')) {
        return operation === 'update'
            ? 'Error: Info sheet not found. Please refresh the page and try again.'
            : `Error: ${errorMessage}`
    }

    if (lower.includes('network') || lower.includes('fetch')) {
        return 'Network Error: Unable to connect to server. Please check your connection and try again.'
    }

    return (
        errorMessage ||
        `Failed to ${operation === 'create' ? 'create' : 'update'} tender info sheet. Please try again.`
    )
}

const resolveErrorDuration = (errorMessage: string): number => {
    const lower = errorMessage.toLowerCase()

    if (lower.includes('validation') || lower.includes('invalid field values')) {
        return 6000
    }
    if (lower.includes('network') || lower.includes('fetch')) {
        return 5000
    }
    if (lower.includes('not found')) {
        return 5000
    }

    return 4000 // default
}