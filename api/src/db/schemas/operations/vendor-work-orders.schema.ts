import { pgTable, bigserial, bigint, varchar, text, date, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const vendorWorkOrders = pgTable(
    "vendor_work_orders",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        shipToName: varchar("ship_to_name", { length: 255 }),
        shippingAddress: text("shipping_address"),
        shipToGst: varchar("ship_to_gst", { length: 50 }),
        shipToPan: varchar("ship_to_pan", { length: 50 }),
        projectName: varchar("project_name", { length: 255 }),
        contactPersonName: varchar("contact_person_name", { length: 255 }),
        contactPersonPhone: varchar("contact_person_phone", { length: 20 }),
        contactPersonEmail: varchar("contact_person_email", { length: 255 }),
        sellerName: varchar("seller_name", { length: 255 }),
        sellerAddress: text("seller_address"),
        sellerEmail: varchar("seller_email", { length: 255 }),
        sellerGstNo: varchar("seller_gst_no", { length: 50 }),
        sellerPanNo: varchar("seller_pan_no", { length: 50 }),
        sellerCinNo: varchar("seller_cin_no", { length: 50 }),
        sellerMsmeNo: varchar("seller_msme_no", { length: 50 }),
        woDate: date("wo_date"),
        woNumber: varchar("wo_number", { length: 255 }),
        termsAndConditions: jsonb("terms_and_conditions").notNull().default('[]'),
        woRaisedBy: bigint("wo_raised_by", { mode: "number" }),
        certRecipient: bigint("cert_recipient", { mode: "number" }),
        remarks: text("remarks"),
        scopeOfWork: text("scope_of_work"),
        accessoriesPackagingListAttachments: text("accessories_packaging_list_attachments"),
        tenderId: bigint("tender_id", { mode: "number" }).notNull(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        generatedPdfVersions: jsonb("generated_pdf_versions").notNull().default({}),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ([
        index("idx_vwo_number").on(table.woNumber),
        index("idx_vwo_tender_id").on(table.tenderId),
        index("idx_vwo_date").on(table.woDate),
        index("idx_vwo_seller_name").on(table.sellerName),
    ])
);

export type VendorWorkOrder = typeof vendorWorkOrders.$inferSelect;
export type NewVendorWorkOrder = typeof vendorWorkOrders.$inferInsert;
