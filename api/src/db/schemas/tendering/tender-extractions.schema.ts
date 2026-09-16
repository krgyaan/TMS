import {
    pgTable, serial, bigint, jsonb, text, varchar, integer, timestamp, index
} from "drizzle-orm/pg-core";

export const tenderExtractions = pgTable("tender_extractions", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull().unique(),
    fields: jsonb("fields").notNull(),
    missingFields: text("missing_fields").array(),
    extractionVersion: varchar("extraction_version", { length: 50 }).default("1.0.0"),
    processingTimeMs: integer("processing_time_ms"),
    userId: bigint("user_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("tender_extractions_tender_id_idx").on(table.tenderId),
]);

export type TenderExtraction = typeof tenderExtractions.$inferSelect;
export type NewTenderExtraction = typeof tenderExtractions.$inferInsert;
