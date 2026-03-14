import { pgTable, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const projectParties = pgTable("project_parties", {
    id: integer("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    gstNo: varchar("gst_no", { length: 50 }),
    msme: varchar("msme", { length: 50 }),
    pan: varchar("pan", { length: 100 }),
    address: text("address"),
    email: varchar("email", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectParty = typeof projectParties.$inferSelect;
export type NewProjectParty = typeof projectParties.$inferInsert;
