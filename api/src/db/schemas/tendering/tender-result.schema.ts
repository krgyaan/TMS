import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    decimal,
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
        tenderId: bigint("tender_id", { mode: "number" }).notNull().references(() => tenderInfos.id, { onDelete: "cascade" }),

        // Status (synced from RA Dashboard if RA applicable)
        status: varchar("status", { length: 50 }).default("Under Evaluation").notNull(),

        // Link to RA Management (if RA applicable)
        reverseAuctionId: bigint("reverse_auction_id", { mode: "number" }).references(
            () => reverseAuctions.id,
            { onDelete: "set null" }
        ),

        // ============================================
        // Upload Result Fields (for non-RA tenders)
        // ============================================
        technicallyQualified: varchar("technically_qualified", { length: 50 }),
        disqualificationReason: text("disqualification_reason"),

        // Qualified Parties Info
        qualifiedPartiesCount: varchar("qualified_parties_count", { length: 50 }),
        qualifiedPartiesNames: jsonb("qualified_parties_names").$type<string[]>(),

        // Result
        result: varchar("result", { length: 50 }),

        // Pricing
        l1Price: decimal("l1_price", { precision: 15, scale: 2 }),
        l2Price: decimal("l2_price", { precision: 15, scale: 2 }),
        ourPrice: decimal("our_price", { precision: 15, scale: 2 }),

        // Screenshots
        qualifiedPartiesScreenshot: text("qualified_parties_screenshot"),
        finalResultScreenshot: text("final_result_screenshot"),

        // When result was uploaded
        resultUploadedAt: timestamp("result_uploaded_at", { withTimezone: true }),

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
