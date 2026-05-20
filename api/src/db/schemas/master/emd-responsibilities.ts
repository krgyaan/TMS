import { pgTable, bigserial, varchar, bigint, timestamp } from "drizzle-orm/pg-core";
import { users } from "../auth";

export const emdResponsibility = pgTable("emd-responsibilities", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    instrumentType: varchar("instrument_type", { length: 30 }),
    assignedUserId: bigint('assigned_user_id', { mode: 'number' }).references(() => users.id),
    createdAt: timestamp({ mode: "date" }).defaultNow(),
    updatedAt: timestamp({ mode: "date" }).defaultNow()
});

export type EmdResponsibility = typeof emdResponsibility.$inferSelect;
export type NewEmdResponsibility = typeof emdResponsibility.$inferInsert;
