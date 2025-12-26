import { pgTable, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { followUps } from "./follow-ups.schema";

export const followUpPersons = pgTable(
    "follow_up_persons",
    {
        id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(), // MySQL ID preserved

        followUpId: bigint("follow_up_id", { mode: "number" }).notNull(),

        name: varchar("name", { length: 255 }),
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
        followUpIdx: index("idx_follow_up_persons_follow_up").on(table.followUpId),
        emailIdx: index("idx_follow_up_persons_email").on(table.email),
        phoneIdx: index("idx_follow_up_persons_phone").on(table.phone),
    })
);

export type FollowUpPersons = typeof followUpPersons.$inferSelect;
export type NewFollowUpPersons = typeof followUpPersons.$inferInsert;
