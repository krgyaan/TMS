import { pgTable, bigserial, bigint, varchar, timestamp, index, pgEnum } from "drizzle-orm/pg-core";

export const serviceEngineerStatusEnum = pgEnum("service_engineer_status", ["0", "1"]);

export const serviceEngineers = pgTable(
    "service_engineers",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        complaintId: bigint("complaint_id", { mode: "number" }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        phone: varchar("phone", { length: 20 }).notNull(),
        email: varchar("email", { length: 255 }).notNull(),
        status: serviceEngineerStatusEnum("status").default("1"),
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
