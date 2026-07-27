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
import { vendors } from "../vendors/vendors.schema";

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
    approvedFinalPrice: numeric("approved_final_price", { precision: 12, scale: 2 }),
    approvedReceiptPreGst: numeric("approved_receipt_pre_gst", { precision: 12, scale: 2 }),
    approvedBudgetPreGst: numeric("approved_budget_pre_gst", { precision: 12, scale: 2 }),
    approvedGrossMargin: numeric("approved_gross_margin", { precision: 5, scale: 2 }),
    oemVendorId: bigint("oem_vendor_id", { mode: "number" }).references(() => vendors.id),
    approvalRemarks: text("approval_remarks"),
    approvedBy: bigint("approved_by", { mode: "number" }).references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    redoReason: text("redo_reason"),
    redoBy: bigint("redo_by", { mode: "number" }).references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type PrivateCostingSheet = typeof privateCostingSheets.$inferSelect;
export type NewPrivateCostingSheet = typeof privateCostingSheets.$inferInsert;
