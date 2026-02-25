import { pgTable, bigserial, bigint, varchar, date, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { users } from "@db/schemas/auth/users.schema";

export const employeeAssets = pgTable("employee_assets", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
    assetId: varchar("asset_id", { length: 100 }).notNull().unique(), // Asset Tag / ID
    assetType: varchar("asset_type", { length: 100 }).notNull(), // Laptop, Mobile, etc.
    brand: varchar("brand", { length: 100 }),
    model: varchar("model", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    condition: varchar("condition", { length: 100 }).notNull(), // New, Used, etc.
    assignedDate: date("assigned_date").notNull(),
    assignedBy: bigint("assigned_by", { mode: "number" }).notNull().references(() => users.id),
    expectedReturnDate: date("expected_return_date"),
    returnDate: date("return_date"),
    status: varchar("status", { length: 50 }).notNull().default("Assigned"), // Assigned, Returned, Lost, Damaged
    accessories: jsonb("accessories").$type<string[]>().default([]),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeAsset = typeof employeeAssets.$inferSelect;
export type NewEmployeeAsset = typeof employeeAssets.$inferInsert;
