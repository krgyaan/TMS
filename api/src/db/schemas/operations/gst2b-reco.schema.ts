import { pgTable, bigserial, bigint, numeric, date, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { purchaseInvoices } from "./purchase-invoices.schema";

export const gst2bReco = pgTable(
    "gst2b_reco",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" })
            .notNull()
            .references(() => projects.id),
        poId: bigint("po_id", { mode: "number" }).references(() => purchaseOrders.id),
        vwoId: bigint("vwo_id", { mode: "number" }).references(() => vendorWorkOrders.id),
        invoiceId: bigint("invoice_id", { mode: "number" })
            .notNull()
            .references(() => purchaseInvoices.id),
        invoiceDate: date("invoice_date").notNull(),
        invoiceUploadedAt: timestamp("invoice_uploaded_at").notNull(),
        gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_gr_po_id").on(table.poId),
        index("idx_gr_vwo_id").on(table.vwoId),
        index("idx_gr_invoice_id").on(table.invoiceId),
        index("idx_gr_invoice_date").on(table.invoiceDate),
        index("idx_gr_project_id").on(table.projectId),
        uniqueIndex("uq_gr_invoice_id").on(table.invoiceId),
        check("chk_gr_document", sql`(${table.poId} IS NOT NULL AND ${table.vwoId} IS NULL) OR (${table.poId} IS NULL AND ${table.vwoId} IS NOT NULL)`),
    ]
);

export type Gst2bReco = typeof gst2bReco.$inferSelect;
export type NewGst2bReco = typeof gst2bReco.$inferInsert;
