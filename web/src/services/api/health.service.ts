import { BaseApiService } from './base.service'

export interface WorkerStatusDetail {
    status: 'up' | 'stale' | 'down'
    lastSeen?: string
    pid?: number
    queue?: string
    error?: string
}

export interface QueueCounts {
    waiting?: number
    active?: number
    delayed?: number
    failed?: number
    completed?: number
    error?: string
}

export interface EmailHealth {
    pending: number
    sending: number
    sent: number
    failed: number
    lastAttemptAt: string | null
}

export interface SubHealth<T = Record<string, unknown>> {
    status: 'ok' | 'degraded' | 'down'
    data?: T
    latencyMs?: number
    error?: string
}

export interface ClaudeTelemetrySummary {
    currentTpm: number
    peakTpm: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    cacheTokens: number
    estimatedCostUsd: number
    totalRequests: number
    activeUsersCount: number
    tpmLimit: number
    tpmUtilizationPct: number
    models: Record<string, { modelId: string; displayName: string }>
}

export interface ClaudeMinuteUsage {
    minute: string
    timestamp: number
    tokens: number
    inputTokens: number
    outputTokens: number
    requests: number
}

export interface ClaudeUserUsage {
    userId: number
    name: string
    email: string
    totalTokens: number
    inputTokens: number
    outputTokens: number
    requests: number
    estimatedCostUsd: number
    lastActiveAt: string | null
}

export interface ClaudeRecentCall {
    id: number
    jobId: string | null
    tenderId: number | null
    callType: string
    model: string
    userName: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUsd: number
    durationMs: number | null
    createdAt: string
}

export interface AdminReconciliationReport {
    status: 'matched' | 'drift_detected' | 'unconfigured' | 'error'
    message: string
    appTrackedTokens: number
    appTrackedCostUsd: number
    anthropicVerifiedTokens: number | null
    anthropicVerifiedCostUsd: number | null
    deltaTokens: number | null
    driftPercent: number | null
    windowStart: string
    windowEnd: string
    cached: boolean
    lastCheckedAt: string
}

export interface ClaudeTelemetryResponse {
    status: string
    summary: ClaudeTelemetrySummary
    timeline: ClaudeMinuteUsage[]
    userBreakdown: ClaudeUserUsage[]
    recentCalls: ClaudeRecentCall[]
    reconciliation: AdminReconciliationReport
}

export interface TenderCallDetail {
    id: number
    jobId: string | null
    callType: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostUsd: number
    durationMs: number | null
    createdAt: string
}

export interface TenderBreakdownItem {
    tenderId: number
    totalTokens: number
    estimatedCostUsd: number
    totalCalls: number
    lastActiveAt: string
    calls: TenderCallDetail[]
}

export interface SystemHealth {
    status: 'ok' | 'degraded' | 'down'
    data: {
        api: SubHealth<{ processId?: number; uptimeSeconds?: number; version?: string; timestamp?: string }>
        database: SubHealth<{ latencyMs?: number }>
        redis: SubHealth<{ ping?: string }>
        queues: SubHealth<Record<string, QueueCounts>>
        workers: SubHealth<Record<string, WorkerStatusDetail>>
        email: SubHealth<EmailHealth>
        claude?: SubHealth<{ currentTpm?: number; status?: string; models?: string[] }>
    }
}

class HealthService extends BaseApiService {
    constructor() {
        super('/health')
    }

    async getSystemHealth(): Promise<SystemHealth> {
        return this.get<SystemHealth>('')
    }

    async getClaudeTelemetry(): Promise<ClaudeTelemetryResponse> {
        return this.get<ClaudeTelemetryResponse>('/claude')
    }

    async getClaudeTenders(sortBy: 'cost' | 'tokens' | 'recent' = 'cost'): Promise<TenderBreakdownItem[]> {
        return this.get<TenderBreakdownItem[]>(`/claude/tenders?sortBy=${sortBy}`)
    }
}

export const healthService = new HealthService()

