import { relations } from 'drizzle-orm';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { items } from '@db/schemas/master/items.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { locations } from '@db/schemas/master/locations.schema';
import { websites } from '@db/schemas/master/websites.schema';
import { rfqs } from '@db/schemas/tendering/rfqs.schema';
import { paymentRequests } from '@db/schemas/tendering/emds.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import { tenderIncompleteFields } from '@db/schemas/tendering/tender-incomplete-fields.schema';

export const tenderInfosRelations = relations(tenderInfos, ({ one, many }) => ({
    team: one(teams, {
        fields: [tenderInfos.team],
        references: [teams.id],
    }),
    organization: one(organizations, {
        fields: [tenderInfos.organization],
        references: [organizations.id],
    }),
    item: one(items, {
        fields: [tenderInfos.item],
        references: [items.id],
    }),
    teamMember: one(users, {
        fields: [tenderInfos.teamMember],
        references: [users.id],
    }),
    status: one(statuses, {
        fields: [tenderInfos.status],
        references: [statuses.id],
    }),
    location: one(locations, {
        fields: [tenderInfos.location],
        references: [locations.id],
    }),
    website: one(websites, {
        fields: [tenderInfos.website],
        references: [websites.id],
    }),
    rfqs: many(rfqs),
    paymentRequests: many(paymentRequests),
    tenderStatusHistory: many(tenderStatusHistory),
    tenderIncompleteFields: many(tenderIncompleteFields),
}));
