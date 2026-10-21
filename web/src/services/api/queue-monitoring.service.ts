import { axiosInstance } from '@/lib/axios'
import type { Job, JobListResponse, JobState, QueueStatsResponse } from '@/modules/queue-monitoring/types/queue.types'

export const queueMonitoringService = {
    /**
     * Get queue statistics for all queues
     */
    getQueueStats: async (): Promise<QueueStatsResponse> => {
        const response = await axiosInstance.get('/queue-monitoring/stats')
        return response.data.data
    },

    /**
     * Get detailed stats for a specific queue including job history
     */
    getQueueDetail: async (
        queueName: string,
        status: JobState | 'all' = 'all',
        limit: number = 50,
        offset: number = 0
    ): Promise<{ queueStats: any; jobs: JobListResponse }> => {
        const response = await axiosInstance.get(
            `/queue-monitoring/queues/${queueName}/details`,
            {
                params: {
                    status,
                    limit,
                    offset,
                },
            }
        )
        return response.data.data
    },

    /**
     * Get details for a single job
     */
    getJobDetail: async (queueName: string, jobId: string): Promise<Job> => {
        const response = await axiosInstance.get(
            `/queue-monitoring/queues/${queueName}/jobs/${jobId}`
        )
        return response.data.data
    },
}
