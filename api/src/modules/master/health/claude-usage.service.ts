import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql, desc, eq, and, gte } from 'drizzle-orm';
import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';
import type IORedis from 'ioredis';
import { claudeTokenUsage } from '@/db/schemas/shared/claude-token-usage.schema';
import { users } from '@/db/schemas/auth/users.schema';
import {
    calculateClaudeCostUsd,
    CLAUDE_PRICING,
    DEFAULT_ROLE1_MODEL,
    DEFAULT_ROLE2_MODEL,
} from '@/config/claude-pricing.config';
import * as crypto from 'crypto';

export interface StageUsageDetail {
    call_type: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens?: number;
    cache_read_tokens?: number;
    total_tokens: number;
    estimated_cost_usd: number;
    calls_count?: number;
}

export interface IngestionUsageSummary {
    role1_model?: string;
    role2_model?: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_tokens?: number;
    cache_read_tokens?: number;
    raw_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
    stages?: Record<string, StageUsageDetail>;
}

export interface RecordUsageParams {
    userId?: number;
    tenderId?: number;
    jobId?: string;
    durationMs?: number;
    usage: IngestionUsageSummary;
}

export interface MinuteTimelineItem {
    minute: string; // ISO minute (e.g. 2026-09-11T13:45:00Z)
    timestamp: number; // Unix ms
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
}

export interface UserUsageItem {
    userId: number;
    name: string;
    email: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
    estimatedCostUsd: number;
    estimatedCostInr: number;
    lastActiveAt: string | null;
}

export interface TenderCallDetail {
    id: number;
    jobId: string | null;
    callType: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    estimatedCostInr: number;
    durationMs: number | null;
    createdAt: string;
}

export interface TenderBreakdownItem {
    tenderId: number;
    totalTokens: number;
    estimatedCostUsd: number;
    estimatedCostInr: number;
    totalCalls: number;
    lastActiveAt: string;
    calls: TenderCallDetail[];
}

export interface CurrencyMeta {
    usdToInrRate: number;
    usdToInrRateAsOf: string;
}

const TPM_ZSET_KEY = 'claude:tpm:zset';
const TPM_WINDOW_MS = 60 * 1000; // 60 seconds
const TPM_KEY_EXPIRE_SECONDS = 7200; // 2 hours backstop TTL

@Injectable()
export class ClaudeUsageService {
    private readonly logger = new Logger(ClaudeUsageService.name);

    // In-memory sliding window fallback if Redis is not reachable
    private memoryTpmEntries: { timestamp: number; tokens: number; id: string }[] = [];

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject('REDIS_CONNECTION') private readonly redis: IORedis | null,
        private readonly configService: ConfigService,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // USD -> INR CONVERSION (display only; claude_token_usage stays USD)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Reads the configured USD->INR rate + its "as of" date from currency.config.ts.
     * This is a manually-set snapshot, not a live rate -- logged/returned alongside
     * every conversion so a stale rate is never mistaken for a live one.
     */
    private getCurrencyMeta(): CurrencyMeta {
        const usdToInrRate = this.configService.get<number>('currency.usdToInrRate') ?? 94.83;
        const usdToInrRateAsOf = this.configService.get<string>('currency.usdToInrRateAsOf') ?? 'unknown';
        return { usdToInrRate, usdToInrRateAsOf };
    }

    private toInr(usdAmount: number, rate: number): number {
        return Number((usdAmount * rate).toFixed(4));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SLIDING WINDOW TPM IMPLEMENTATION (ZSET with ZREMRANGEBYSCORE)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Adds an entry to the TPM sliding window and immediately prunes expired entries.
     * Exact Redis commands:
     *   1. ZADD claude:tpm:zset <now_ms> <now_ms>:<tokens>:<uuid>
     *   2. ZREMRANGEBYSCORE claude:tpm:zset 0 <now_ms - 60000>
     *   3. EXPIRE claude:tpm:zset 7200 (backstop)
     */
    async recordTpmEntry(tokens: number): Promise<void> {
        if (!tokens || tokens <= 0) return;
        const now = Date.now();
        const cutoff = now - TPM_WINDOW_MS;
        const entryId = crypto.randomUUID();
        const member = `${now}:${tokens}:${entryId}`;

        if (this.redis) {
            try {
                const pipe = this.redis.pipeline();
                pipe.zadd(TPM_ZSET_KEY, now, member);
                pipe.zremrangebyscore(TPM_ZSET_KEY, 0, cutoff);
                pipe.expire(TPM_ZSET_KEY, TPM_KEY_EXPIRE_SECONDS);
                await pipe.exec();
                return;
            } catch (err: unknown) {
                this.logger.warn(`Redis ZSET ZADD error: ${(err as Error).message}. Falling back to in-memory.`);
            }
        }

        // In-memory sliding window fallback
        this.memoryTpmEntries = this.memoryTpmEntries.filter((e) => e.timestamp > cutoff);
        this.memoryTpmEntries.push({ timestamp: now, tokens, id: entryId });
    }

    /**
     * Reads current Tokens Per Minute by pruning entries older than 60s and summing remainder.
     * Exact Redis commands:
     *   1. ZREMRANGEBYSCORE claude:tpm:zset 0 <now_ms - 60000>
     *   2. ZRANGEBYSCORE claude:tpm:zset <now_ms - 60000> <now_ms>
     */
    async getCurrentTpm(): Promise<number> {
        const now = Date.now();
        const cutoff = now - TPM_WINDOW_MS;

        if (this.redis) {
            try {
                await this.redis.zremrangebyscore(TPM_ZSET_KEY, 0, cutoff);
                const entries = await this.redis.zrangebyscore(TPM_ZSET_KEY, cutoff, now);
                let sumTokens = 0;
                for (const item of entries) {
                    const parts = item.split(':');
                    if (parts.length >= 2) {
                        const count = parseInt(parts[1], 10);
                        if (!isNaN(count)) sumTokens += count;
                    }
                }
                return sumTokens;
            } catch (err: unknown) {
                this.logger.warn(`Redis ZSET read error: ${(err as Error).message}. Falling back to in-memory.`);
            }
        }

        // In-memory fallback
        this.memoryTpmEntries = this.memoryTpmEntries.filter((e) => e.timestamp > cutoff);
        return this.memoryTpmEntries.reduce((sum, e) => sum + e.tokens, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RECORD USAGE EVENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Records token usage from an extraction run into claude_token_usage.
     * If stages are present (missing_field_fallback, ambiguity_resolution), inserts
     * a granular row for each stage. Also feeds the real-time sliding window TPM counter.
     */
    async recordUsage(params: RecordUsageParams): Promise<void> {
        const { userId, tenderId, jobId, durationMs, usage } = params;
        if (!usage) return;

        const stages = usage.stages;
        const insertedRows: Array<typeof claudeTokenUsage.$inferInsert> = [];

        if (stages && typeof stages === 'object') {
            for (const [stageKey, stageData] of Object.entries(stages)) {
                const stageTokens = stageData.total_tokens ?? 0;
                if (stageTokens <= 0 && !stageData.calls_count) continue;

                const model = stageData.model || (stageKey === 'ambiguity_resolution' ? DEFAULT_ROLE2_MODEL : DEFAULT_ROLE1_MODEL);
                const cost =
                    stageData.estimated_cost_usd != null && stageData.estimated_cost_usd > 0
                        ? stageData.estimated_cost_usd
                        : calculateClaudeCostUsd({
                              model,
                              inputTokens: stageData.input_tokens ?? 0,
                              outputTokens: stageData.output_tokens ?? 0,
                              cacheCreationTokens: stageData.cache_creation_tokens ?? 0,
                              cacheReadTokens: stageData.cache_read_tokens ?? 0,
                          });

                insertedRows.push({
                    userId: userId ?? null,
                    tenderId: tenderId ?? null,
                    jobId: jobId ?? null,
                    callType: stageKey,
                    model,
                    inputTokens: stageData.input_tokens ?? 0,
                    outputTokens: stageData.output_tokens ?? 0,
                    cacheCreationTokens: stageData.cache_creation_tokens ?? 0,
                    cacheReadTokens: stageData.cache_read_tokens ?? 0,
                    totalTokens: stageTokens,
                    estimatedCostUsd: cost.toFixed(6),
                    durationMs: durationMs ?? null,
                });
            }
        }

        // Fallback: If no granular stages recorded tokens, record aggregate
        if (insertedRows.length === 0) {
            const totTokens = usage.total_tokens ?? usage.raw_tokens ?? 0;
            const model = usage.role1_model || DEFAULT_ROLE1_MODEL;
            const cost =
                usage.estimated_cost_usd != null && usage.estimated_cost_usd > 0
                    ? usage.estimated_cost_usd
                    : calculateClaudeCostUsd({
                          model,
                          inputTokens: usage.input_tokens ?? 0,
                          outputTokens: usage.output_tokens ?? 0,
                          cacheCreationTokens: usage.cache_creation_tokens ?? 0,
                          cacheReadTokens: usage.cache_read_tokens ?? 0,
                      });

            insertedRows.push({
                userId: userId ?? null,
                tenderId: tenderId ?? null,
                jobId: jobId ?? null,
                callType: 'main_extraction',
                model,
                inputTokens: usage.input_tokens ?? 0,
                outputTokens: usage.output_tokens ?? 0,
                cacheCreationTokens: usage.cache_creation_tokens ?? 0,
                cacheReadTokens: usage.cache_read_tokens ?? 0,
                totalTokens: totTokens,
                estimatedCostUsd: cost.toFixed(6),
                durationMs: durationMs ?? null,
            });
        }

        // Persist to Postgres database via Drizzle
        try {
            await this.db.insert(claudeTokenUsage).values(insertedRows);
            this.logger.log(
                `Recorded ${insertedRows.length} Claude token usage row(s) for tender ${tenderId}, user ${userId}`,
            );
        } catch (dbErr: unknown) {
            this.logger.error(`Failed to insert claude_token_usage: ${(dbErr as Error).message}`);
        }

        // Update real-time sliding window TPM for each stage's tokens
        for (const row of insertedRows) {
            const toks = row.totalTokens ?? 0;
            if (toks > 0) {
                await this.recordTpmEntry(toks);
            }
        }

    }

    // ─────────────────────────────────────────────────────────────────────────
    // TELEMETRY QUERIES (Dashboard Data)
    // ─────────────────────────────────────────────────────────────────────────

    async getClaudeTelemetry() {
        const currencyMeta = this.getCurrencyMeta();
        const [currentTpm, statsRes, timeline, userBreakdown, recentCalls] = await Promise.all([
            this.getCurrentTpm(),
            this.getAggregateStats(currencyMeta),
            this.getMinuteTimeline(60),
            this.getUserBreakdown(currencyMeta),
            this.getRecentCalls(20, currencyMeta),
        ]);

        this.logger.log(
            `[CURRENCY] Claude telemetry cost converted using USD->INR rate ${currencyMeta.usdToInrRate} (as of ${currencyMeta.usdToInrRateAsOf}). Update USD_TO_INR_RATE periodically.`,
        );

        return {
            status: 'ok',
            summary: {
                currentTpm,
                peakTpm: statsRes.peakTpm,
                totalTokens: statsRes.totalTokens,
                inputTokens: statsRes.inputTokens,
                outputTokens: statsRes.outputTokens,
                cacheTokens: statsRes.cacheTokens,
                estimatedCostUsd: statsRes.estimatedCostUsd,
                estimatedCostInr: statsRes.estimatedCostInr,
                totalRequests: statsRes.totalRequests,
                activeUsersCount: userBreakdown.length,
                tpmLimit: 80000,
                tpmUtilizationPct: Number(((currentTpm / 80000) * 100).toFixed(1)),
                models: CLAUDE_PRICING,
                currency: currencyMeta,
            },
            timeline,
            userBreakdown,
            recentCalls,
        };
    }

    private async getAggregateStats(currencyMeta: CurrencyMeta) {
        try {
            const res = await this.db.execute(sql`
                SELECT
                    COALESCE(SUM(total_tokens), 0)::bigint as total_tokens,
                    COALESCE(SUM(input_tokens), 0)::bigint as input_tokens,
                    COALESCE(SUM(output_tokens), 0)::bigint as output_tokens,
                    COALESCE(SUM(cache_creation_tokens + cache_read_tokens), 0)::bigint as cache_tokens,
                    COALESCE(SUM(estimated_cost_usd), 0)::numeric as estimated_cost_usd,
                    COUNT(*)::bigint as total_requests
                FROM claude_token_usage
            `);
            const row = (res.rows?.[0] as Record<string, unknown>) || {};
            const estimatedCostUsd = Number(parseFloat(String(row.estimated_cost_usd || 0)).toFixed(4));
            return {
                totalTokens: Number(row.total_tokens || 0),
                inputTokens: Number(row.input_tokens || 0),
                outputTokens: Number(row.output_tokens || 0),
                cacheTokens: Number(row.cache_tokens || 0),
                estimatedCostUsd,
                estimatedCostInr: this.toInr(estimatedCostUsd, currencyMeta.usdToInrRate),
                totalRequests: Number(row.total_requests || 0),
                peakTpm: 0,
            };
        } catch {
            return {
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                cacheTokens: 0,
                estimatedCostUsd: 0,
                estimatedCostInr: 0,
                totalRequests: 0,
                peakTpm: 0,
            };
        }
    }

    private async getMinuteTimeline(minutes = 60): Promise<MinuteTimelineItem[]> {
        const timeline: MinuteTimelineItem[] = [];
        const now = new Date();

        try {
            const res = await this.db.execute(sql`
                SELECT 
                    date_trunc('minute', created_at) as minute_bucket,
                    COALESCE(SUM(total_tokens), 0)::bigint as tokens,
                    COALESCE(SUM(input_tokens), 0)::bigint as input_tokens,
                    COALESCE(SUM(output_tokens), 0)::bigint as output_tokens,
                    COUNT(*)::bigint as requests
                FROM claude_token_usage
                WHERE created_at >= NOW() - INTERVAL '60 minutes'
                GROUP BY minute_bucket
                ORDER BY minute_bucket ASC
            `);

            const map = new Map<string, { tokens: number; inputTokens: number; outputTokens: number; requests: number }>();
            for (const r of (res.rows as Array<Record<string, unknown>>) || []) {
                const key = new Date(String(r.minute_bucket)).toISOString().slice(0, 16);
                map.set(key, {
                    tokens: Number(r.tokens || 0),
                    inputTokens: Number(r.input_tokens || 0),
                    outputTokens: Number(r.output_tokens || 0),
                    requests: Number(r.requests || 0),
                });
            }

            // Fill all discrete minutes
            for (let i = minutes - 1; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 60 * 1000);
                const key = d.toISOString().slice(0, 16);
                const entry = map.get(key) || { tokens: 0, inputTokens: 0, outputTokens: 0, requests: 0 };
                timeline.push({
                    minute: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: d.getTime(),
                    tokens: entry.tokens,
                    inputTokens: entry.inputTokens,
                    outputTokens: entry.outputTokens,
                    requests: entry.requests,
                });
            }
        } catch {
            for (let i = minutes - 1; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 60 * 1000);
                timeline.push({
                    minute: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: d.getTime(),
                    tokens: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    requests: 0,
                });
            }
        }

        return timeline;
    }

    private async getUserBreakdown(currencyMeta: CurrencyMeta): Promise<UserUsageItem[]> {
        try {
            const res = await this.db.execute(sql`
                SELECT
                    c.user_id,
                    COALESCE(u.name, 'Unassigned User') as user_name,
                    COALESCE(u.email, 'system@volks.ai') as user_email,
                    COALESCE(SUM(c.total_tokens), 0)::bigint as total_tokens,
                    COALESCE(SUM(c.input_tokens), 0)::bigint as input_tokens,
                    COALESCE(SUM(c.output_tokens), 0)::bigint as output_tokens,
                    COALESCE(SUM(c.estimated_cost_usd), 0)::numeric as estimated_cost_usd,
                    COUNT(*)::bigint as total_requests,
                    MAX(c.created_at) as last_active_at
                FROM claude_token_usage c
                LEFT JOIN users u ON u.id = c.user_id
                GROUP BY c.user_id, u.name, u.email
                ORDER BY total_tokens DESC
            `);

            return ((res.rows as Array<Record<string, unknown>>) || []).map((row) => {
                const estimatedCostUsd = Number(parseFloat(String(row.estimated_cost_usd || 0)).toFixed(4));
                return {
                    userId: Number(row.user_id || 0),
                    name: String(row.user_name),
                    email: String(row.user_email),
                    totalTokens: Number(row.total_tokens || 0),
                    inputTokens: Number(row.input_tokens || 0),
                    outputTokens: Number(row.output_tokens || 0),
                    requests: Number(row.total_requests || 0),
                    estimatedCostUsd,
                    estimatedCostInr: this.toInr(estimatedCostUsd, currencyMeta.usdToInrRate),
                    lastActiveAt: row.last_active_at ? new Date(String(row.last_active_at)).toISOString() : null,
                };
            });
        } catch {
            return [];
        }
    }

    private async getRecentCalls(limit = 20, currencyMeta?: CurrencyMeta) {
        const currency = currencyMeta ?? this.getCurrencyMeta();
        try {
            const res = await this.db.execute(sql`
                SELECT
                    c.id,
                    c.job_id,
                    c.tender_id,
                    c.call_type,
                    c.model,
                    c.input_tokens,
                    c.output_tokens,
                    c.total_tokens,
                    c.estimated_cost_usd,
                    c.duration_ms,
                    c.created_at,
                    COALESCE(u.name, 'System') as user_name
                FROM claude_token_usage c
                LEFT JOIN users u ON u.id = c.user_id
                ORDER BY c.created_at DESC
                LIMIT ${limit}
            `);

            return ((res.rows as Array<Record<string, unknown>>) || []).map((row) => {
                const estimatedCostUsd = Number(parseFloat(String(row.estimated_cost_usd || 0)).toFixed(4));
                return {
                    id: Number(row.id),
                    jobId: row.job_id ? String(row.job_id) : null,
                    tenderId: row.tender_id ? Number(row.tender_id) : null,
                    callType: String(row.call_type),
                    model: String(row.model),
                    userName: String(row.user_name),
                    inputTokens: Number(row.input_tokens || 0),
                    outputTokens: Number(row.output_tokens || 0),
                    totalTokens: Number(row.total_tokens || 0),
                    estimatedCostUsd,
                    estimatedCostInr: this.toInr(estimatedCostUsd, currency.usdToInrRate),
                    durationMs: row.duration_ms ? Number(row.duration_ms) : null,
                    createdAt: new Date(String(row.created_at)).toISOString(),
                };
            });
        } catch {
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEW REQUIREMENT: PER-TENDER BREAKDOWN (Grouped by tender_id)
    // ─────────────────────────────────────────────────────────────────────────

    async getTendersBreakdown(sortBy: 'cost' | 'tokens' | 'recent' = 'cost'): Promise<TenderBreakdownItem[]> {
        const currencyMeta = this.getCurrencyMeta();
        try {
            // First fetch all calls ordered by tender
            const res = await this.db.execute(sql`
                SELECT 
                    c.id,
                    c.tender_id,
                    c.job_id,
                    c.call_type,
                    c.model,
                    c.input_tokens,
                    c.output_tokens,
                    c.total_tokens,
                    c.estimated_cost_usd,
                    c.duration_ms,
                    c.created_at
                FROM claude_token_usage c
                WHERE c.tender_id IS NOT NULL
                ORDER BY c.created_at DESC
            `);

            const grouped = new Map<number, TenderBreakdownItem>();

            for (const row of (res.rows as Array<Record<string, unknown>>) || []) {
                const tId = Number(row.tender_id);
                const estimatedCostUsd = Number(parseFloat(String(row.estimated_cost_usd || 0)).toFixed(4));
                const callDetail: TenderCallDetail = {
                    id: Number(row.id),
                    jobId: row.job_id ? String(row.job_id) : null,
                    callType: String(row.call_type),
                    model: String(row.model),
                    inputTokens: Number(row.input_tokens || 0),
                    outputTokens: Number(row.output_tokens || 0),
                    totalTokens: Number(row.total_tokens || 0),
                    estimatedCostUsd,
                    estimatedCostInr: this.toInr(estimatedCostUsd, currencyMeta.usdToInrRate),
                    durationMs: row.duration_ms ? Number(row.duration_ms) : null,
                    createdAt: new Date(String(row.created_at)).toISOString(),
                };

                if (!grouped.has(tId)) {
                    grouped.set(tId, {
                        tenderId: tId,
                        totalTokens: 0,
                        estimatedCostUsd: 0,
                        estimatedCostInr: 0,
                        totalCalls: 0,
                        lastActiveAt: callDetail.createdAt,
                        calls: [],
                    });
                }

                const item = grouped.get(tId)!;
                item.totalTokens += callDetail.totalTokens;
                item.estimatedCostUsd = Number((item.estimatedCostUsd + callDetail.estimatedCostUsd).toFixed(4));
                item.estimatedCostInr = this.toInr(item.estimatedCostUsd, currencyMeta.usdToInrRate);
                item.totalCalls += 1;
                item.calls.push(callDetail);
            }

            const list = Array.from(grouped.values());

            // Sort
            if (sortBy === 'tokens') {
                list.sort((a, b) => b.totalTokens - a.totalTokens);
            } else if (sortBy === 'recent') {
                list.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
            } else {
                // Default: cost
                list.sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);
            }

            return list;
        } catch (err: unknown) {
            this.logger.error(`Error querying getTendersBreakdown: ${(err as Error).message}`);
            return [];
        }
    }
}
