import { pgTable, serial, bigint, varchar } from "drizzle-orm/pg-core";

export const tenderDocuments = pgTable("tender_documents", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    docType: varchar("doc_type", { length: 50 }),
    docId: varchar("doc_id", { length: 255 }),
    docName: varchar("doc_name", { length: 255 }),
});
