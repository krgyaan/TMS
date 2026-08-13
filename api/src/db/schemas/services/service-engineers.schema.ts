import { pgTable, bigserial, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const serviceEngineers = pgTable(
    "service_engineers",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        complaintId: bigint("complaint_id", { mode: "number" }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        phone: varchar("phone", { length: 20 }).notNull(),
        email: varchar("email", { length: 255 }).notNull(),
        allotedBy: bigint("alloted_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("fk_customer_service_engineers_complaint").on(table.complaintId),
    ],
);

export type ServiceEngineer = typeof serviceEngineers.$inferSelect;
export type NewServiceEngineer = typeof serviceEngineers.$inferInsert;
