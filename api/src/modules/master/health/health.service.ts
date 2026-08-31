import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import type IORedis from "ioredis";
import { Queue } from "bullmq";

export interface WorkerHeartbeat {
    pid?: number;
    startedAt?: string;
    lastSeen?: string;
    queue?: string;
}

export interface HealthResult {
    status: "ok" | "degraded" | "down";
    data: Record<string, unknown>;
}

const WORKER_KEYS: Record<string, string> = {
    followup: "worker:followup",
    accountChecklist: "worker:account-checklist",
    videoProcessing: "worker:video-processing",
    genericMail: "worker:generic-mail",
};

const QUEUE_DEFINITIONS: { key: string; token: string }[] = [
    { key: "followup-mail-queue", token: "FOLLOWUP_QUEUE" },
    { key: "checklist-mail-queue", token: "CHECKLIST_QUEUE" },
    { key: "video-processing-queue", token: "VIDEO_PROCESSING_QUEUE" },
    { key: "generic-mail-queue", token: "GENERIC_QUEUE" },
];

@Injectable()
export class HealthService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject("REDIS_CONNECTION") private readonly redis: IORedis | null,
        @Inject("FOLLOWUP_QUEUE") private readonly followupQueue: Queue,
        @Inject("CHECKLIST_QUEUE") private readonly checklistQueue: Queue,
        @Inject("VIDEO_PROCESSING_QUEUE") private readonly videoProcessingQueue: Queue,
        @Inject("GENERIC_QUEUE") private readonly genericQueue: Queue
    ) {}

    private queues(): Record<string, Queue> {
        return {
            "followup-mail-queue": this.followupQueue,
            "checklist-mail-queue": this.checklistQueue,
            "video-processing-queue": this.videoProcessingQueue,
            "generic-mail-queue": this.genericQueue,
        };
    }

    async getHealth(): Promise<HealthResult> {
        const [api, database, redis, queues, workers, email] = await Promise.all([
            Promise.resolve(this.checkApi()),
            this.checkDatabase(),
            this.checkRedis(),
            this.checkQueues(),
            this.checkWorkers(),
            this.checkEmail(),
        ]);

        const results = { api, database, redis, queues, workers, email };
        const statuses = [api.status, database.status, redis.status, queues.status, workers.status, email.status];

        const status: "ok" | "degraded" | "down" = statuses.includes("down") ? "down" : statuses.includes("degraded") ? "degraded" : "ok";

        return { status, data: results };
    }

    private checkApi(): HealthResult {
        const startedAt = new Date().toISOString();
        return {
            status: "ok",
            data: {
                processId: process.pid,
                uptimeSeconds: Math.round(process.uptime()),
                version: "1.0.1",
                timestamp: startedAt,
            },
        };
    }

    private async checkDatabase(): Promise<HealthResult> {
        const startedAt = Date.now();
        try {
            await this.db.execute(sql`SELECT 1`);
            return {
                status: "ok",
                data: { latencyMs: Date.now() - startedAt },
            };
        } catch (err: unknown) {
            return {
                status: "down",
                data: { error: err instanceof Error ? err.message : String(err) },
            };
        }
    }

    private async checkRedis(): Promise<HealthResult> {
        if (!this.redis) {
            return { status: "down", data: { error: "redis not configured" } };
        }
        try {
            const pong = await this.redis.ping();
            return {
                status: pong === "PONG" ? "ok" : "degraded",
                data: { ping: pong },
            };
        } catch (err: unknown) {
            return {
                status: "down",
                data: { error: err instanceof Error ? err.message : String(err) },
            };
        }
    }

    private async checkQueues(): Promise<HealthResult> {
        const queues = this.queues();
        const details: Record<string, Record<string, number | string | undefined>> = {};
        let degraded = false;

        for (const def of QUEUE_DEFINITIONS) {
            const queue = queues[def.key];
            try {
                const counts = (await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed")) as Record<string, number | undefined>;
                details[def.key] = { ...counts };
                if ((counts.failed ?? 0) > 0 || (counts.active ?? 0) > 0) {
                    degraded = true;
                }
            } catch (err: unknown) {
                details[def.key] = {
                    error: err instanceof Error ? err.message : String(err),
                };
                degraded = true;
            }
        }

        return {
            status: degraded ? "degraded" : "ok",
            data: details,
        };
    }

    private async checkWorkers(): Promise<HealthResult> {
        if (!this.redis) {
            const details: Record<string, { status: string }> = {};
            for (const key of Object.keys(WORKER_KEYS)) {
                details[key] = { status: "down" };
            }
            return { status: "down", data: details };
        }

        const details: Record<string, { status: "up" | "stale" | "down"; lastSeen?: string; pid?: number; queue?: string; error?: string }> = {};
        let degraded = false;

        for (const [name, redisKey] of Object.entries(WORKER_KEYS)) {
            try {
                const raw = await this.redis.get(redisKey);
                if (!raw) {
                    details[name] = { status: "down" };
                    degraded = true;
                    continue;
                }
                const parsed = JSON.parse(raw) as WorkerHeartbeat;
                const lastSeen = parsed.lastSeen ? Date.parse(parsed.lastSeen) : NaN;
                const stale = Number.isNaN(lastSeen) || Date.now() - lastSeen > 30_000;
                details[name] = {
                    status: stale ? "stale" : "up",
                    lastSeen: parsed.lastSeen,
                    pid: parsed.pid,
                    queue: parsed.queue,
                };
                if (stale) degraded = true;
            } catch (err: unknown) {
                details[name] = {
                    status: "down",
                    error: err instanceof Error ? err.message : String(err),
                };
                degraded = true;
            }
        }

        return {
            status: degraded ? "degraded" : "ok",
            data: details,
        };
    }

    private async checkEmail(): Promise<HealthResult> {
        try {
            const counts = await this.db.execute(sql`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending,
                    COUNT(*) FILTER (WHERE status = 'sending')::int  AS sending,
                    COUNT(*) FILTER (WHERE status = 'sent')::int     AS sent,
                    COUNT(*) FILTER (WHERE status = 'failed')::int   AS failed,
                    MAX(last_attempt_at)                             AS last_attempt_at
                FROM email_logs
            `);
            const rows = counts.rows as Array<{
                pending?: number;
                sending?: number;
                sent?: number;
                failed?: number;
                last_attempt_at?: string | Date;
            }>;
            const row = rows[0] ?? {};
            const failed = row.failed ?? 0;
            return {
                status: failed > 0 ? "degraded" : "ok",
                data: {
                    pending: row.pending ?? 0,
                    sending: row.sending ?? 0,
                    sent: row.sent ?? 0,
                    failed,
                    lastAttemptAt: row.last_attempt_at ?? null,
                },
            };
        } catch (err: unknown) {
            return {
                status: "down",
                data: { error: err instanceof Error ? err.message : String(err) },
            };
        }
    }
}
