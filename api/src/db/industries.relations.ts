import { relations } from 'drizzle-orm';
import { industries } from './industries.schema';
import { organizations } from './organizations.schema';

export const industriesRelations = relations(industries, ({ many }) => ({
  organizations: many(organizations),
}));
