import { pgTable, serial, varchar, text, bigint, decimal, timestamp, integer } from "drizzle-orm/pg-core";

export const tenderInfos = pgTable("tender_infos", {
    id: serial("id").primaryKey(),
    team: bigint("team", { mode: "number" }).notNull(),
    tenderNo: varchar("tender_no", { length: 255 }).notNull(),
    organization: bigint("organization", { mode: "number" }),
    tenderName: varchar("tender_name", { length: 255 }).notNull(),
    item: bigint("item", { mode: "number" }).notNull(),
    gstValues: decimal("gst_values", { precision: 15, scale: 2 }).notNull().default("0"),
    tenderFees: decimal("tender_fees", { precision: 15, scale: 2 }).notNull().default("0"),
    emd: decimal("emd", { precision: 15, scale: 2 }).notNull().default("0"),
    teamMember: bigint("team_member", { mode: "number" }),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    remarks: varchar("remarks", { length: 200 }),
    status: bigint("status", { mode: "number" }).notNull().default(1),
    location: bigint("location", { mode: "number" }),
    website: bigint("website", { mode: "number" }),
    courierAddress: text("courier_address"),
    deleteStatus: integer("delete_status").default(0).notNull(),
    documents: text("documents"),
    // Tender approval fields
    tlRemarks: varchar("tl_remarks", { length: 200 }),
    rfqTo: varchar("rfq_to", { length: 15 }),
    tlStatus: integer("tl_status").default(0).notNull(),
    processingFeeMode: varchar("processing_fee_mode", { length: 100 }),
    tenderFeeMode: varchar("tender_fee_mode", { length: 100 }),
    emdMode: varchar("emd_mode", { length: 100 }),
    approvePqrSelection: varchar("approve_pqr_selection", { length: 50 }),
    approveFinanceDocSelection: varchar("approve_finance_doc_selection", { length: 50 }),
    tenderApprovalStatus: varchar("tender_approval_status", { length: 50 }),
    tlRejectionRemarks: text("tl_rejection_remarks"),
    oemNotAllowed: varchar("oem_not_allowed", { length: 50 }),

    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});

export type TenderInfo = typeof tenderInfos.$inferSelect;
export type NewTenderInfo = typeof tenderInfos.$inferInsert;
