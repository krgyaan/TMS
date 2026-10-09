import { pgTable, bigserial, bigint, numeric, date, timestamp, index, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseInvoices } from "./purchase-invoices.schema";

export const gst2bReco = pgTable(
    "gst2b_reco",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" })
            .notNull()
            .references(() => projects.id),
        poId: bigint("po_id", { mode: "number" })
            .notNull()
            .references(() => purchaseOrders.id),
        invoiceId: bigint("invoice_id", { mode: "number" })
            .notNull()
            .references(() => purchaseInvoices.id),
        invoiceDate: date("invoice_date").notNull(),
        invoiceUploadedAt: timestamp("invoice_uploaded_at").notNull(),
        gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("idx_gr_po_id").on(table.poId),
        index("idx_gr_invoice_id").on(table.invoiceId),
        index("idx_gr_invoice_date").on(table.invoiceDate),
        index("idx_gr_project_id").on(table.projectId),
        uniqueIndex("uq_gr_po_invoice").on(table.poId, table.invoiceId),
    ]
);

export type Gst2bReco = typeof gst2bReco.$inferSelect;
export type NewGst2bReco = typeof gst2bReco.$inferInsert;