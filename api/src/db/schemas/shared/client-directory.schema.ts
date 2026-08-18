import { pgTable, bigserial, varchar, timestamp, index, unique, jsonb } from "drizzle-orm/pg-core";

export const clientDirectory = pgTable(
    "client_directory",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        name: varchar("name", { length: 255 }).notNull(),
        designation: varchar("designation", { length: 255 }),
        address: jsonb("address").$type<{ personal?: string | null; official?: string | null }>(),
        email: varchar("email", { length: 255 }),
        phone: varchar("phone", { length: 200 }),
        organization: varchar("organization", { length: 255 }),
        giftingTier: varchar("gifting_tier", { length: 10 }),
        remarks: jsonb("remarks").$type<{ text: string; by: string; byId: number; at: string }[]>(),

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
