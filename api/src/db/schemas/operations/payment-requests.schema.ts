import { pgTable, bigserial, bigint, varchar, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const paymentRequests = pgTable(
    "project_payment_requests",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        requestNo: varchar("request_no", { length: 255 }),
        partyName: varchar("party_name", { length: 255 }),
        accountNumber: varchar("account_number", { length: 100 }),
        bankName: varchar("bank_name", { length: 255 }),
        ifsc: varchar("ifsc", { length: 50 }),
        amount: numeric("amount", { precision: 20, scale: 2 }),
        paymentAgainst: varchar("payment_against", { length: 50 }),
        purchaseInvoiceId: bigint("purchase_invoice_id", { mode: "number" }),
        purchaseOrderId: bigint("purchase_order_id", { mode: "number" }),
        uploadedInvoiceFile: varchar("uploaded_invoice_file", { length: 500 }),
        poFile: varchar("po_file", { length: 500 }),
        remark: text("remark"),
        utrNumber: text("utr_number"),
        rejectionReason: text("rejection_reason"),
        status: varchar("status", { length: 50 }).notNull().default("pending"),
        requestedBy: bigint("requested_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ([
        index("idx_pr_request_no").on(table.requestNo),
        index("idx_pr_project_id").on(table.projectId),
        index("idx_pr_status").on(table.status),
    ])
);

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type NewPaymentRequest = typeof paymentRequests.$inferInsert;
