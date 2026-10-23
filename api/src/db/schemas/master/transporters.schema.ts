import { bigserial, boolean, pgTable, timestamp, varchar, text } from "drizzle-orm/pg-core";

export const transporters = pgTable("transporters", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    gstNo: varchar("gst_no", { length: 15 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    status: boolean("status").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transporter = typeof transporters.$inferSelect;
export type NewTransporter = typeof transporters.$inferInsert;
