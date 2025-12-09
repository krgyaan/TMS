import { relations } from 'drizzle-orm';
import { locations } from '@db/schemas/master/locations.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { projects } from '@db/schemas/master/projects.schema';

export const locationsRelations = relations(locations, ({ many }) => ({
    tenderInfos: many(tenderInfos),
    projects: many(projects),
}));
