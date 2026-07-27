import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    integer,
} from "drizzle-orm/pg-core";
import { leadEnquiries } from "./lead-enquiries.schema";

export const privateQuotes = pgTable("private_quotes", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    enquiryId: bigint("enquiry_id", { mode: "number" }).references(() => leadEnquiries.id, { onDelete: "cascade" }).notNull(),
    quoteSubmissionDatetime: timestamp("quote_submission_datetime", { withTimezone: true }),
    submittedDocuments: text("submitted_documents"),
    contacts: varchar("contacts", { length: 255 }),
    missedReason: varchar("missed_reason", { length: 255 }),
    oemName: varchar("oem_name", { length: 255 }),
    preventRepeat: integer("prevent_repeat").default(0),
    tmsImprovement: text("tms_improvement"),
    status: varchar("status", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PrivateQuote = typeof privateQuotes.$inferSelect;
export type NewPrivateQuote = typeof privateQuotes.$inferInsert;
