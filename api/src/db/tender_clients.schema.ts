import { pgTable, serial, bigint, varchar } from "drizzle-orm/pg-core";

export const tenderClients = pgTable("tender_clients", {
    id: serial("id").primaryKey(),
    tenderId: bigint("tender_id", { mode: "number" }).notNull(),
    clientName: varchar("client_name", { length: 255 }),
    designation: varchar("designation", { length: 100 }),
    mobile: varchar("mobile", { length: 20 }),
    email: varchar("email", { length: 255 }),
});
