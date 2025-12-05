import { relations } from 'drizzle-orm';
import { projects } from '@db/schemas/master/projects.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { items } from '@db/schemas/master/items.schema';
import { locations } from '@db/schemas/master/locations.schema';

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
