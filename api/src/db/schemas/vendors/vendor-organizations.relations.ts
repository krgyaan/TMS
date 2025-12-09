import { relations } from 'drizzle-orm';
import { vendorOrganizations } from './vendor-organizations.schema';
import { vendors } from './vendors.schema';
import { vendorAccs } from './vendor-banks.schema';
import { vendorGsts } from './vendor-gsts.schema';

export const vendorOrganizationsRelations = relations(vendorOrganizations, ({ many }) => ({
  vendors: many(vendors),
  vendorBanks: many(vendorAccs),
  vendorGsts: many(vendorGsts),
}));
