import { relations } from 'drizzle-orm';
import { projects } from './projects.schema';
import { organizations } from './organizations.schema';
import { items } from './items.schema';
import { locations } from './locations.schema';

export const projectsRelations = relations(projects, ({ one }) => ({
  organization: one(organizations, {
    fields: [projects.organisationId],
    references: [organizations.id],
  }),
  item: one(items, {
    fields: [projects.itemId],
    references: [items.id],
  }),
  location: one(locations, {
    fields: [projects.locationId],
    references: [locations.id],
  }),
}));
