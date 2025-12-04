import {
    pgTable, serial, bigint, varchar, text,
    timestamp, pgEnum, index
} from "drizzle-orm/pg-core";

export const incompleteFieldStatusEnum = pgEnum("incomplete_field_status", ["pending", "resolved"]);

export const tenderIncompleteFields = pgTable("tender_incomplete_fields", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    fieldName: varchar("field_name", { length: 100 }).notNull(),
    comment: text("comment").notNull(),
    status: incompleteFieldStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
}, (table) => [
    index("tender_incomplete_fields_tender_id_idx").on(table.tenderId),
]);

export type TenderIncompleteField = typeof tenderIncompleteFields.$inferSelect;
export type NewTenderIncompleteField = typeof tenderIncompleteFields.$inferInsert;
