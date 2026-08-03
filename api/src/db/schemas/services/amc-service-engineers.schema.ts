import { pgTable, bigserial, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const amcServiceEngineers = pgTable(
    "amc_service_engineers",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        organization: varchar("organization", { length: 255 }),
        mobile: varchar("mobile", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_service_engineers_amc_id_foreign").on(table.amcId),
    ]
);

export type AmcServiceEngineer = typeof amcServiceEngineers.$inferSelect;
export type NewAmcServiceEngineer = typeof amcServiceEngineers.$inferInsert;