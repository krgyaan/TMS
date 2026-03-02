import { pgTable, bigserial, varchar, date, timestamp, bigint, jsonb } from "drizzle-orm/pg-core";
import { teams } from "../master";

export const pqrDocuments = pgTable("pqr_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    teamId: bigint("team_id", { mode: "number" }).references(() => teams.id),
    projectName: varchar("project_name", { length: 255 }),
    value: varchar("value", { length: 255 }),
    item: varchar("item", { length: 255 }),
    poDate: date("po_date"),
    uploadPo: jsonb('po_document').$type<string[]>(),
    sapGemPoDate: date("sap_gem_po_date"),
    uploadSapGemPo: jsonb('sap_gem_po_document').$type<string[]>(),
    completionDate: date("completion_date"),
    uploadCompletion: jsonb('completion_document').$type<string[]>(),
    performanceCertificate: jsonb('performance_certificate').$type<string[]>(),
    remarks: varchar("remarks", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});

export type Pqr = typeof pqrDocuments.$inferSelect;
