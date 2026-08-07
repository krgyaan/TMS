import { relations } from "drizzle-orm";
import { projects } from "../master/projects.schema";
import { items } from "../master/items.schema";
import { amcs } from "./amc.schema";
import { amcSites } from "./amc-sites.schema";
import { amcContacts } from "./amc-contacts.schema";
import { amcProducts } from "./amc-products.schema";
import { amcServices } from "./amc-services.schema";
import { amcBills } from "./amc-bill.schema";

export const amcRelations = relations(amcs, ({ one, many }) => ({
    project: one(projects, {
        fields: [amcs.projectId],
        references: [projects.id],
    }),
    sites: many(amcSites),
    products: many(amcProducts),
    contacts: many(amcContacts),
    services: many(amcServices),
    bills: many(amcBills),
}));

export const amcSiteRelations = relations(amcSites, ({ one, many }) => ({
    amc: one(amcs, {
        fields: [amcSites.amcId],
        references: [amcs.id],
    }),
    contacts: many(amcContacts),
    services: many(amcServices),
    bills: many(amcBills),
}));

export const amcContactRelations = relations(amcContacts, ({ one }) => ({
    amc: one(amcs, {
        fields: [amcContacts.amcId],
        references: [amcs.id],
    }),
    site: one(amcSites, {
        fields: [amcContacts.amcSiteId],
        references: [amcSites.id],
    }),
}));

export const amcProductRelations = relations(amcProducts, ({ one }) => ({
    amc: one(amcs, {
        fields: [amcProducts.amcId],
        references: [amcs.id],
    }),
    item: one(items, {
        fields: [amcProducts.itemId],
        references: [items.id],
    }),
}));

export const amcServiceRelations = relations(amcServices, ({ one }) => ({
    amc: one(amcs, {
        fields: [amcServices.amcId],
        references: [amcs.id],
    }),
    site: one(amcSites, {
        fields: [amcServices.amcSiteId],
        references: [amcSites.id],
    }),
    bill: one(amcBills, {
        fields: [amcServices.billId],
        references: [amcBills.id],
    }),
}));

export const amcBillRelations = relations(amcBills, ({ one, many }) => ({
    amc: one(amcs, {
        fields: [amcBills.amcId],
        references: [amcs.id],
    }),
    site: one(amcSites, {
        fields: [amcBills.amcSiteId],
        references: [amcSites.id],
    }),
    services: many(amcServices),
}));
