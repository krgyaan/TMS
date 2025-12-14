import { relations } from "drizzle-orm";
import { users } from "../auth/users.schema";
import { couriers } from "./couriers.schema";

export const courierRelations = relations(couriers, ({ one }) => ({
    empFromUser: one(users, {
        fields: [couriers.empFrom],
        references: [users.id],
    }),
}));
