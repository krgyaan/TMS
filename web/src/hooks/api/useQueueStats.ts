import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { queueMonitoringService } from '@/services/api/queue-monitoring.service'
import type { JobState } from '@/modules/queue-monitoring/types/queue.types'

export const queueMonitoringKeys = {
    all: ['queue-monitoring'] as const,
    stats: () => [...queueMonitoringKeys.all, 'stats'] as const,
    queueDetail: (queueName: string) => [...queueMonitoringKeys.all, 'queue', queueName] as const,
    jobDetail: (queueName: string, jobId: string) => [...queueMonitoringKeys.all, 'job', queueName, jobId] as const,
}

/**
 * Hook to fetch queue statistics (for dashboard polling)
 * Polls every 10 seconds with React Query
 */
export const useQueueStats = (options?: { refetchInterval?: number; enabled?: boolean }) => {
    return useQuery({
        queryKey: queueMonitoringKeys.stats(),
        queryFn: () => queueMonitoringService.getQueueStats(),
        refetchInterval: options?.refetchInterval ?? 10000, // Poll every 10 seconds
        staleTime: 5000, // Consider stale after 5 seconds
        gcTime: 60000, // Cache for 1 minute
        retry: 1,
        enabled: options?.enabled !== false,
    })
}

/**
 * Hook to fetch detailed stats for a specific queue
 */
export const useQueueDetail = (
    queueName: string,
    options?: {
        status?: JobState | 'all'
        limit?: number
        offset?: number
        refetchInterval?: number
        enabled?: boolean
    }
) => {
    return useQuery({
        queryKey: [
            ...queueMonitoringKeys.queueDetail(queueName),
            options?.status ?? 'all',
            options?.limit ?? 50,
            options?.offset ?? 0,
        ],
        queryFn: () =>
            queueMonitoringService.getQueueDetail(
                queueName,
                options?.status ?? 'all',
                options?.limit ?? 50,
                options?.offset ?? 0
            ),
        refetchInterval: options?.refetchInterval ?? 10000,
        staleTime: 5000,
        gcTime: 60000,
        retry: 1,
        enabled: options?.enabled !== false,
    })
}

/**
 * Hook to fetch details for a single job
 */
export const useJobDetail = (
    queueName: string,
    jobId: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: queueMonitoringKeys.jobDetail(queueName, jobId),
        queryFn: () => queueMonitoringService.getJobDetail(queueName, jobId),
        staleTime: 30000, // Jobs don't change frequently
        gcTime: 300000, // Cache for 5 minutes
        retry: 1,
        enabled: options?.enabled !== false && !!queueName && !!jobId,
    })
}

/**
 * Custom hook to manage queue refresh settings
 */
export const useQueueRefresh = (options?: {
    defaultInterval?: number
    onRefresh?: () => void
}) => {
    const queryClient = useQueryClient()
    const [autoRefresh, setAutoRefresh] = React.useState(true)
    const [refreshInterval, setRefreshInterval] = React.useState(
        options?.defaultInterval ?? 10000
    )

    const handleRefresh = React.useCallback(() => {
        queryClient.invalidateQueries({
            queryKey: queueMonitoringKeys.stats(),
        })
        options?.onRefresh?.()
    }, [queryClient, options])

    return {
        autoRefresh,
        setAutoRefresh,
        refreshInterval,
        setRefreshInterval,
        handleRefresh,
    }
}
