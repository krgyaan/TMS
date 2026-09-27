import { relations } from "drizzle-orm";
import { vendors } from "@db/schemas/vendors/vendors.schema";
import { vendorOrganizations } from "@db/schemas/vendors/vendor-organizations.schema";
import { rfqResponses } from "@db/schemas/tendering/rfqs.schema";

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
    organization: one(vendorOrganizations, {
        fields: [vendors.orgId],
        references: [vendorOrganizations.id],
    }),
    rfqResponses: many(rfqResponses),
}));
