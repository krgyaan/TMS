import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    integer,
    numeric,
    jsonb,
} from "drizzle-orm/pg-core";
import { tenderInfos } from "./tenders.schema";
import { vendors } from "./vendors.schema";

// RFQs
export const rfqs = pgTable("rfqs", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull().references(() => tenderInfos.id),
    dueDate: timestamp("due_date", { withTimezone: true }),
    docList: text("doc_list"),
    requestedVendor: varchar("requested_vendor", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// RFQ Items
export const rfqItems = pgTable("rfq_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rfqId: bigint("rfq_id", { mode: "number" }).notNull().references(() => rfqs.id),
    requirement: text("requirement").notNull(),
    unit: varchar("unit", { length: 64 }),
    qty: numeric("qty"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Unified RFQ Documents
export const rfqDocuments = pgTable("rfq_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rfqId: bigint("rfq_id", { mode: "number" }).notNull(),
    docType: varchar("doc_type", { length: 50 }).notNull(),
    path: text("path").notNull(),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// RFQ Responses (one per vendor per RFQ)
export const rfqResponses = pgTable("rfq_responses", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rfqId: bigint("rfq_id", { mode: "number" }).notNull().references(() => rfqs.id),
    vendorId: bigint("vendor_id", { mode: "number" }).notNull().references(() => vendors.id),
    receiptDatetime: timestamp("receipt_datetime", { withTimezone: true }).notNull(),
    gstPercentage: numeric("gst_percentage", { precision: 5, scale: 2 }),
    gstType: varchar("gst_type", { length: 50 }),
    deliveryTime: integer("delivery_time"),
    freightType: varchar("freight_type", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Line-level item pricing per version
export const rfqResponseItems = pgTable("rfq_response_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rfqResponseId: bigint("rfq_response_id", { mode: "number" }).notNull().references(() => rfqResponses.id),
    rfqItemId: bigint("item_id", { mode: "number" }).notNull().references(() => rfqItems.id),
    requirement: text("requirement").notNull(),
    unit: varchar("unit", { length: 64 }),
    qty: numeric("qty"),
    unitPrice: numeric("unit_price", { precision: 15, scale: 2 }),
    totalPrice: numeric("total_price", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Documents in responses (optional)
export const rfqResponseDocuments = pgTable("rfq_response_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rfqResponseId: bigint("rfq_response_id", { mode: "number" }).notNull().references(() => rfqResponses.id),
    docType: varchar("doc_type", { length: 50 }).notNull(),
    path: varchar("path", { length: 255 }).notNull(),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type NewRfq = typeof rfqs.$inferInsert;
export type NewRfqItem = typeof rfqItems.$inferInsert;
export type NewRfqDocument = typeof rfqDocuments.$inferInsert;
export type NewRfqResponse = typeof rfqResponses.$inferInsert;
export type NewRfqResponseItem = typeof rfqResponseItems.$inferInsert;
export type NewRfqResponseDocument = typeof rfqResponseDocuments.$inferInsert;
