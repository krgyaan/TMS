import { pgTable, bigserial, bigint, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export type Client = {
  org: string;
  name: string;
  email: string;
  phone: string;
};

// Define the req_exts table
export const requestExtension = pgTable("request_extensions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenderId: bigint("tender_id", { mode: "number" }).notNull(),
  days: integer("days").notNull(),
  reason: text("reason").notNull(),
  clients: jsonb("clients").$type<Client[]>().notNull().default([]),
  status: integer("status").notNull().default(0), // 0: pending, 1: approved, 2: rejected
  createdAt: timestamp("created_at", { mode: "date", withTimezone: false }),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: false }),
});

// Infer types for select and insert
export type RequestExtension = typeof requestExtension.$inferSelect;
export type NewRequestExtension = typeof requestExtension.$inferInsert;
