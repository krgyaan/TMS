import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    integer,
    numeric,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';

export const claudeTokenUsage = pgTable(
    'claude_token_usage',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
        tenderId: bigint('tender_id', { mode: 'number' }),
        jobId: varchar('job_id', { length: 100 }),
        callType: varchar('call_type', { length: 50 }).notNull().default('main_extraction'),
        model: varchar('model', { length: 100 }).notNull().default('claude-haiku-4-5-20251001'),
        inputTokens: integer('input_tokens').notNull().default(0),
        outputTokens: integer('output_tokens').notNull().default(0),
        cacheCreationTokens: integer('cache_creation_tokens').notNull().default(0),
        cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
        totalTokens: integer('total_tokens').notNull().default(0),
        estimatedCostUsd: numeric('estimated_cost_usd', { precision: 10, scale: 6 })
            .notNull()
            .default('0'),
        durationMs: integer('duration_ms'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        createdAtIdx: index('idx_claude_token_usage_created_at').on(table.createdAt),
        userIdIdx: index('idx_claude_token_usage_user_id').on(table.userId),
        tenderIdIdx: index('idx_claude_token_usage_tender_id').on(table.tenderId),
        callTypeIdx: index('idx_claude_token_usage_call_type').on(table.callType),
    }),
);

export type ClaudeTokenUsageRecord = typeof claudeTokenUsage.$inferSelect;
export type NewClaudeTokenUsageRecord = typeof claudeTokenUsage.$inferInsert;
