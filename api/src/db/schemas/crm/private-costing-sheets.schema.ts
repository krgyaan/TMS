import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    numeric,
    timestamp,
} from "drizzle-orm/pg-core";
import { leadEnquiries } from "./lead-enquiries.schema";
import { users } from "../auth/users.schema";

export const privateCostingSheets = pgTable("private_costing_sheets", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    enquiryId: bigint("enquiry_id", { mode: "number" }).references(() => leadEnquiries.id, { onDelete: "cascade" }).notNull(),
    title: text("title"),
    sheetUrl: text("sheet_url"),
    preparedBy: bigint("prepared_by", { mode: "number" }).references(() => users.id).notNull(),
    status: varchar("status", { length: 255 }),
    finalPrice: numeric("final_price", { precision: 12, scale: 2 }),
    receiptPreGst: numeric("receipt_pre_gst", { precision: 12, scale: 2 }),
    budgetPreGst: numeric("budget_pre_gst", { precision: 12, scale: 2 }),
    grossMargin: numeric("gross_margin", { precision: 5, scale: 2 }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type PrivateCostingSheet = typeof privateCostingSheets.$inferSelect;
export type NewPrivateCostingSheet = typeof privateCostingSheets.$inferInsert;
