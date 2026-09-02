import { pgTable, bigint, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { employeeImprestVouchers } from "./employee-imprest-voucher";
import { employeeImprests } from "../shared/employee-imprest.schema";

export const employeeImprestVoucherItems = pgTable(
    "employee_imprest_voucher_items",
    {
        voucherId: bigint("voucher_id", { mode: "number" })
            .notNull()
            .references(() => employeeImprestVouchers.id, { onDelete: "cascade" }),
        imprestId: integer("imprest_id")
            .notNull()
            .references(() => employeeImprests.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    t => ({
        pk: primaryKey({ columns: [t.voucherId, t.imprestId] }),
        idxImprest: index("idx_voucher_items_imprest").on(t.imprestId),
        idxVoucher: index("idx_voucher_items_voucher").on(t.voucherId),
    })
);
