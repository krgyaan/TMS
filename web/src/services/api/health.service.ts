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

export interface SystemHealth {
    status: 'ok' | 'degraded' | 'down'
    data: {
        api: SubHealth<{ processId?: number; uptimeSeconds?: number; version?: string; timestamp?: string }>
        database: SubHealth<{ latencyMs?: number }>
        redis: SubHealth<{ ping?: string }>
        queues: SubHealth<Record<string, QueueCounts>>
        workers: SubHealth<Record<string, WorkerStatusDetail>>
        email: SubHealth<EmailHealth>
    }
}

class HealthService extends BaseApiService {
    constructor() {
        super('/health')
    }

    async getSystemHealth(): Promise<SystemHealth> {
        return this.get<SystemHealth>('')
    }
}

export const healthService = new HealthService()
