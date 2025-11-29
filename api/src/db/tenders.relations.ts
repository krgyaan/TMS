import { relations } from 'drizzle-orm';
import { tenderInfos } from './tenders.schema';
import { teams } from './teams.schema';
import { organizations } from './organizations.schema';
import { items } from './items.schema';
import { users } from './users.schema';
import { statuses } from './statuses.schema';
import { locations } from './locations.schema';
import { websites } from './websites.schema';
import { rfqs } from './rfqs.schema';
import { paymentRequests } from './emds.schema';
import { tenderStatusHistory } from './tender-status-history.schema';
import { tenderIncompleteFields } from './tender-incomplete-fields.schema';

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
