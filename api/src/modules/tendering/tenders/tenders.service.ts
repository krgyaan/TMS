import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tenderInfos, type TenderInfo, type NewTenderInfo } from '../../../db/tenders.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';

type TenderListFilters = {
    statusIds?: number[];
    unallocated?: boolean; // team_member IS NULL
};

type TenderInfoWithNames = TenderInfo & {
    organizationName: string | null;
    teamMemberName: string | null;
    statusName: string | null;
};

@Injectable()
export class TenderInfosService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapJoinedRow = (row: {
        tenderInfos: TenderInfo;
        users: { name: string } | null;
        statuses: { name: string } | null;
    }): TenderInfoWithNames => {
        const t = row.tenderInfos;
        return {
            ...t,
            organizationName: (t as any).organisation ?? null, // alias the column to what the grid expects
            teamMemberName: row.users?.name ?? null,
            statusName: row.statuses?.name ?? null,
        };
    };

    async findAll(filters?: TenderListFilters): Promise<TenderInfoWithNames[]> {
        const conditions: any[] = [];

        if (filters?.unallocated) {
            conditions.push(isNull(tenderInfos.teamMember));
        } else if (filters?.statusIds && filters.statusIds.length > 0) {
            conditions.push(inArray(tenderInfos.status, filters.statusIds));
        }

        const query = this.db
            .select()
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        const rows = conditions.length
            ? await query.where(and(...conditions))
            : await query;

        // The shape of rows is: { tender_infos: ..., users: ..., statuses: ... }, not the camelCased keys expected by mapJoinedRow.
        // So, we need to convert snake_case DB row properties to fit the mapJoinedRow expected argument.
        // Change keys from 'tender_infos' to 'tenderInfos', etc.

        return rows.map((row: any) =>
            this.mapJoinedRow({
                tenderInfos: row.tender_infos,
                users: row.users,
                statuses: row.statuses,
            })
        );
    }

    async findById(id: number): Promise<TenderInfoWithNames | null> {
        const rows = await this.db
            .select()
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(eq(tenderInfos.id, id))
            .limit(1);

        const row = rows[0];
        if (!row) return null;
        // The shape of rows is: { tender_infos: ..., users: ..., statuses: ... }
        // but mapJoinedRow expects { tenderInfos, users, statuses }
        return this.mapJoinedRow({
            tenderInfos: row.tender_infos,
            users: row.users,
            statuses: row.statuses,
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
