export type JobState = "failed" | "completed" | "active" | "waiting" | "delayed" | "paused";

export class JobDetailDto {
    "id": string;
    "name": string;
    "queueName": string;
    "state": JobState;
    "progress": number;
    "data": Record<string, any>;
    "returnvalue"?: Record<string, any>;
    "failedReason"?: string;
    "attemptsMade": number;
    "attempts": number;
    "timestamp": Date;
    "processedOn"?: Date;
    "finishedOn"?: Date;
    "delay": number;
    "logs"?: string[];
    "stacktrace"?: string[];
    "backoff"?: { type: string; delay: number };
    "removeOnComplete"?: boolean;
    "removeOnFail"?: boolean;
    "createdAt": Date;
    "updatedAt": Date;
}

export class JobListResponseDto {
    "total": number;
    "page": number;
    "limit": number;
    "pages": number;
    "jobs": JobDetailDto[];
}

export class JobQueryDto {
    "status"?: JobState | "all";
    "limit"?: number;
    "offset"?: number;
    "sortBy"?: "timestamp" | "processingTime";
    "order"?: "asc" | "desc";
    "fromDate"?: Date;
    "toDate"?: Date;
}
