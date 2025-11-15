import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tenderInfos, type TenderInfo, type NewTenderInfo } from '../../../db/tenders.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';
import { items } from 'src/db/items.schema';
import { organizations } from 'src/db/organizations.schema';
import { locations } from 'src/db/locations.schema';
import { websites } from 'src/db/websites.schema';

export type TenderListFilters = {
    statusIds?: number[];
    unallocated?: boolean; // team_member IS NULL
};

export type TenderInfoWithNames = TenderInfo & {
    organizationName: string | null;
    teamMemberName: string | null;
    teamMemberUsername: string | null;
    statusName: string | null;
    itemName: string | null;
    organizationAcronym: string | null;
    locationName: string | null;
    locationState: string | null;
    websiteName: string | null;
    websiteLink: string | null;
};

@Injectable()
export class TenderInfosService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }
    private mapJoinedRow = (row: {
        tenderInfos: typeof tenderInfos.$inferSelect;
        users: { name: string | null; username: string | null } | null;
        statuses: { name: string | null } | null;
        items: { name: string | null } | null;
        organizations: { name: string | null; acronym: string | null } | null;
        locations: { name: string | null; state: string | null } | null;
        websites: { name: string | null; url: string | null } | null;
    }): TenderInfoWithNames => {
        const t = row.tenderInfos;
        return {
            ...t,
            organizationName: row.organizations?.name ?? null,
            organizationAcronym: row.organizations?.acronym ?? null,
            itemName: row.items?.name ?? null,
            teamMemberName: row.users?.name ?? null,
            teamMemberUsername: row.users?.username ?? null,
            statusName: row.statuses?.name ?? null,
            locationName: row.locations?.name ?? null,
            locationState: row.locations?.state ?? null,
            websiteName: row.websites?.name ?? null,
            websiteLink: row.websites?.url ?? null,
        };
    };

    private getTenderBaseSelect() {
        return {
            tenderInfos,
            users: {
                name: users.name,
                username: users.username,
                isActive: users.isActive,
            },
            statuses: {
                id: statuses.id,
                name: statuses.name,
            },
            items: {
                id: items.id,
                name: items.name,
            },
            organizations: {
                acronym: organizations.acronym,
                name: organizations.name,
            },
            locations: {
                state: locations.state,
                name: locations.name,
            },
            websites: {
                name: websites.name,
                url: websites.url,
            },
        };
    }

    async findAll(filters?: TenderListFilters): Promise<TenderInfoWithNames[]> {
        const conditions = [eq(tenderInfos.deleteStatus, "0")];

        if (filters?.unallocated) {
            conditions.push(isNull(tenderInfos.teamMember), eq(tenderInfos.status, 1));
        } else if (filters?.statusIds?.length) {
            conditions.push(inArray(tenderInfos.status, filters.statusIds));
        }

        const rows = await this.db
            .select(this.getTenderBaseSelect())
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(websites, eq(websites.id, tenderInfos.website))
            .where(and(...conditions));

        return rows.map((row) =>
            this.mapJoinedRow({
                tenderInfos: row.tenderInfos,
                users: row.users,
                statuses: row.statuses,
                items: row.items,
                organizations: row.organizations,
                locations: row.locations,
                websites: row.websites
            })
        );
    }

    async findById(id: number): Promise<TenderInfoWithNames | null> {
        const rows = await this.db
            .select(this.getTenderBaseSelect())
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(websites, eq(websites.id, tenderInfos.website))
            .where(eq(tenderInfos.id, id))
            .limit(1);

        const row = rows[0];
        if (!row) return null;

        return this.mapJoinedRow({
            tenderInfos: row.tenderInfos,
            users: row.users,
            statuses: row.statuses,
            items: row.items,
            organizations: row.organizations,
            locations: row.locations,
            websites: row.websites
        });
    }

    async create(data: NewTenderInfo): Promise<TenderInfo> {
        const rows = await this.db.insert(tenderInfos).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewTenderInfo>): Promise<TenderInfo> {
        const rows = await this.db
            .update(tenderInfos)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(tenderInfos.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(tenderInfos).where(eq(tenderInfos.id, id)).returning();
        if (!result[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
    }
}
