import { jsonb } from "drizzle-orm/pg-core";
import { bigint } from "drizzle-orm/pg-core";
import { pgTable, bigserial, varchar, timestamp } from "drizzle-orm/pg-core";


export const financeDocuments = pgTable("finance_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    documentName: varchar("document_name", { length: 255 }),
    documentType: bigint("document_type", { mode: "number" }),
    financialYear: bigint("financial_year", { mode: "number" }),
    documentPath: jsonb('document_path').$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});
