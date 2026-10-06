import {
    pgTable,
    serial,
    integer,
    varchar,
    text,
    jsonb,
    timestamp,
    uniqueIndex,
    index,
    bigint,
} from "drizzle-orm/pg-core";

export const biddingRequirementsJobs = pgTable(
    "bidding_requirements_jobs",
    {
        id: serial("id").primaryKey(),
        tenderId: integer("tender_id").notNull(),
        documentHash: varchar("document_hash", { length: 64 }).notNull(),
        status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'running' | 'done' | 'failed'
        result: jsonb("result").$type<Record<string, any> | null>(),
        errorCode: varchar("error_code", { length: 50 }),
        errorMessage: text("error_message"),
        userId: bigint("user_id", { mode: "number" }),
        processingTimeMs: integer("processing_time_ms"),
        startedAt: timestamp("started_at", { withTimezone: true }),
        heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("bidding_requirements_jobs_tender_hash_uidx").on(
            table.tenderId,
            table.documentHash,
        ),
        index("bidding_requirements_jobs_tender_id_idx").on(table.tenderId),
    ],
);

export type BiddingRequirementsJob = typeof biddingRequirementsJobs.$inferSelect;
export type NewBiddingRequirementsJob = typeof biddingRequirementsJobs.$inferInsert;
