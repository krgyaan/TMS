import { relations } from "drizzle-orm";
import { projects } from "../master/projects.schema";
import { items } from "../master/items.schema";
import { amcs } from "./amc.schema";
import { amcSites } from "./amc-sites.schema";
import { amcSiteContacts } from "./amc-site-contacts.schema";
import { amcProducts } from "./amc-products.schema";
import { amcServiceEngineers } from "./amc-service-engineers.schema";

export const amcRelations = relations(amcs, ({ one, many }) => ({
    project: one(projects, {
        fields: [amcs.projectId],
        references: [projects.id],
    }),
    sites: many(amcSites),
    products: many(amcProducts),
    serviceEngineers: many(amcServiceEngineers),
}));

export const amcSiteRelations = relations(amcSites, ({ one, many }) => ({
    amc: one(amcs, {
        fields: [amcSites.amcId],
        references: [amcs.id],
    }),
    contacts: many(amcSiteContacts),
}));

export const amcSiteContactRelations = relations(amcSiteContacts, ({ one }) => ({
    site: one(amcSites, {
        fields: [amcSiteContacts.amcSiteId],
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

export const amcServiceEngineerRelations = relations(amcServiceEngineers, ({ one }) => ({
    amc: one(amcs, {
        fields: [amcServiceEngineers.amcId],
        references: [amcs.id],
    }),
}));