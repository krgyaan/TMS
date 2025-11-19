import {
    pgTable,
    serial,
    varchar,
    text,
    bigint,
    decimal,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { statuses } from "./statuses.schema";
import { items } from "./items.schema";
import { users } from "./users.schema";
import { teams } from "./teams.schema";
import { locations } from "./locations.schema";
import { websites } from "./websites.schema";
import { organizations } from "./organizations.schema";

// Define enums
export const deleteStatusEnum = pgEnum("deleteStatus", ["0", "1"]);
export const tlStatusEnum = pgEnum("tlStatus", ["0", "1", "2", "3"]);

export const tenderInfos = pgTable("tender_infos", {
    id: serial("id").primaryKey(),
    team: bigint("team", { mode: "number" }).notNull().references(() => teams.id),
    tenderNo: varchar("tender_no", { length: 255 }).notNull(),
    organization: bigint("organization", { mode: "number" }).references(() => organizations.id),
    tenderName: varchar("tender_name", { length: 255 }).notNull(),
    item: bigint("item", { mode: "number" }).notNull().references(() => items.id),
    gstValues: decimal("gst_values", { precision: 15, scale: 2 }).notNull().default("0"),
    tenderFees: decimal("tender_fees", { precision: 15, scale: 2 }).notNull().default("0"),
    emd: decimal("emd", { precision: 15, scale: 2 }).notNull().default("0"),
    teamMember: bigint("team_member", { mode: "number" }).notNull().references(() => users.id),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    remarks: varchar("remarks", { length: 200 }),
    status: bigint("status", { mode: "number" }).notNull().default(1).references(() => statuses.id),
    location: bigint("location", { mode: "number" }).references(() => locations.id),
    website: bigint("website", { mode: "number" }).references(() => websites.id),
    courierAddress: text("courier_address"),
    deleteStatus: deleteStatusEnum("delete_status").default("0").notNull(),

    // Tender approval fields
    tlRemarks: varchar("tl_remarks", { length: 200 }),
    rfqTo: varchar("rfq_to", { length: 15 }),
    tlStatus: tlStatusEnum("tl_status").default("0").notNull(),
    tenderFeeMode: varchar("tender_fee_mode", { length: 100 }),
    emdMode: varchar("emd_mode", { length: 100 }),
    approvePqrSelection: varchar("approve_pqr_selection", { length: 50 }),
    approveFinanceDocSelection: varchar("approve_finance_doc_selection", { length: 50 }),
    tenderApprovalStatus: varchar("tender_approval_status", { length: 50 }),
    tlRejectionRemarks: text("tl_rejection_remarks"),
    oemNotAllowed: varchar("oem_not_allowed", { length: 50 }),

    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});

export type TenderInfo = typeof tenderInfos.$inferSelect;
export type NewTenderInfo = typeof tenderInfos.$inferInsert;
