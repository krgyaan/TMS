import { pgTable, bigserial, varchar, timestamp } from "drizzle-orm/pg-core";

export const beneficiaries = pgTable("project_beneficiaries", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    accountNumber: varchar("account_number", { length: 100 }),
    ifsc: varchar("ifsc", { length: 50 }),
    bankName: varchar("bank_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
