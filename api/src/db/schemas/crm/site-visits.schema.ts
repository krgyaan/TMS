import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { leadEnquiries } from "./lead-enquiries.schema";
import { users } from "../auth/users.schema";

export const siteVisits = pgTable("site_visits", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    enquiryId: bigint("enquiry_id", { mode: "number" }).references(() => leadEnquiries.id, { onDelete: "cascade" }).notNull(),
    assignedTo: bigint("assigned_to", { mode: "number" }).references(() => users.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    conductedAt: timestamp("conducted_at", { withTimezone: true }),
    information: text("information"),
    additionalNotes: text("additional_notes"),
    documents: text("documents"),
    status: varchar("status", { length: 50 }).default("scheduled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SiteVisit = typeof siteVisits.$inferSelect;
export type NewSiteVisit = typeof siteVisits.$inferInsert;
