import { sql } from "drizzle-orm";
import { pgTable, bigint, varchar, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

export const employeeImprestVouchers = pgTable("employee_imprest_vouchers", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('employee_imprest_vouchers_id_seq')`),

    voucherCode: varchar("voucher_code", { length: 200 }).notNull(),
    beneficiaryName: varchar("beneficiary_name", { length: 255 }).notNull(),

    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),

    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }).notNull(),

    preparedBy: varchar("prepared_by", { length: 255 }),

    accountsSignedBy: varchar("accounts_signed_by", { length: 255 }),
    accountsSignedAt: timestamp("accounts_signed_at", { withTimezone: true }),

    adminSignedBy: varchar("admin_signed_by", { length: 255 }),
    adminSignedAt: timestamp("admin_signed_at", { withTimezone: true }),

    accountsRemark: varchar("accounts_remark", { length: 500 }),
    adminRemark: varchar("admin_remark", { length: 500 }),

    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
