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

export const reverseAuctions = pgTable(
    "reverse_auctions",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // Foreign Key to Tenders
        tenderId: bigint("tender_id", { mode: "number" })
            .notNull()
            .references(() => tenderInfos.id, { onDelete: "cascade" }),

        // Denormalized for quick access (from tender)
        tenderNo: varchar("tender_no", { length: 255 }).notNull(),

        // From Bid Submission Form
        bidSubmissionDate: timestamp("bid_submission_date", { mode: "date" }),

        // Status
        status: varchar("status", { length: 50 }).default("Under Evaluation").notNull(),

        // ============================================
        // Schedule RA Fields
        // ============================================
        technicallyQualified: varchar("technically_qualified", { length: 50 }),
        disqualificationReason: text("disqualification_reason"),

        // Qualified Parties Info
        qualifiedPartiesCount: varchar("qualified_parties_count", { length: 50 }), // Can be "not known"
        qualifiedPartiesNames: jsonb("qualified_parties_names").$type<string[]>(), // Array of names

        // RA Schedule Times
        raStartTime: timestamp("ra_start_time", { withTimezone: true }),
        raEndTime: timestamp("ra_end_time", { withTimezone: true }),

        // When RA was scheduled
        scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

        // ============================================
        // Upload RA Result Fields
        // ============================================
        raResult: varchar("ra_result", { length: 50 }),
        veL1AtStart: varchar("ve_l1_at_start", { length: 50 }),

        // Pricing
        raStartPrice: decimal("ra_start_price", { precision: 15, scale: 2 }),
        raClosePrice: decimal("ra_close_price", { precision: 15, scale: 2 }),
        raCloseTime: timestamp("ra_close_time", { withTimezone: true }),

        // Screenshots (file paths or URLs)
        screenshotQualifiedParties: text("screenshot_qualified_parties"),
        screenshotDecrements: text("screenshot_decrements"),
        finalResultScreenshot: text("final_result_screenshot"),

        // When result was uploaded
        resultUploadedAt: timestamp("result_uploaded_at", { withTimezone: true }),

        // Timestamps
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    },
    (table) => [
        // Indexes
        index("reverse_auctions_tender_id_idx").on(table.tenderId),
        index("reverse_auctions_status_idx").on(table.status),
        index("reverse_auctions_tender_no_idx").on(table.tenderNo),
    ]
);

export type ReverseAuction = typeof reverseAuctions.$inferSelect;
export type NewReverseAuction = typeof reverseAuctions.$inferInsert;
