import { jsonb } from "drizzle-orm/pg-core";
import { pgTable, bigserial, bigint, varchar, timestamp, date, integer, index } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    teamName: varchar("team_name", { length: 255 }).notNull(),
    organisationId: bigint("org_id", { mode: "number" }),
    itemId: bigint("item_id", { mode: "number" }).notNull(),
    locationId: bigint("location_id", { mode: "number" }),
    poNo: varchar("po_no", { length: 255 }),
    projectCode: varchar("project_code", { length: 255 }),
    projectName: varchar("project_name", { length: 255 }),
    poUpload: jsonb("po_upload").$type<string[]>(),
    poDate: date("po_date"),
    performanceProof: jsonb("performance_proof").$type<string[]>(),
    performanceDate: date("performance_date"),
    completionProof: jsonb("completion_proof").$type<string[]>(),
    completionDate: date("completion_date"),
    sapPoDate: date("sap_po_date"),
    sapPoNo: varchar("sap_po_no", { length: 255 }),
    tenderId: integer("tender_id"),
    enquiryId: bigint("enquiry_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ([
    index("idx_projects_org_id").on(table.organisationId),
    index("idx_projects_item_id").on(table.itemId),
    index("idx_projects_location_id").on(table.locationId),
  ])
);
