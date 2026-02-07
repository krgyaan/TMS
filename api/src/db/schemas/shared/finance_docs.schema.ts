import { pgTable, bigserial, varchar, timestamp } from "drizzle-orm/pg-core";


export const financeDocuments = pgTable("finance_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    documentName: varchar("document_name", { length: 255 }),
    documentType: varchar("document_type", { length: 255 }),
    financialYear: varchar("financial_year", { length: 255 }),
    documentPath: varchar("document_path", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});
