import { pgTable, bigserial, bigint, integer, date, timestamp, varchar, index } from "drizzle-orm/pg-core";

export const amcServices = pgTable(
    "amc_services",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        amcSiteId: bigint("amc_site_id", { mode: "number" }).notNull(),
        billId: bigint("bill_id", { mode: "number" }),
        serviceNo: integer("service_no").notNull(),
        serviceDueDate: date("service_due_date").notNull(),
        status: varchar("status", { length: 50 }).notNull().default("Pending"),
        serviceCompletedDate: timestamp("service_completed_date", { withTimezone: true }),
        filledReport: varchar("filled_report", { length: 255 }),
        signedReport: varchar("signed_report", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_services_amc_id_foreign").on(table.amcId),
        index("amc_services_amc_site_id_foreign").on(table.amcSiteId),
        index("amc_services_bill_id_foreign").on(table.billId),
    ]
);

export type AmcService = typeof amcServices.$inferSelect;
export type NewAmcService = typeof amcServices.$inferInsert;
