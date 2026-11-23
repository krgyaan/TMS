import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    numeric,
    date,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";

/**
 * 1. Item Master (Housekeeping | Pantry | Stationery)
 */
export const officeInventoryItems = pgTable(
    "hrms_office_inventory_items",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        category: varchar("category", { length: 50 }).notNull(), // Housekeeping | Pantry | Stationery
        itemCode: varchar("item_code", { length: 50 }).notNull().unique(), // HK-001, PN-001, ST-001
        itemName: varchar("item_name", { length: 255 }).notNull(),
        unit: varchar("unit", { length: 50 }).notNull(),
        minStockLevel: numeric("min_stock_level", { precision: 12, scale: 2 }).notNull().default("0"),
        openingStock: numeric("opening_stock", { precision: 12, scale: 2 }).notNull().default("0"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        categoryIdx: index("idx_hrms_oi_items_category").on(table.category),
    })
);

/**
 * 2. Purchase Log
 */
export const officeInventoryPurchases = pgTable(
    "hrms_office_inventory_purchases",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        purchaseDate: date("purchase_date").notNull(),
        itemId: bigint("item_id", { mode: "number" })
            .notNull()
            .references(() => officeInventoryItems.id, { onDelete: "restrict" }),
        qtyPurchased: numeric("qty_purchased", { precision: 12, scale: 2 }).notNull(),
        rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("0"),
        amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
        supplier: varchar("supplier", { length: 255 }),
        notes: text("notes"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        itemIdIdx: index("idx_hrms_oi_purchases_item_id").on(table.itemId),
        dateIdx: index("idx_hrms_oi_purchases_date").on(table.purchaseDate),
    })
);

/**
 * 3. Consumption / Issue Log
 */
export const officeInventoryConsumptions = pgTable(
    "hrms_office_inventory_consumptions",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        consumptionDate: date("consumption_date").notNull(),
        itemId: bigint("item_id", { mode: "number" })
            .notNull()
            .references(() => officeInventoryItems.id, { onDelete: "restrict" }),
        qtyIssued: numeric("qty_issued", { precision: 12, scale: 2 }).notNull(),
        issuedTo: varchar("issued_to", { length: 255 }),
        notes: text("notes"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        itemIdIdx: index("idx_hrms_oi_consumptions_item_id").on(table.itemId),
        dateIdx: index("idx_hrms_oi_consumptions_date").on(table.consumptionDate),
    })
);

/**
 * 4. Equipment Register (Durable Housekeeping & Pantry equipment)
 */
export const officeEquipment = pgTable(
    "hrms_office_equipment",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        category: varchar("category", { length: 50 }).notNull(), // Housekeeping | Pantry
        equipmentCode: varchar("equipment_code", { length: 50 }).notNull().unique(), // EQ-HK-001, EQ-PN-001
        itemName: varchar("item_name", { length: 255 }).notNull(),
        unit: varchar("unit", { length: 50 }).notNull(),
        location: varchar("location", { length: 255 }),
        openingQty: numeric("opening_qty", { precision: 12, scale: 2 }).notNull().default("0"),
        unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
        condition: varchar("condition", { length: 50 }).notNull().default("Good"), // Good | Needs Repair | Needs Replacement
        remarks: text("remarks"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        categoryIdx: index("idx_hrms_oi_equipment_category").on(table.category),
    })
);

/**
 * 5. Equipment Movement Log (New Purchase | Discard - End of Life | Discard - Damaged/Lost)
 */
export const officeEquipmentLogs = pgTable(
    "hrms_office_equipment_logs",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        logDate: date("log_date").notNull(),
        equipmentId: bigint("equipment_id", { mode: "number" })
            .notNull()
            .references(() => officeEquipment.id, { onDelete: "restrict" }),
        movementType: varchar("movement_type", { length: 80 }).notNull(),
        qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
        cost: numeric("cost", { precision: 12, scale: 2 }),
        reasonNotes: text("reason_notes"),
        approvedBy: varchar("approved_by", { length: 255 }),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        equipmentIdIdx: index("idx_hrms_oi_eq_logs_equipment_id").on(table.equipmentId),
        dateIdx: index("idx_hrms_oi_eq_logs_date").on(table.logDate),
    })
);

/**
 * 6. Pantry Appliances Register
 */
export const officeAppliances = pgTable("hrms_office_appliances", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    applianceCode: varchar("appliance_code", { length: 50 }).notNull().unique(), // AP-001
    applianceName: varchar("appliance_name", { length: 255 }).notNull(),
    brandModel: varchar("brand_model", { length: 255 }),
    location: varchar("location", { length: 255 }),
    purchaseDate: date("purchase_date"),
    purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }),
    warrantyExpiry: date("warranty_expiry"),
    serviceFrequency: varchar("service_frequency", { length: 50 }).notNull().default("As Needed"), // Monthly | Quarterly | Half-Yearly | Yearly | As Needed
    cleaningFrequency: varchar("cleaning_frequency", { length: 50 }).notNull().default("Weekly"), // Daily | Weekly | Fortnightly | Monthly | Quarterly | As Needed
    status: varchar("status", { length: 50 }).notNull().default("In Service"), // In Service | Under Repair | Discarded
    discardDate: date("discard_date"),
    notes: text("notes"),
    createdBy: bigint("created_by", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 7. Pantry Appliance Service / Maintenance Visit Log
 */
export const officeApplianceServices = pgTable(
    "hrms_office_appliance_services",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        serviceDate: date("service_date").notNull(),
        applianceId: bigint("appliance_id", { mode: "number" })
            .notNull()
            .references(() => officeAppliances.id, { onDelete: "restrict" }),
        visitType: varchar("visit_type", { length: 80 }).notNull(), // Routine Service | AMC | Repair | Filter Change
        vendorTechnician: varchar("vendor_technician", { length: 255 }),
        expense: numeric("expense", { precision: 12, scale: 2 }).notNull().default("0"),
        nextServiceDue: date("next_service_due"),
        notes: text("notes"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        applianceIdIdx: index("idx_hrms_oi_app_services_appliance_id").on(table.applianceId),
        dateIdx: index("idx_hrms_oi_app_services_date").on(table.serviceDate),
    })
);

/**
 * 8. Pantry Appliance Cleaning Log
 */
export const officeApplianceCleanings = pgTable(
    "hrms_office_appliance_cleanings",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        cleaningDate: date("cleaning_date").notNull(),
        applianceId: bigint("appliance_id", { mode: "number" })
            .notNull()
            .references(() => officeAppliances.id, { onDelete: "restrict" }),
        cleaningType: varchar("cleaning_type", { length: 80 }).notNull(), // Routine Cleaning | Deep Cleaning | Descaling | Sanitization
        doneBy: varchar("done_by", { length: 255 }),
        cost: numeric("cost", { precision: 12, scale: 2 }).default("0"),
        notes: text("notes"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        applianceIdIdx: index("idx_hrms_oi_app_cleanings_appliance_id").on(table.applianceId),
        dateIdx: index("idx_hrms_oi_app_cleanings_date").on(table.cleaningDate),
    })
);

export type OfficeInventoryItem = typeof officeInventoryItems.$inferSelect;
export type OfficeInventoryPurchase = typeof officeInventoryPurchases.$inferSelect;
export type OfficeInventoryConsumption = typeof officeInventoryConsumptions.$inferSelect;
export type OfficeEquipment = typeof officeEquipment.$inferSelect;
export type OfficeEquipmentLog = typeof officeEquipmentLogs.$inferSelect;
export type OfficeAppliance = typeof officeAppliances.$inferSelect;
export type OfficeApplianceService = typeof officeApplianceServices.$inferSelect;
export type OfficeApplianceCleaning = typeof officeApplianceCleanings.$inferSelect;
