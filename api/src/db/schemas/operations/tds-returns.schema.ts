import { pgTable, bigserial, bigint, numeric, date, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";

export const tdsReturns = pgTable(
    "tds_returns",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" })
            .notNull()
            .references(() => projects.id),
        poId: bigint("po_id", { mode: "number" }).references(() => purchaseOrders.id),
        vwoId: bigint("vwo_id", { mode: "number" }).references(() => vendorWorkOrders.id),
        prId: bigint("pr_id", { mode: "number" })
            .notNull()
            .references(() => paymentRequests.id),
        tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }).notNull(),
        tdsReturnDate: date("tds_return_date").notNull(),
        invoiceDate: date("invoice_date"),
        invoiceUploadedAt: timestamp("invoice_uploaded_at"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_tr_po_id").on(table.poId),
        index("idx_tr_vwo_id").on(table.vwoId),
        index("idx_tr_pr_id").on(table.prId),
        index("idx_tr_return_date").on(table.tdsReturnDate),
        index("idx_tr_project_id").on(table.projectId),
        uniqueIndex("uq_tr_pr_id").on(table.prId),
        check("chk_tr_document", sql`(${table.poId} IS NOT NULL AND ${table.vwoId} IS NULL) OR (${table.poId} IS NULL AND ${table.vwoId} IS NOT NULL)`),
    ]
);

export type TdsReturn = typeof tdsReturns.$inferSelect;
export type NewTdsReturn = typeof tdsReturns.$inferInsert;
