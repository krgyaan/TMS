import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    boolean,
} from "drizzle-orm/pg-core";
import { leads } from "./leads.schema";
import { happyCalling } from "./happy-calling.schema";
import { tenderInfos } from "../tendering/tenders.schema";

export const leadEnquiries = pgTable("lead_enquiries", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    leadId: bigint("lead_id", { mode: "number" }).references(() => leads.id, { onDelete: "set null" }),
    happyCallingId: bigint("happy_calling_id", { mode: "number" }).references(() => happyCalling.id, { onDelete: "set null" }),
    tenderId: bigint("tender_id", { mode: "number" }).references(() => tenderInfos.id),
    team: varchar("team", { length: 29 }),
    enqName: varchar("enq_name", { length: 255 }).notNull(),
    organisationId: bigint("organisation_id", { mode: "number" }),
    itemId: bigint("item_id", { mode: "number" }).notNull(),
    locationCode: varchar("location_code", { length: 255 }).notNull(),
    approxValue: varchar("approx_value", { length: 255 }).notNull(),
    siteVisitRequired: boolean("site_visit_required").default(false).notNull(),
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    updatedBy: bigint("updated_by", { mode: "number" }),
    orgAbbName: varchar("org_abb_name", { length: 50 }),
    enquiryFile: text("enquiry_file"),
    enquiryPhotos: text("enquiry_photos"),
    organizationName: varchar("organization_name", { length: 255 }),
    enquiryNumber: varchar("enquiry_number", { length: 255 }),
    rejectionReason: varchar("rejection_reason", { length: 255 }),
    status: varchar("status", { length: 50 }),
    enquiryType: varchar("enquiry_type", { length: 50 }),
    costingDocument: varchar("costing_document", { length: 500 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LeadEnquiry = typeof leadEnquiries.$inferSelect;
export type NewLeadEnquiry = typeof leadEnquiries.$inferInsert;
