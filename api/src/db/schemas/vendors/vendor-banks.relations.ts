import { relations } from "drizzle-orm";
import { vendorAccs } from "./vendor-banks.schema";
import { vendorOrganizations } from "./vendor-organizations.schema";

export const vendorAccsRelations = relations(vendorAccs, ({ one }) => ({
    organization: one(vendorOrganizations, {
        fields: [vendorAccs.orgId],
        references: [vendorOrganizations.id],
    }),
}));
