import { pgTable, bigserial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const financeDocTypes = pgTable("finance_doc_types", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    documentType: varchar("document_type", { length: 255 }).notNull(),

    status: boolean("status").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});
