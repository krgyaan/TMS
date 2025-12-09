import { relations } from 'drizzle-orm';
import { teams } from '@db/schemas/master/teams.schema';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';
import { items } from '@db/schemas/master/items.schema';
import { itemHeadings } from '@db/schemas/master/item-headings.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';

export const teamsRelations = relations(teams, ({ one, many }) => ({
    parent: one(teams, {
        fields: [teams.parentId],
        references: [teams.id],
        relationName: 'parent',
    }),
    children: many(teams, {
        relationName: 'parent',
    }),
    userProfiles: many(userProfiles),
    items: many(items),
    itemHeadings: many(itemHeadings),
    tenderInfos: many(tenderInfos),
}));
