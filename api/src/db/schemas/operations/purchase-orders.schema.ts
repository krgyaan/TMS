import { pgTable, bigserial, bigint, varchar, text, date, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const purchaseOrders = pgTable(
    "purchase_orders",
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

        quotationNo: varchar("quotation_no", { length: 100 }),
        quotationDate: date("quotation_date"),

        poDate: date("po_date"),
        poNumber: varchar("po_number", { length: 255 }),

        warrantyDispatch: varchar("warranty_dispatch", { length: 50 }),
        warrantyInstallation: varchar("warranty_installation", { length: 50 }),
        freight: varchar("freight", { length: 50 }),

        paymentTerms: text("payment_terms"),
        transitInsurance: text("transit_insurance"),
        materialUnloading: text("material_unloading"),
        technicalSpecifications: text("technical_specifications"),
        deliveryPeriod: varchar("delivery_period", { length: 100 }),
        documentation: text("documentation"),

        poRaisedBy: bigint("po_raised_by", { mode: "number" }),
        remarks: text("remarks"),

        tenderId: bigint("tender_id", { mode: "number" }).notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        poNumberIdx: index("idx_po_number").on(table.poNumber),
        tenderIdx: index("idx_po_tender_id").on(table.tenderId),
        poDateIdx: index("idx_po_date").on(table.poDate),
        sellerIdx: index("idx_po_seller_name").on(table.sellerName),
    })
);

// Types
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
