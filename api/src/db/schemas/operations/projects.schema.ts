import { pgTable, bigint, integer, varchar, timestamp, date } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    teamName: varchar("team_name", { length: 255 }).notNull(),
    orgId: bigint("org_id", { mode: "number" }),
    itemId: bigint("item_id", { mode: "number" }).notNull(),
    locationId: bigint("location_id", { mode: "number" }),
    poNo: varchar("po_no", { length: 255 }),
    projectCode: varchar("project_code", { length: 255 }),
    projectName: varchar("project_name", { length: 255 }),
    poUpload: varchar("po_upload", { length: 255 }),
    poDate: date("po_date"),
    performanceProof: varchar("performance_proof", { length: 2000 }),
    performanceDate: date("performance_date"),
    completionProof: varchar("completion_proof", { length: 2000 }),
    completionDate: date("completion_date"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    sapPoDate: date("sap_po_date"),
    sapPoNo: varchar("sap_po_no", { length: 255 }),
    tenderId: integer("tender_id"),
    enquiryId: bigint("enquiry_id", { mode: "number" }),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
