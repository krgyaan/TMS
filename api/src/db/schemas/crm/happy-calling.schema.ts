import { pgTable, bigserial, bigint, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const happyCalling = pgTable(
    "happy_calling",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        cDId: bigint("c_d_id", { mode: "number" }),

        organization: varchar("organization", { length: 255 }),
        name: varchar("name", { length: 255 }).notNull(),
        designation: varchar("designation", { length: 255 }),
        email: varchar("email", { length: 255 }),
        phone: varchar("phone", { length: 200 }),

        status: varchar("status", { length: 50 }),
        broadcast: integer("broadcast").notNull().default(0),
        details: text("details"),
        createdBy: bigint("created_by", { mode: "number" }),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    table => ({
        nameIdx: index("idx_happy_calling_name").on(table.name),
        orgIdx: index("idx_happy_calling_org").on(table.organization),
    })
);

// Type exports
export type HappyCalling = typeof happyCalling.$inferSelect;
export type NewHappyCalling = typeof happyCalling.$inferInsert;