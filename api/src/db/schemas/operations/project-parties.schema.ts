import { pgTable, varchar, text, boolean, timestamp, bigserial, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// project_parties holds ship-to rows only - sellers live in vendor_organizations.
// The CHECK matches the DB migration 0146_project_parties_only_ship_to.sql.
export const projectParties = pgTable(
    "project_parties",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        name: varchar("name", { length: 255 }),
        alias: varchar("alias", { length: 255 }),
        gstNo: varchar("gst_no", { length: 50 }),
        msme: varchar("msme", { length: 50 }),
        pan: varchar("pan", { length: 100 }),
        address: text("address"),
        email: varchar("email", { length: 100 }),
        contactPerson: varchar("contact_person", { length: 255 }),
        mobileNumber: varchar("mobile_number", { length: 20 }),
        type: varchar("type", { length: 20 }).notNull().default("ship_to"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [check("project_parties_type_ship_to_check", sql`${table.type} = 'ship_to'`)]
);

export type ProjectParty = typeof projectParties.$inferSelect;
export type NewProjectParty = typeof projectParties.$inferInsert;
