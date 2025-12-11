import { pgTable, bigserial, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";

export const clientDirectory = pgTable(
    "client_directory",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        name: varchar("name", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }),
        phone: varchar("phone", { length: 20 }),
        organization: varchar("organization", { length: 255 }),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    table => ({
        // Unique constraints
        uniqueEmail: unique("unique_client_email").on(table.email),
        uniquePhone: unique("unique_client_phone").on(table.phone),

        // Indexes for searching
        nameIdx: index("idx_client_directory_name").on(table.name),
        orgIdx: index("idx_client_directory_org").on(table.organization),
        emailIdx: index("idx_client_directory_email").on(table.email),
        phoneIdx: index("idx_client_directory_phone").on(table.phone),
    })
);

// Type exports
export type ClientDirectory = typeof clientDirectory.$inferSelect;
export type NewClientDirectory = typeof clientDirectory.$inferInsert;
