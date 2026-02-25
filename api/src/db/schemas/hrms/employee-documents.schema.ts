import { pgTable, bigserial, bigint, varchar, date, timestamp, integer, text } from "drizzle-orm/pg-core";
import { users } from "@db/schemas/auth/users.schema";

export const employeeDocuments = pgTable("employee_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    documentNumber: varchar("document_number", { length: 100 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    fileUrl: varchar("file_url", { length: 1000 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("Pending"), // Pending, Verified, Rejected
    verifiedBy: bigint("verified_by", { mode: "number" }).references(() => users.id),
    verificationDate: timestamp("verification_date", { withTimezone: true }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;
