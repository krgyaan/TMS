// couriers.schema.ts
import { pgTable, varchar, integer, boolean, timestamp, jsonb, text, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const couriers = pgTable("couriers", {
    id: integer("id")
        .primaryKey()
        .notNull()
        .default(sql`nextval('couriers_id_seq')`),

    userId: integer("user_id").notNull(),

    toOrg: varchar("to_org", { length: 255 }).notNull(),
    toName: varchar("to_name", { length: 255 }).notNull(),
    toAddr: text("to_addr").notNull(),
    toPin: varchar("to_pin", { length: 255 }).notNull(),
    toMobile: varchar("to_mobile", { length: 255 }).notNull(),

    empFrom: integer("emp_from").notNull(),

    delDate: timestamp("del_date", { withTimezone: true }).notNull(),
    urgency: integer("urgency").notNull(),

    courierDocs: jsonb("courier_docs").default([]),
    status: integer("status").default(0),

    trackingNumber: varchar("tracking_number", { length: 255 }),

    courierProvider: varchar("courier_provider", { length: 255 }),
    pickupDate: timestamp("pickup_date", { withTimezone: true }),
    docketNo: varchar("docket_no", { length: 255 }),
    docketSlip: varchar("docket_slip", { length: 255 }),

    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    deliveryPod: varchar("delivery_pod", { length: 255 }),

    withinTime: boolean("within_time"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
