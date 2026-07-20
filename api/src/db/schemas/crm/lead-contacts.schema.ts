import {
    pgTable,
    bigint,
    varchar,
    boolean,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { leads } from "./leads.schema";
import { leadFollowups } from "./lead-followups.schema";

export const contactSourceEnum = pgEnum('contact_source', [
    'call_followup',
    'visit_followup',
]);

export const leadContacts = pgTable("lead_contacts", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

    leadId: bigint("lead_id", { mode: "number" })
        .notNull()
        .references(() => leads.id, { onDelete: "cascade" }),

    // ✅ Links contact to a specific follow-up
    followupId: bigint("followup_id", { mode: "number" })
        .references(() => leadFollowups.id, { onDelete: "set null" }),

    name: varchar("name", { length: 255 }).notNull(),
    designation: varchar("designation", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),

    // Which follow-up type added this contact
    source: contactSourceEnum("source").notNull(),

    // Optional: mark one contact as primary for the lead
    isPrimary: boolean("is_primary").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export type LeadContact = typeof leadContacts.$inferSelect;
export type NewLeadContact = typeof leadContacts.$inferInsert;