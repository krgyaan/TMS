import { pgTable, varchar, text, boolean, timestamp, bigserial, bigint } from "drizzle-orm/pg-core";

export const projectParties = pgTable("project_parties", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vendorOrganizationId: bigint("vendor_organization_id", { mode: "number" }),
    name: varchar("name", { length: 255 }),
    alias: varchar("alias", { length: 255 }),
    gstNo: varchar("gst_no", { length: 50 }),
    msme: varchar("msme", { length: 50 }),
    pan: varchar("pan", { length: 100 }),
    address: text("address"),
    email: varchar("email", { length: 100 }),
    contactPerson: varchar("contact_person", { length: 255 }),
    mobileNumber: varchar("mobile_number", { length: 20 }),
    type: varchar("type", { length: 20 }).notNull().default("seller"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectParty = typeof projectParties.$inferSelect;
export type NewProjectParty = typeof projectParties.$inferInsert;
