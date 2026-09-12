import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';

export interface AdminReconciliationReport {
    status: 'matched' | 'drift_detected' | 'unconfigured' | 'error';
    message: string;
    appTrackedTokens: number;
    appTrackedCostUsd: number;
    anthropicVerifiedTokens: number | null;
    anthropicVerifiedCostUsd: number | null;
    deltaTokens: number | null;
    driftPercent: number | null;
    windowStart: string;
    windowEnd: string;
    cached: boolean;
    lastCheckedAt: string;
}

interface CachedReport {
    timestamp: number;
    data: AdminReconciliationReport;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache
const ANTHROPIC_USAGE_REPORT_URL = 'https://api.anthropic.com/v1/organizations/usage_report/messages';
const ANTHROPIC_VERSION = '2023-06-01';

@Injectable()
export class AdminUsageService {
    private readonly logger = new Logger(AdminUsageService.name);
    private cachedReport: CachedReport | null = null;

    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getReconciliationReport(forceRefresh = false): Promise<AdminReconciliationReport> {
        const now = Date.now();

        // Return cached report if fresh
        if (!forceRefresh && this.cachedReport && now - this.cachedReport.timestamp < CACHE_TTL_MS) {
            return {
                ...this.cachedReport.data,
                cached: true,
            };
        }

        const adminKey = (process.env.ANTHROPIC_ADMIN_API_KEY || process.env.ANTHROPIC_ADMIN_KEY || '').trim();

        // Window: Today from 00:00 UTC to now
        const startDt = new Date();
        startDt.setUTCHours(0, 0, 0, 0);
        const endDt = new Date();

        // Query app-tracked usage for this window
        const appTracked = await this.getAppTrackedUsage(startDt, endDt);

        // If admin key is not set, cleanly report unconfigured without falsifying results
        if (!adminKey || adminKey.toLowerCase().includes('placeholder') || adminKey.toLowerCase().includes('your_')) {
            const unconfiguredReport: AdminReconciliationReport = {
                status: 'unconfigured',
                message: 'ANTHROPIC_ADMIN_API_KEY not configured. Set organization admin key to enable verified reconciliation.',
                appTrackedTokens: appTracked.tokens,
                appTrackedCostUsd: appTracked.costUsd,
                anthropicVerifiedTokens: null,
                anthropicVerifiedCostUsd: null,
                deltaTokens: null,
                driftPercent: null,
                windowStart: startDt.toISOString(),
                windowEnd: endDt.toISOString(),
                cached: false,
                lastCheckedAt: new Date().toISOString(),
            };

            this.cachedReport = { timestamp: now, data: unconfiguredReport };
            return unconfiguredReport;
        }

        // Call Anthropic Organization Usage Report API
        try {
            const url = new URL(ANTHROPIC_USAGE_REPORT_URL);
            url.searchParams.set('starting_at', startDt.toISOString());
            url.searchParams.set('ending_at', endDt.toISOString());
            url.searchParams.set('bucket_width', '1h');

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'x-api-key': adminKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                },
                signal: AbortSignal.timeout(10000), // 10s timeout guard
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Anthropic Usage API returned HTTP ${response.status}: ${errText}`);
            }

            const reportJson = (await response.json()) as {
                data?: Array<{
                    uncached_input_tokens?: number;
                    cached_input_tokens?: number;
                    cache_creation_input_tokens?: number;
                    output_tokens?: number;
                }>;
            };

            let anthropicTokens = 0;
            for (const bucket of reportJson.data || []) {
                anthropicTokens +=
                    (bucket.uncached_input_tokens ?? 0) +
                    (bucket.cached_input_tokens ?? 0) +
                    (bucket.cache_creation_input_tokens ?? 0) +
                    (bucket.output_tokens ?? 0);
            }

            const deltaTokens = appTracked.tokens - anthropicTokens;
            const denom = Math.max(anthropicTokens, appTracked.tokens, 1);
            const driftPercent = Number(((Math.abs(deltaTokens) / denom) * 100).toFixed(2));
            const status: 'matched' | 'drift_detected' = driftPercent <= 5.0 ? 'matched' : 'drift_detected';

            const report: AdminReconciliationReport = {
                status,
                message:
                    status === 'matched'
                        ? `Usage reconciled with Anthropic Organization API (drift: ${driftPercent}%)`
                        : `Drift detected between internal telemetry and Anthropic API (${driftPercent}% variance)`,
                appTrackedTokens: appTracked.tokens,
                appTrackedCostUsd: appTracked.costUsd,
                anthropicVerifiedTokens: anthropicTokens,
                anthropicVerifiedCostUsd: null, // Usage API returns token metrics; cost API is separate
                deltaTokens,
                driftPercent,
                windowStart: startDt.toISOString(),
                windowEnd: endDt.toISOString(),
                cached: false,
                lastCheckedAt: new Date().toISOString(),
            };

            this.cachedReport = { timestamp: now, data: report };
            return report;
        } catch (err: unknown) {
            this.logger.error(`Failed to reconcile with Anthropic Admin API: ${(err as Error).message}`);

            const errorReport: AdminReconciliationReport = {
                status: 'error',
                message: `Failed to contact Anthropic Usage API: ${(err as Error).message}`,
                appTrackedTokens: appTracked.tokens,
                appTrackedCostUsd: appTracked.costUsd,
                anthropicVerifiedTokens: null,
                anthropicVerifiedCostUsd: null,
                deltaTokens: null,
                driftPercent: null,
                windowStart: startDt.toISOString(),
                windowEnd: endDt.toISOString(),
                cached: false,
                lastCheckedAt: new Date().toISOString(),
            };

            this.cachedReport = { timestamp: now, data: errorReport };
            return errorReport;
        }
    }

    private async getAppTrackedUsage(startDt: Date, endDt: Date): Promise<{ tokens: number; costUsd: number }> {
        try {
            const res = await this.db.execute(sql`
                SELECT 
                    COALESCE(SUM(total_tokens), 0)::bigint as tokens,
                    COALESCE(SUM(estimated_cost_usd), 0)::numeric as cost_usd
                FROM claude_token_usage
                WHERE created_at >= ${startDt.toISOString()} AND created_at <= ${endDt.toISOString()}
            `);

            const row = (res.rows?.[0] as Record<string, unknown>) || {};
            return {
                tokens: Number(row.tokens || 0),
                costUsd: Number(parseFloat(String(row.cost_usd || 0)).toFixed(4)),
            };
        } catch {
            return { tokens: 0, costUsd: 0 };
        }
    }
}
