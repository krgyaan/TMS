import { Inject, Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    tenderStatusHistory,
    type NewTenderStatusHistory,
} from '../../../db/tender-status-history.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';

export type TenderStatusHistoryWithNames = {
    id: number;
    tenderId: number;
    prevStatus: number | null;
    prevStatusName: string | null;
    newStatus: number;
    newStatusName: string | null;
    comment: string | null;
    changedBy: number;
    changedByName: string | null;
    changedByUsername: string | null;
    createdAt: Date;
};

@Injectable()
export class TenderStatusHistoryService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async create(data: NewTenderStatusHistory) {
        const rows = await this.db
            .insert(tenderStatusHistory)
            .values(data)
            .returning();
        return rows[0];
    }

    async findByTenderId(
        tenderId: number,
    ): Promise<TenderStatusHistoryWithNames[]> {
        const rows = await this.db
            .select({
                history: tenderStatusHistory,
                prevStatusName: statuses.name,
                newStatusData: {
                    id: statuses.id,
                    name: statuses.name,
                },
                userData: {
                    name: users.name,
                    username: users.username,
                },
            })
            .from(tenderStatusHistory)
            .leftJoin(
                statuses,
                eq(tenderStatusHistory.prevStatus, statuses.id),
            )
            .innerJoin(
                statuses as any,
                eq(tenderStatusHistory.newStatus, statuses.id),
            )
            .innerJoin(users, eq(tenderStatusHistory.changedBy, users.id))
            .where(eq(tenderStatusHistory.tenderId, tenderId))
            .orderBy(desc(tenderStatusHistory.createdAt));

        const results = await this.db
            .select()
            .from(tenderStatusHistory)
            .where(eq(tenderStatusHistory.tenderId, tenderId))
            .orderBy(desc(tenderStatusHistory.createdAt));

        // Fetch related data
        const enriched: TenderStatusHistoryWithNames[] = [];

        for (const record of results) {
            let prevStatusName: string | null = null;
            let newStatusName: string | null = null;
            let changedByName: string | null = null;
            let changedByUsername: string | null = null;

            if (record.prevStatus) {
                const prevStatusData = await this.db
                    .select()
                    .from(statuses)
                    .where(eq(statuses.id, record.prevStatus))
                    .limit(1);
                prevStatusName = prevStatusData[0]?.name ?? null;
            }

            const newStatusData = await this.db
                .select()
                .from(statuses)
                .where(eq(statuses.id, record.newStatus))
                .limit(1);
            newStatusName = newStatusData[0]?.name ?? null;

            const userData = await this.db
                .select()
                .from(users)
                .where(eq(users.id, record.changedBy))
                .limit(1);
            changedByName = userData[0]?.name ?? null;
            changedByUsername = userData[0]?.username ?? null;

            enriched.push({
                ...record,
                prevStatusName,
                newStatusName,
                changedByName,
                changedByUsername,
            });
        }

        return enriched;
    }
}
