import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    date,
    numeric,
    jsonb,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";

export const amcBillTypeEnum = pgEnum("amc_bill_type", ["constant", "variable"]);

export const amcs = pgTable(
    "amc",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        teamName: varchar("team_name", { length: 255 }).notNull(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        createdBy: bigint("created_by", { mode: "number" }),
        serviceFrequency: varchar("service_frequency", { length: 255 }).notNull(),
        amcStartDate: date("amc_start_date").notNull(),
        nextServiceDue: date("next_service_due").notNull().default("2025-06-30"),
        amcEndDate: date("amc_end_date").notNull(),
        billFrequency: varchar("bill_frequency", { length: 255 }).notNull(),
        billType: amcBillTypeEnum("bill_type").notNull().default("constant"),
        billValue: numeric("bill_value", { precision: 10, scale: 2 }),
        variableBills: jsonb("variable_bills"),
        amcPoPath: varchar("amc_po_path", { length: 255 }),
        serviceReportPath: varchar("service_report_path", { length: 255 }),
        signedServiceReportPath: varchar("signed_service_report_path", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    table => [
        index("amcs_project_id_foreign").on(table.projectId),
    ]
);

export type Amc = typeof amcs.$inferSelect;
export type NewAmc = typeof amcs.$inferInsert;