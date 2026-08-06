import { pgTable, bigserial, bigint, boolean, text, integer, varchar, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { leadEnquiries } from "./lead-enquiries.schema";

export const enquiryResults = pgTable("enquiry_results", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    enquiryId: bigint("enquiry_id", { mode: "number" })
        .references(() => leadEnquiries.id, { onDelete: "cascade" })
        .notNull(),
    technicallyQualified: boolean("technically_qualified"),
    disqualificationReason: text("disqualification_reason"),
    qualifiedCount: integer("qualified_count"),
    qualifiedParties: jsonb("qualified_parties"),
    result: varchar("result", { length: 10 }),
    l1Price: numeric("l1_price", { precision: 15, scale: 2 }),
    l2Price: numeric("l2_price", { precision: 15, scale: 2 }),
    ourPrice: numeric("our_price", { precision: 15, scale: 2 }),
    uploadScreenshot: text("upload_screenshot"),
    uploadDocuments: text("upload_documents"),
    status: varchar("status", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type EnquiryResult = typeof enquiryResults.$inferSelect;
export type NewEnquiryResult = typeof enquiryResults.$inferInsert;
