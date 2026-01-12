import { pgTable, bigint, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const timer = pgTable("timer", {
    // ID (NO primary key yet, NO default sequence yet)
    id: bigint("id", { mode: "number" }).notNull(),

    // renamed from tender_id
    entityId: integer("entity_id").notNull(),

    userId: bigint("user_id", { mode: "number" }).notNull(),

    timerName: varchar("timer_name", { length: 255 }).notNull(),

    // timestamps
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    pauseTime: timestamp("pause_time"),

    // numeric fields
    durationHours: integer("duration_hours").notNull().default(0),
    remainingTime: integer("remaining_time").notNull().default(0),

    // status (varchar, NOT enum)
    status: varchar("status", { length: 50 }).notNull().default("running"),

    // audit timestamps
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});
