import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { QueueMonitoringService } from "./queue-monitoring.service";
import { QueueStatsResponseDto } from "./dtos/queue-stats-response.dto";
import { JobDetailDto, JobListResponseDto, JobState } from "./dtos/job-detail.dto";

@Controller("queue-monitoring")
@UseGuards(JwtAuthGuard)
export class QueueStatsController {
    constructor(private readonly queueMonitoringService: QueueMonitoringService) {}

    /**
     * GET /queue-monitoring/stats
     * Get overview statistics for all queues
     * Used for dashboard polling (every 10 seconds)
     */
    @Get("stats")
    @HttpCode(HttpStatus.OK)
    async getQueueStats(): Promise<{ data: QueueStatsResponseDto }> {
        const data = await this.queueMonitoringService.getQueueStats();
        return { data };
    }

    /**
     * GET /queue-monitoring/queues/:queueName/details
     * Get detailed statistics and job history for a specific queue
     * Query params:
     * - status: 'all' | 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' (default: 'all')
     * - limit: 1-100 (default: 50)
     * - offset: 0+ (default: 0)
     */
    @Get("queues/:queueName/details")
    @HttpCode(HttpStatus.OK)
    async getQueueDetail(
        @Param("queueName") queueName: string,
        @Query("status") status: JobState | "all" = "all",
        @Query("limit") limit: string = "50",
        @Query("offset") offset: string = "0"
    ): Promise<{ data: { queueStats: any; jobs: JobListResponseDto } }> {
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);

        const data = await this.queueMonitoringService.getQueueDetail(queueName, status, parsedLimit, parsedOffset);

        return { data };
    }

    /**
     * GET /queue-monitoring/queues/:queueName/jobs/:jobId
     * Get detailed information about a specific job
     */
    @Get("queues/:queueName/jobs/:jobId")
    @HttpCode(HttpStatus.OK)
    async getJobDetail(@Param("queueName") queueName: string, @Param("jobId") jobId: string): Promise<{ data: JobDetailDto }> {
        const data = await this.queueMonitoringService.getJobDetail(queueName, jobId);
        return { data };
    }
}
