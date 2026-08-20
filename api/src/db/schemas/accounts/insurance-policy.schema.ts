import { pgTable, serial, integer, bigint, varchar, text, decimal, date, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { projects } from "@/db/schemas/master/projects.schema";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";

export const insurancePolicies = pgTable(
    "insurance_policies",
    {
        id: serial("id").primaryKey(),
        imprestId: integer("imprest_id").references(() => employeeImprests.id, {
            onDelete: "set null",
        }),
        makerRequestId: integer("maker_request_id"),
        projectId: bigint("project_id", { mode: "number" }).references(() => projects.id, {
            onDelete: "set null",
        }),
        paymentRequestId: integer("payment_request_id").references(() => paymentRequests.id, {
            onDelete: "set null",
        }),
        insuranceType: varchar("insurance_type", { length: 30 }).notNull(),
        policyNumber: varchar("policy_number", { length: 255 }),
        insurerName: varchar("insurer_name", { length: 255 }),
        startDate: date("start_date").notNull(),
        endDate: date("end_date").notNull(),
        policyDocument: jsonb("policy_document").$type<string[]>().notNull().default([]),
        sumAssured: decimal("sum_assured", { precision: 15, scale: 2 }).notNull(),
        noOfManpower: integer("no_of_manpower"),
        manpowerNames: text("manpower_names"),
        location: varchar("location", { length: 255 }),
        itemsCovered: text("items_covered"),
        lrCopy: jsonb("lr_copy").$type<string[]>(),
        createdBy: integer("created_by").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        uniqueIndex("insurance_policies_imprest_id_idx").on(table.imprestId),
        uniqueIndex("insurance_policies_maker_request_id_idx").on(table.makerRequestId),
        uniqueIndex("insurance_policies_payment_request_id_idx").on(table.paymentRequestId),
    ]
);

export const insurancePoliciesRelations = relations(insurancePolicies, ({ one }) => ({
    imprest: one(employeeImprests, {
        fields: [insurancePolicies.imprestId],
        references: [employeeImprests.id],
    }),
    project: one(projects, {
        fields: [insurancePolicies.projectId],
        references: [projects.id],
    }),
    paymentRequest: one(paymentRequests, {
        fields: [insurancePolicies.paymentRequestId],
        references: [paymentRequests.id],
    }),
}));

export const employeeImprestsRelations = relations(employeeImprests, ({ one }) => ({
    insurancePolicy: one(insurancePolicies, {
        fields: [employeeImprests.insurancePolicyId],
        references: [insurancePolicies.id],
    }),
}));

export type InsurancePolicy = typeof insurancePolicies.$inferSelect;
export type NewInsurancePolicy = typeof insurancePolicies.$inferInsert;
