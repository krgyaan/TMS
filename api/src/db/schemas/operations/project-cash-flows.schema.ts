import { pgTable, bigserial, bigint, varchar, numeric, text, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "@/db/schemas/master/projects.schema";

export const projectCashFlows = pgTable(
  "project_cash_flows",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" })
      .notNull()
      .references(() => projects.id),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    direction: varchar("direction", { length: 20 }).notNull().default("outflow"),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: bigint("reference_id", { mode: "number" }),
    referenceNo: varchar("reference_no", { length: 255 }),
    tdsPercentage: numeric("tds_percentage", { precision: 5, scale: 2 }),
    tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }),
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }),
    remark: text("remark"),
    createdBy: bigint("created_by", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_cf_project_id").on(table.projectId),
    index("idx_cf_event_type").on(table.eventType),
    index("idx_cf_reference").on(table.referenceType, table.referenceId),
    index("idx_cf_created_at").on(table.createdAt),
  ]
);

// Export types for use in service
export type ProjectCashFlow = typeof projectCashFlows.$inferSelect;
export type NewProjectCashFlow = typeof projectCashFlows.$inferInsert;