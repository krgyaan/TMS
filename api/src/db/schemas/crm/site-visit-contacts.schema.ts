import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
} from "drizzle-orm/pg-core";
import { siteVisits } from "./site-visits.schema";

export const siteVisitContacts = pgTable("site_visit_contacts", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteVisitId: bigint("site_visit_id", { mode: "number" }).references(() => siteVisits.id, { onDelete: "cascade" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    designation: varchar("designation", { length: 255 }),
    phone: varchar("phone", { length: 255 }),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SiteVisitContact = typeof siteVisitContacts.$inferSelect;
export type NewSiteVisitContact = typeof siteVisitContacts.$inferInsert;
