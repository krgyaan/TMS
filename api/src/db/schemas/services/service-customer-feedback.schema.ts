import { pgTable, bigserial, bigint, varchar, text, timestamp, index, integer } from "drizzle-orm/pg-core";

export const serviceCustomerFeedback = pgTable(
    "service_customer_feedback",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        complaintId: bigint("complaint_id", { mode: "number" }).notNull(),
        problemResolved: varchar("problem_resolved", { length: 1 }).notNull(),
        satisfaction: integer("satisfaction"),
        suggestions: text("suggestions"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("fk_feedback_complaint").on(table.complaintId),
        // satisfaction range CHECK is applied via drizzle/0112_create_service_customer_feedback.sql
    ],
);

export type ServiceCustomerFeedback = typeof serviceCustomerFeedback.$inferSelect;
export type NewServiceCustomerFeedback = typeof serviceCustomerFeedback.$inferInsert;
