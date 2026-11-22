import { sql } from "drizzle-orm";
import { bigint, bigserial, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";

export const tallySyncLedger = pgTable(
    "tally_sync_ledger",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        company: varchar("company", { length: 255 }).notNull(),
        entityType: varchar("entity_type", { length: 50 }).notNull(),
        entityId: varchar("entity_id", { length: 100 }).notNull(),

        sourceFingerprint: varchar("source_fingerprint", { length: 64 }).notNull(),
        amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),

        status: varchar("status", { length: 20 }).notNull().default("pending"),

        tallyVoucherNumber: varchar("tally_voucher_number", { length: 255 }),
        tallyVoucherGuid: varchar("tally_voucher_guid", { length: 100 }),

        attempts: integer("attempts").notNull().default(0),
        lastErrorCode: varchar("last_error_code", { length: 50 }),
        postedAt: timestamp("posted_at", { withTimezone: true }),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [uniqueIndex("uq_tally_sync_ledger_entity").on(table.company, table.entityType, table.entityId), index("idx_tally_sync_ledger_status").on(table.status)]
);

export const tallySyncJobs = pgTable(
    "tally_sync_jobs",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        company: varchar("company", { length: 255 }).notNull(),
        operation: varchar("operation", { length: 50 }).notNull(),
        entityType: varchar("entity_type", { length: 50 }).notNull(),
        entityId: varchar("entity_id", { length: 100 }).notNull(),

        payload: jsonb("payload").notNull().default({}),

        status: varchar("status", { length: 20 }).notNull().default("queued"),
        priority: integer("priority").notNull().default(0),
        attempts: integer("attempts").notNull().default(0),
        maxAttempts: integer("max_attempts").notNull().default(3),
        runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),

        lockedAt: timestamp("locked_at", { withTimezone: true }),
        lockedBy: varchar("locked_by", { length: 255 }),

        dependsOnJobId: bigint("depends_on_job_id", { mode: "number" }).references((): AnyPgColumn => tallySyncJobs.id, {
            onDelete: "set null",
        }),

        lastErrorCode: varchar("last_error_code", { length: 50 }),
        lastErrorMessage: text("last_error_message"),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_tally_sync_jobs_due").on(table.status, table.runAfter),
        index("idx_tally_sync_jobs_company").on(table.company, table.status),
        uniqueIndex("uq_tally_sync_jobs_active")
            .on(table.company, table.operation, table.entityType, table.entityId)
            .where(sql`${table.status} IN ('queued', 'running')`),
    ]
);

export type TallySyncLedger = typeof tallySyncLedger.$inferSelect;
export type NewTallySyncLedger = typeof tallySyncLedger.$inferInsert;

export type TallySyncJob = typeof tallySyncJobs.$inferSelect;
export type NewTallySyncJob = typeof tallySyncJobs.$inferInsert;

export const TALLY_SYNC_LEDGER_STATUSES = ["pending", "posted", "failed", "unknown_outcome"] as const;
export type TallySyncLedgerStatus = (typeof TALLY_SYNC_LEDGER_STATUSES)[number];

export const TALLY_SYNC_JOB_OPERATIONS = ["ensure_master", "post_voucher", "verify"] as const;
export type TallySyncJobOperation = (typeof TALLY_SYNC_JOB_OPERATIONS)[number];

export const TALLY_SYNC_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "dead"] as const;
export type TallySyncJobStatus = (typeof TALLY_SYNC_JOB_STATUSES)[number];
