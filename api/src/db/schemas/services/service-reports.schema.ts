import { pgTable, bigserial, bigint, varchar, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const serviceReports = pgTable(
    "service_reports",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        complaintId: bigint("complaint_id", { mode: "number" }).notNull(),
        serviceEngineerId: bigint("service_engineer_id", { mode: "number" }),
        remarks: text("remarks").notNull(),
        resolutionDone: varchar("resolution_done", { length: 1 }),
        unsignedPhoto: jsonb("unsigned_photo"),
        signedPhoto: jsonb("signed_photo"),
        resolvedPhoto: jsonb("resolved_photo"),
        visitDate: timestamp("visit_date", { withTimezone: true }),
        uploadedBy: bigint("uploaded_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("fk_service_reports_complaint").on(table.complaintId),
        index("fk_service_reports_engineer").on(table.serviceEngineerId),
    ],
);

export type ServiceReport = typeof serviceReports.$inferSelect;
export type NewServiceReport = typeof serviceReports.$inferInsert;
