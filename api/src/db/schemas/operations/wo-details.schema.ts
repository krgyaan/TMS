import { pgTable, bigserial, bigint, varchar, text, numeric, boolean, date, timestamp, inet, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const woDetails = pgTable(
    "wo_details",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        basicDetailId: bigint("basic_detail_id", { mode: "number" }),

        organization: text("organization"),
        departments: text("departments"),

        name: varchar("name", { length: 255 }),
        phone: varchar("phone", { length: 20 }),
        email: varchar("email", { length: 255 }),
        designation: varchar("designation", { length: 255 }),

        budget: numeric("budget", { precision: 20, scale: 2 }),

        maxLd: varchar("max_ld", { length: 255 }),
        ldStartDate: date("ldstartdate"),
        maxLdDate: date("maxlddate"),

        pbgApplicable: boolean("pbg_applicable_status").notNull().default(false),
        fileApplicable: varchar("file_applicable", { length: 255 }),

        contractAgreementStatus: boolean("contract_agreement_status").notNull().default(false),

        fileAgreement: varchar("file_agreement", { length: 255 }),

        meetingDateTime: timestamp("meeting_date_time", { withTimezone: true }),
        googleMeetLink: varchar("google_meet_link", { length: 255 }),
        uploadMom: varchar("upload_mom", { length: 255 }),

        contractAgreement: varchar("contract_agreement", { length: 255 }),
        clientSigned: varchar("client_signed", { length: 255 }),

        status: boolean("status").notNull().default(true),

        ldApplicable: boolean("ld_applicable").notNull().default(true),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        basicIdx: index("idx_wo_basic_detail_id").on(table.basicDetailId),
        emailIdx: index("idx_wo_email").on(table.email),
    })
);

export type WoDetail = typeof woDetails.$inferSelect;
export type NewWoDetail = typeof woDetails.$inferInsert;
