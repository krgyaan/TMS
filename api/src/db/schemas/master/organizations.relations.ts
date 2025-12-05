import { relations } from 'drizzle-orm';
import { organizations } from '@db/schemas/master/organizations.schema';
import { industries } from '@db/schemas/master/industries.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { projects } from '@db/schemas/master/projects.schema';

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
    industry: one(industries, {
        fields: [organizations.industryId],
        references: [industries.id],
    }),
    tenderInfos: many(tenderInfos),
    projects: many(projects),
}));
