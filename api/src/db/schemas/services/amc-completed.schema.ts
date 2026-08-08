import { pgTable, bigserial, bigint, date, timestamp, text, varchar, index } from "drizzle-orm/pg-core";

export const amcCompletedServices = pgTable(
    "amc_completed_services",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        amcSiteId: bigint("amc_site_id", { mode: "number" }),
        serviceDueDate: date("service_due_date"),
        serviceCompletedDate: timestamp("service_completed_date", { withTimezone: true }),
        notes: text("notes"),
        status: varchar("status", { length: 50 }).notNull().default("Signed Service reports Received"),
        invoice: varchar("invoice", { length: 255 }),
        paymentReceipt: varchar("payment_receipt", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_completed_services_amc_id_foreign").on(table.amcId),
        index("amc_completed_services_amc_site_id_foreign").on(table.amcSiteId),
    ]
);

export type AmcCompletedService = typeof amcCompletedServices.$inferSelect;
export type NewAmcCompletedService = typeof amcCompletedServices.$inferInsert;