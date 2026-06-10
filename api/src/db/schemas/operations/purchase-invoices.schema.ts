import { pgTable, bigserial, bigint, varchar, text, numeric, date, timestamp, index } from "drizzle-orm/pg-core";

export const purchaseInvoices = pgTable(
    "project_purchase_invoices",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        invoiceNo: varchar("invoice_no", { length: 255 }),
        category: varchar("category", { length: 100 }),
        partyName: varchar("party_name", { length: 255 }),
        valuePreGst: numeric("value_pre_gst", { precision: 20, scale: 2 }),
        gstAmount: numeric("gst_amount", { precision: 20, scale: 2 }),
        invoiceDate: date("invoice_date"),
        uploadedBy: bigint("uploaded_by", { mode: "number" }),
        invoiceFile: varchar("invoice_file", { length: 500 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ([
        index("idx_pi_invoice_no").on(table.invoiceNo),
        index("idx_pi_project_id").on(table.projectId),
        index("idx_pi_category").on(table.category),
    ])
);

export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type NewPurchaseInvoice = typeof purchaseInvoices.$inferInsert;
