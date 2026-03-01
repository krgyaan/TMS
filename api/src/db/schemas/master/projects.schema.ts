import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
    date,
    integer,
    uniqueIndex,
    index
} from "drizzle-orm/pg-core";

export const projects = pgTable(
    "projects",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        teamName: varchar("team_name", { length: 255 }).notNull(),

        organisationId: bigint("organisation_id", { mode: "number" }),
        itemId: bigint("item_id", { mode: "number" }).notNull(),
        locationId: bigint("location_id", { mode: "number" }),

        poNo: varchar("po_no", { length: 255 }),
        projectCode: varchar("project_code", { length: 255 }),
        projectName: varchar("project_name", { length: 255 }),

        poDocument: varchar("po_document", { length: 255 }),
        poDate: date("po_date"),

        performanceCertificate: varchar("performance_certificate", { length: 2000 }),
        performanceDate: date("performance_date"),

        completionDocument: varchar("completion_document", { length: 2000 }),
        completionDate: date("completion_date"),

        createdAt: timestamp("created_at"),
        updatedAt: timestamp("updated_at"),

        sapPoDate: date("sap_po_date"),
        sapPoNo: varchar("sap_po_no", { length: 255 }),

        tenderId: integer("tender_id"),
        enquiryId: bigint("enquiry_id", { mode: "number" }),
    },
    (table) => ({
        projectCodeUnique: uniqueIndex("projects_project_code_unique").on(
            table.projectCode
        ),

        orgIdx: index("idx_projects_organisation_id").on(table.organisationId),
        itemIdx: index("idx_projects_item_id").on(table.itemId),
        locationIdx: index("idx_projects_location_id").on(table.locationId),
    })
);
