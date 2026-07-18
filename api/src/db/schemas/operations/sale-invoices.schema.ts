import { bigint, bigserial, date, integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const saleInvoices = pgTable("sale_invoices", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    projectId: bigint("project_id", { mode: "number" }).notNull(),
    tenderId: bigint("tender_id", { mode: "number" }),
    woDetailId: bigint("wo_detail_id", { mode: "number" }),

    invoiceNumber: varchar("invoice_number", { length: 255 }),
    invoiceDate: date("invoice_date"),

    billingCustomerName: varchar("billing_customer_name", { length: 255 }),
    billingAddress: text("billing_address"),
    billingGst: varchar("billing_gst", { length: 15 }),

    shippingCustomerName: varchar("shipping_customer_name", { length: 255 }),
    shippingAddress: text("shipping_address"),
    shippingGst: varchar("shipping_gst", { length: 15 }),

    totalPreGst: numeric("total_pre_gst", { precision: 20, scale: 2 }),
    totalGst: numeric("total_gst", { precision: 20, scale: 2 }),
    grandTotal: numeric("grand_total", { precision: 20, scale: 2 }),

    invoiceTaxableAmount: numeric("invoice_taxable_amount", { precision: 20, scale: 2 }),
    invoiceIgst: numeric("invoice_igst", { precision: 14, scale: 2 }),
    invoiceCgst: numeric("invoice_cgst", { precision: 14, scale: 2 }),
    invoiceSgst: numeric("invoice_sgst", { precision: 14, scale: 2 }),
    invoiceTotal: numeric("invoice_total", { precision: 20, scale: 2 }),
    invoiceDocPaths: jsonb("invoice_doc_paths").$type<string[]>().default([]),

    cnTaxable: numeric("cn_taxable", { precision: 20, scale: 2 }),
    cnIgst: numeric("cn_igst", { precision: 14, scale: 2 }),
    cnCgst: numeric("cn_cgst", { precision: 14, scale: 2 }),
    cnSgst: numeric("cn_sgst", { precision: 14, scale: 2 }),
    cnTotal: numeric("cn_total", { precision: 20, scale: 2 }),
    creditNoteDocPaths: jsonb("credit_note_doc_paths").$type<string[]>().default([]),

    paymentAdviceDocPaths: jsonb("payment_advice_doc_paths").$type<string[]>().default([]),
    paymentAdviceRequestedAt: timestamp("payment_advice_requested_at", { withTimezone: true }),
    paymentAdviceReceivedAt: timestamp("payment_advice_received_at", { withTimezone: true }),
    buybackInvoiceDocPaths: jsonb("buyback_invoice_doc_paths").$type<string[]>().default([]),
    gstTds: numeric("gst_tds", { precision: 14, scale: 2 }),
    itTds: numeric("it_tds", { precision: 14, scale: 2 }),
    ldDeduction: numeric("ld_deduction", { precision: 14, scale: 2 }),
    otherDeduction: numeric("other_deduction", { precision: 14, scale: 2 }),
    netReceived: numeric("net_received", { precision: 20, scale: 2 }),

    holdGstIgst: numeric("hold_gst_igst", { precision: 14, scale: 2 }),
    holdGstCgst: numeric("hold_gst_cgst", { precision: 14, scale: 2 }),
    holdGstSgst: numeric("hold_gst_sgst", { precision: 14, scale: 2 }),
    holdItc: numeric("hold_itc", { precision: 14, scale: 2 }),
    holdRetention: numeric("hold_retention", { precision: 14, scale: 2 }),
    holdBuyback: numeric("hold_buyback", { precision: 14, scale: 2 }),
    holdOther: numeric("hold_other", { precision: 14, scale: 2 }),
    totalHoldAmount: numeric("total_hold_amount", { precision: 20, scale: 2 }),

    holdReleasedAmount: numeric("hold_released_amount", { precision: 20, scale: 2 }),
    holdReleasedAt: timestamp("hold_released_at", { withTimezone: true }),

    status: varchar("status", { length: 50 }).default("oe_request"),

    raisedBy: bigint("raised_by", { mode: "number" }),
    team: bigint("team", { mode: "number" }),
    remarks: text("remarks"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleInvoiceItems = pgTable("sale_invoice_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    saleInvoiceId: bigint("sale_invoice_id", { mode: "number" }).notNull()
        .references(() => saleInvoices.id, { onDelete: "cascade" }),

    srNo: integer("sr_no"),
    itemDescription: text("item_description"),
    quantity: numeric("quantity", { precision: 20, scale: 2 }),
    rate: numeric("rate", { precision: 20, scale: 2 }),
    amount: numeric("amount", { precision: 20, scale: 2 }),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }),
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SaleInvoice = typeof saleInvoices.$inferSelect;
export type NewSaleInvoice = typeof saleInvoices.$inferInsert;
export type SaleInvoiceItem = typeof saleInvoiceItems.$inferSelect;
export type NewSaleInvoiceItem = typeof saleInvoiceItems.$inferInsert;
