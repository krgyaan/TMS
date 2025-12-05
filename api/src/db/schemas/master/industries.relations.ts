import { relations } from 'drizzle-orm';
import { industries } from '@db/schemas/master/industries.schema';
import { organizations } from '@db/schemas/master/organizations.schema';

export const industriesRelations = relations(industries, ({ many }) => ({
  organizations: many(organizations),
}));
