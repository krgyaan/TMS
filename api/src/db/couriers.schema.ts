// src/db/couriers.schema.ts
import { pgTable, serial, integer, varchar, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const couriers = pgTable("couriers", {
    id: serial("id").primaryKey(),
    user_id: integer("user_id").notNull(),

    // Recipient details
    to_org: varchar("to_org", { length: 255 }).notNull(),
    to_name: varchar("to_name", { length: 255 }).notNull(),
    to_addr: text("to_addr").notNull(),
    to_pin: varchar("to_pin", { length: 10 }).notNull(),
    to_mobile: varchar("to_mobile", { length: 15 }).notNull(),

    // Courier details
    emp_from: integer("emp_from").notNull(),
    del_date: timestamp("del_date").notNull(),
    urgency: integer("urgency").notNull(),

    // Dispatch details
    courier_provider: varchar("courier_provider", { length: 100 }),
    pickup_date: timestamp("pickup_date"),
    docket_no: varchar("docket_no", { length: 100 }),

    // Delivery details
    delivery_date: timestamp("delivery_date"),
    delivery_pod: varchar("delivery_pod", { length: 255 }),
    within_time: boolean("within_time"),

    // Documents
    courier_docs: jsonb("courier_docs").$type<{ url: string; name: string; type: string }[]>().default([]),

    // Status: 0=Pending, 1=Dispatched, 2=Not Delivered, 3=Delivered, 4=Rejected
    status: integer("status").default(0),
    tracking_number: varchar("tracking_number", { length: 100 }),

    // Timestamps
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});
