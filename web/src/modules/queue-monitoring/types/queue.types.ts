export interface QueueCounts {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}

export interface QueueRates {
    completionRate: number;  // 0-100%
    failureRate: number;     // 0-100%
    averageProcessingTime: number;  // ms
    throughput: number;      // jobs/min
}

export interface QueueStats {
    name: string;
    displayName: string;
    counts: QueueCounts;
    rates: QueueRates;
    health: 'healthy' | 'degraded' | 'critical';
    lastActivity: Date;
    isPaused: boolean;
    isProcessing: boolean;
}

export interface QueueStatsResponse {
    timestamp: Date;
    queues: QueueStats[];
    summary: {
        totalWaiting: number;
        totalActive: number;
        totalFailed: number;
        criticalQueues: number;
        degradedQueues: number;
        healthScore: number;  // 0-100
    };
}

export type JobState = 'failed' | 'completed' | 'active' | 'waiting' | 'delayed' | 'paused';

export interface Job {
    id: string;
    name: string;
    queueName: string;
    state: JobState;
    progress: number;
    data: Record<string, any>;
    returnvalue?: Record<string, any>;
    failedReason?: string;
    attemptsMade: number;
    attempts: number;
    timestamp: Date;
    processedOn?: Date;
    finishedOn?: Date;
    delay: number;
    logs?: string[];
    stacktrace?: string[];
    backoff?: { type: string; delay: number };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface JobListResponse {
    total: number;
    page: number;
    limit: number;
    pages: number;
    jobs: Job[];
}
