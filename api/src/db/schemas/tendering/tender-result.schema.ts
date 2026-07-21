import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { tenderInfos } from "./tenders.schema";
import { reverseAuctions } from "./reverse-auction.schema";

export const tenderResults = pgTable(
    "tender_results",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // Foreign Key to Tenders
        tenderId: bigint("tender_id", { mode: "number" }).notNull(),

        // Status (synced from RA Dashboard if RA applicable)
        status: varchar("status", { length: 50 }).default("Under Evaluation").notNull(),

        // Link to RA Management (if RA applicable)
        reverseAuctionId: bigint("reverse_auction_id", { mode: "number" }),

        // ============================================
        // Upload Result Fields (for non-RA tenders)
        // ============================================
        technicallyQualified: varchar("technically_qualified", { length: 50 }),
        disqualificationReason: text("disqualification_reason"),

        // Qualified Parties Info
        qualifiedPartiesCount: varchar("qualified_parties_count", { length: 50 }),
        qualifiedPartiesNames: jsonb("qualified_parties_names").$type<string[]>(),

        tenderCancelledScreenshot: text("tender_cancelled_screenshot"),

        raStatus : varchar("ra_status" , {length : 50}),
        tqStatus : varchar("tq_status" , {length : 50}),

        // Timestamps
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    },
    (table) => [
        // Indexes
        index("tender_results_tender_id_idx").on(table.tenderId),
        index("tender_results_status_idx").on(table.status),
        index("tender_results_reverse_auction_id_idx").on(table.reverseAuctionId),
    ]
);

export type TenderResult = typeof tenderResults.$inferSelect;
export type NewTenderResult = typeof tenderResults.$inferInsert;