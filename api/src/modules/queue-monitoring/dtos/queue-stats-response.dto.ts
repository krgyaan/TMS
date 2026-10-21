export class QueueCountsDto {
    "waiting": number;
    "active": number;
    "completed": number;
    "failed": number;
    "delayed": number;
    "paused": number;
}

export class QueueRatesDto {
    "completionRate": number; // 0-100%
    "failureRate": number; // 0-100%
    "averageProcessingTime": number; // ms
    "throughput": number; // jobs/min
}

export class QueueStatsDto {
    "name": string;
    "displayName": string;
    "counts": QueueCountsDto;
    "rates": QueueRatesDto;
    "health": "healthy" | "degraded" | "critical";
    "lastActivity": Date;
    "isPaused": boolean;
    "isProcessing": boolean;
}

export class QueueStatsResponseDto {
    "timestamp": Date;
    "queues": QueueStatsDto[];
    "summary": {
        "totalWaiting": number;
        "totalActive": number;
        "totalFailed": number;
        "criticalQueues": number;
        "degradedQueues": number;
        "healthScore": number; // 0-100
    };
}
