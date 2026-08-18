import { pgTable, pgEnum, bigserial, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

export const happyCallingStatusEnum = pgEnum("happy_calling_status", ["pending", "done"]);

export const happyCalling = pgTable(
    "happy_calling",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        organization: varchar("organization", { length: 255 }),
        name: varchar("name", { length: 255 }).notNull(),
        designation: varchar("designation", { length: 255 }),
        email: varchar("email", { length: 255 }),
        phone: varchar("phone", { length: 200 }),

        date: timestamp("date", { withTimezone: true }),
        status: happyCallingStatusEnum("status"),
        nextFollowupDate: timestamp("next_followup_date", { withTimezone: true }),
        broadcast: integer("broadcast").notNull().default(0),

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