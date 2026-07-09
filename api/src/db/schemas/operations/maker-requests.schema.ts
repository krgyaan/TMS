import { pgTable, bigserial, bigint, varchar, text, numeric, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const makerRequests = pgTable(
    "maker_requests",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        requestNo: varchar("request_no", { length: 255 }),
        partyName: varchar("party_name", { length: 255 }),
        accountNumber: varchar("account_number", { length: 100 }),
        bankName: varchar("bank_name", { length: 255 }),
        ifsc: varchar("ifsc", { length: 50 }),
        amount: numeric("amount", { precision: 20, scale: 2 }),
        category: varchar("category", { length: 100 }),
        paymentMode: varchar("payment_mode", { length: 50 }).notNull().default("BANK_TRANSFER"),
        portalLink: text("portal_link"),
        billFiles: jsonb("bill_files").notNull().default([]),
        remark: text("remark"),
        status: varchar("status", { length: 50 }).notNull().default("pending"),
        utrNumber: text("utr_number"),
        rejectionReason: text("rejection_reason"),
        requestedBy: bigint("requested_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ([
        index("idx_mr_request_no").on(table.requestNo),
        index("idx_mr_status").on(table.status),
        index("idx_mr_requested_by").on(table.requestedBy),
    ])
);

export type MakerRequest = typeof makerRequests.$inferSelect;
export type NewMakerRequest = typeof makerRequests.$inferInsert;
