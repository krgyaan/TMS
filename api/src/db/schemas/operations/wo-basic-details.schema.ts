import { pgTable, bigint, varchar, timestamp, numeric, date } from "drizzle-orm/pg-core";

export const woBasicDetails = pgTable("wo_basic_details", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    tenderNameId: bigint("tender_name_id", { mode: "number" }),

    number: varchar("number", { length: 255 }),
    date: date("date"),

    parGst: numeric("par_gst", { precision: 20, scale: 2 }),
    parAmt: numeric("par_amt", { precision: 20, scale: 2 }),

    image: varchar("image", { length: 255 }),
    loGemImg: varchar("lo_gem_img", { length: 2000 }),
    foaSapImage: varchar("foa_sap_image", { length: 255 }),

    status: varchar("status", { length: 1 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),

    costingReceipt: numeric("costing_receipt", { precision: 20, scale: 2 }),
    costingBudget: numeric("costing_budget", { precision: 20, scale: 2 }),
    costingGrossMargin: numeric("costing_gross_margin", { precision: 20, scale: 2 }),

    enquiryId: bigint("enquiry_id", { mode: "number" }),
});

export type WoBasicDetials = typeof woBasicDetails.$inferSelect;
export type NewWoBasicDetails = typeof woBasicDetails.$inferInsert;
