import { pgTable, bigserial, varchar, date, timestamp, bigint } from "drizzle-orm/pg-core";
import { teams } from "../master";

export const pqrDocuments = pgTable("pqr_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    teamId: bigint("team_id", { mode: "number" }).references(() => teams.id),
    projectName: varchar("project_name", { length: 255 }),
    value: varchar("value", { length: 255 }),
    item: varchar("item", { length: 255 }),

    poDate: date("po_date"),
    uploadPo: varchar("po_document", { length: 255 }),

    sapGemPoDate: date("sap_gem_po_date"),
    uploadSapGemPo: varchar("sap_gem_po_document", { length: 255 }),

    completionDate: date("completion_date"),
    uploadCompletion: varchar("completion_document", { length: 255 }),

    performanceCertificate: varchar("performance_certificate", { length: 255 }),
    remarks: varchar("remarks", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});

export type Pqr = typeof pqrDocuments.$inferSelect;
