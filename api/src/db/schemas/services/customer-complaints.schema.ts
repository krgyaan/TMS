import { pgTable, bigserial, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const customerComplaints = pgTable(
    "customer_complaints",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        organization: varchar("organization", { length: 255 }),
        designation: varchar("designation", { length: 255 }),
        phone: varchar("phone", { length: 20 }).notNull(),
        email: varchar("email", { length: 255 }).notNull(),
        siteProjectName: varchar("site_project_name", { length: 255 }).notNull(),
        poNo: varchar("po_no", { length: 100 }),
        siteLocation: varchar("site_location", { length: 255 }).notNull(),
        attachment: varchar("attachment", { length: 255 }),
        issueFaced: text("issue_faced"),
        status: varchar("status", { length: 50 }).default("Pending"),
        ticketNo: varchar("ticket_no", { length: 50 }),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("customer_complaints_created_by_foreign").on(table.createdBy),
    ],
);

export type CustomerComplaint = typeof customerComplaints.$inferSelect;
export type NewCustomerComplaint = typeof customerComplaints.$inferInsert;
