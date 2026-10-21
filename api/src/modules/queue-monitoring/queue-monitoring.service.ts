import { Injectable, Logger, Inject } from "@nestjs/common";
import { Queue } from "bullmq";
import { QueueStatsDto, QueueCountsDto, QueueRatesDto, QueueStatsResponseDto } from "./dtos/queue-stats-response.dto";
import { JobDetailDto, JobListResponseDto, JobState } from "./dtos/job-detail.dto";

interface QueueInfo {
    name: string;
    displayName: string;
    provider: string; // Dependency injection token
}

@Injectable()
export class QueueMonitoringService {
    private readonly logger = new Logger(QueueMonitoringService.name);
    private readonly queues: QueueInfo[] = [
        { name: "followup-mail-queue", displayName: "Follow-up Mail", provider: "FOLLOWUP_QUEUE" },
        { name: "checklist-mail-queue", displayName: "Account Checklist", provider: "CHECKLIST_QUEUE" },
        { name: "video-processing-queue", displayName: "Video Processing", provider: "VIDEO_PROCESSING_QUEUE" },
        { name: "generic-mail-queue", displayName: "Generic Mail", provider: "GENERIC_QUEUE" },
        { name: "lead-followup-mail-queue", displayName: "Lead Follow-up Mail", provider: "LEAD_FOLLOWUP_QUEUE" },
        { name: "pdf-extraction-queue", displayName: "PDF Extraction", provider: "PDF_EXTRACTION_QUEUE" },
    ];

    constructor(
        @Inject("FOLLOWUP_QUEUE") private followupQueue: Queue,
        @Inject("CHECKLIST_QUEUE") private checklistQueue: Queue,
        @Inject("VIDEO_PROCESSING_QUEUE") private videoProcessingQueue: Queue,
        @Inject("GENERIC_QUEUE") private genericQueue: Queue,
        @Inject("LEAD_FOLLOWUP_QUEUE") private leadFollowupQueue: Queue,
        @Inject("PDF_EXTRACTION_QUEUE") private pdfExtractionQueue: Queue
    ) {}

    /**
     * Get map of queue name to queue instance for easy access
     */
    private getQueueMap(): Map<string, Queue> {
        const map = new Map<string, Queue>();
        map.set("followup-mail-queue", this.followupQueue);
        map.set("checklist-mail-queue", this.checklistQueue);
        map.set("video-processing-queue", this.videoProcessingQueue);
        map.set("generic-mail-queue", this.genericQueue);
        map.set("lead-followup-mail-queue", this.leadFollowupQueue);
        map.set("pdf-extraction-queue", this.pdfExtractionQueue);
        return map;
    }

    /**
     * Get all queue statistics for dashboard overview
     */
    async getQueueStats(): Promise<QueueStatsResponseDto> {
        const queueMap = this.getQueueMap();
        const stats: QueueStatsDto[] = [];
        let totalWaiting = 0;
        let totalActive = 0;
        let totalFailed = 0;
        let criticalQueues = 0;
        let degradedQueues = 0;

        // Fetch stats for all queues in parallel
        const statPromises = this.queues.map(async queueInfo => {
            try {
                const queue = queueMap.get(queueInfo.name);
                if (!queue) {
                    this.logger.warn(`Queue ${queueInfo.name} not found`);
                    return null;
                }

                const counts = await this.getQueueCounts(queue);
                const rates = this.calculateQueueRates(counts);
                const health = this.calculateHealth(counts, rates);
                const isPaused = await queue.isPaused();
                const isProcessing = counts.active > 0;

                // Track last activity (approximate - using current time if any jobs present)
                const lastActivity = counts.active > 0 || counts.waiting > 0 ? new Date() : new Date(0);

                return {
                    name: queueInfo.name,
                    displayName: queueInfo.displayName,
                    counts,
                    rates,
                    health,
                    lastActivity,
                    isPaused,
                    isProcessing,
                };
            } catch (error) {
                this.logger.error(`Failed to fetch stats for queue ${queueInfo.name}:`, error);
                return null;
            }
        });

        const results = await Promise.all(statPromises);

        // Filter out null results and aggregate
        results.forEach(stat => {
            if (stat) {
                stats.push(stat);
                totalWaiting += stat.counts.waiting;
                totalActive += stat.counts.active;
                totalFailed += stat.counts.failed;
                if (stat.health === "critical") criticalQueues++;
                if (stat.health === "degraded") degradedQueues++;
            }
        });

        const healthScore = this.calculateOverallHealthScore(stats);

        return {
            timestamp: new Date(),
            queues: stats,
            summary: {
                totalWaiting,
                totalActive,
                totalFailed,
                criticalQueues,
                degradedQueues,
                healthScore,
            },
        };
    }

    /**
     * Get detailed stats for a specific queue including job history
     */
    async getQueueDetail(
        queueName: string,
        status: JobState | "all" = "all",
        limit: number = 50,
        offset: number = 0
    ): Promise<{ queueStats: QueueStatsDto; jobs: JobListResponseDto }> {
        const queueMap = this.getQueueMap();
        const queue = queueMap.get(queueName);

        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        // Get queue stats
        const counts = await this.getQueueCounts(queue);
        const rates = this.calculateQueueRates(counts);
        const health = this.calculateHealth(counts, rates);
        const isPaused = await queue.isPaused();
        const isProcessing = counts.active > 0;

        const queueInfo = this.queues.find(q => q.name === queueName);
        const queueStats: QueueStatsDto = {
            name: queueName,
            displayName: queueInfo?.displayName || queueName,
            counts,
            rates,
            health,
            lastActivity: new Date(),
            isPaused,
            isProcessing,
        };

        // Get jobs
        const jobs = await this.getQueueJobs(queue, status, limit, offset);

        return { queueStats, jobs };
    }

    /**
     * Get jobs from a specific queue with optional filtering
     */
    private async getQueueJobs(queue: Queue, status: JobState | "all" = "all", limit: number = 50, offset: number = 0): Promise<JobListResponseDto> {
        try {
            // Limit max results to prevent memory issues
            limit = Math.min(limit, 100);

            // Get total count for pagination
            let totalCount = 0;
            if (status === "all") {
                // Sum all states
                totalCount =
                    (await queue.getWaitingCount()) +
                    (await queue.getActiveCount()) +
                    (await queue.getCompletedCount()) +
                    (await queue.getFailedCount()) +
                    (await queue.getDelayedCount());
            } else {
                // Get count for specific status
                switch (status) {
                    case "waiting":
                        totalCount = await queue.getWaitingCount();
                        break;
                    case "active":
                        totalCount = await queue.getActiveCount();
                        break;
                    case "completed":
                        totalCount = await queue.getCompletedCount();
                        break;
                    case "failed":
                        totalCount = await queue.getFailedCount();
                        break;
                    case "delayed":
                        totalCount = await queue.getDelayedCount();
                        break;
                }
            }

            // Get jobs
            let bullmqJobs = await queue.getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, limit + offset);
            if (status !== "all") {
                bullmqJobs = await queue.getJobs([status], offset, offset + limit);
            } else {
                bullmqJobs = bullmqJobs.slice(offset, offset + limit);
            }

            const jobs = await Promise.all(bullmqJobs.map(job => this.mapBullMQJobToDto(job)));

            return {
                total: totalCount,
                page: Math.floor(offset / limit) + 1,
                limit,
                pages: Math.ceil(totalCount / limit),
                jobs,
            };
        } catch (error) {
            this.logger.error(`Failed to get jobs from queue ${queue.name}:`, error);
            return {
                total: 0,
                page: 1,
                limit,
                pages: 0,
                jobs: [],
            };
        }
    }

    /**
     * Get single job detail
     */
    async getJobDetail(queueName: string, jobId: string): Promise<JobDetailDto> {
        const queueMap = this.getQueueMap();
        const queue = queueMap.get(queueName);

        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const job = await queue.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found in queue ${queueName}`);
        }

        return this.mapBullMQJobToDto(job);
    }

    /**
     * Get counts for a queue (waiting, active, completed, failed, delayed, paused)
     */
    private async getQueueCounts(queue: Queue): Promise<QueueCountsDto> {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);

        // BullMQ doesn't have a built-in getPausedCount, so default to 0
        const paused = 0;

        return { waiting, active, completed, failed, delayed, paused };
    }

    /**
     * Calculate rates for a queue
     */
    private calculateQueueRates(counts: QueueCountsDto): QueueRatesDto {
        const total = counts.completed + counts.failed;
        const completionRate = total > 0 ? (counts.completed / total) * 100 : 100;
        const failureRate = total > 0 ? (counts.failed / total) * 100 : 0;

        // Rough estimate: assume 2.3s average (in production, track actual processing times)
        const averageProcessingTime = 2300;

        // Throughput: rough estimate based on completed + failed
        const throughput = counts.completed + counts.failed > 0 ? 10 : 0; // jobs/min

        return {
            completionRate: Math.round(completionRate * 10) / 10,
            failureRate: Math.round(failureRate * 10) / 10,
            averageProcessingTime,
            throughput,
        };
    }

    /**
     * Calculate health status for a queue
     */
    private calculateHealth(counts: QueueCountsDto, rates: QueueRatesDto): "healthy" | "degraded" | "critical" {
        // Critical: high failure rate or too many failed jobs
        if (rates.failureRate > 20 || counts.failed > 50) {
            return "critical";
        }

        // Degraded: moderate failure rate or many waiting jobs
        if (rates.failureRate > 10 || counts.waiting > 100) {
            return "degraded";
        }

        return "healthy";
    }

    /**
     * Calculate overall health score (0-100)
     */
    private calculateOverallHealthScore(stats: QueueStatsDto[]): number {
        if (stats.length === 0) return 100;

        let totalScore = 0;
        stats.forEach(stat => {
            const completionBonus = stat.rates.completionRate * 0.5;
            const failureDeduction = (100 - stat.rates.failureRate) * 0.3;
            const pauseBonus = !stat.isPaused ? 10 : -10;
            const processBonus = stat.isProcessing ? 5 : 0;

            const queueScore = (completionBonus + failureDeduction + pauseBonus + processBonus) / 100;
            totalScore += Math.max(0, Math.min(100, queueScore * 100));
        });

        return Math.round(totalScore / stats.length);
    }

    /**
     * Map BullMQ Job object to JobDetailDto
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async mapBullMQJobToDto(job: any): Promise<JobDetailDto> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const jobState = (typeof job.getState === "function" ? await job.getState() : job.state) || "unknown";
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const rawProgress = typeof job.progress === "function" ? await job.progress() : job.progress;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const jobProgress = typeof rawProgress === "number" ? rawProgress : 0;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const jobData = (job.data as Record<string, unknown>) || {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const jobReturnValue = (job.returnvalue as Record<string, unknown> | undefined) || undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const jobOpts = (job.opts as Record<string, any>) || {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const backoffType = jobOpts.backoff?.type as string;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const backoffDelay = jobOpts.backoff?.delay as number;
        const jobBackoff = jobOpts.backoff
            ? {
                  type: backoffType || "",
                  delay: backoffDelay || 0,
              }
            : undefined;

        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            id: (job.id as string) || "",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            name: (job.name as string) || "",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            queueName: (job.queueName as string) || "",
            state: jobState as JobState,
            progress: (jobProgress as number) || 0,
            data: jobData,
            returnvalue: jobReturnValue,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            failedReason: (job.failedReason as string) || undefined,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            attemptsMade: (job.attemptsMade as number) || 0,
            attempts: (jobOpts.attempts as number) || 3,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            timestamp: new Date((job.timestamp as number) || Date.now()),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            processedOn: job.processedOn ? new Date(job.processedOn as number) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            finishedOn: job.finishedOn ? new Date(job.finishedOn as number) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            delay: (job.delay as number) || 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            logs: (job.logs as string[]) || [],
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            stacktrace: (job.stacktrace as string[]) || [],
            backoff: jobBackoff,
            removeOnComplete: (jobOpts.removeOnComplete as boolean) || false,
            removeOnFail: (jobOpts.removeOnFail as boolean) || false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
}
