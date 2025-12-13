import { Inject, Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    tenderStatusHistory,
    type NewTenderStatusHistory,
} from '@db/schemas/tendering/tender-status-history.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { alias } from 'drizzle-orm/pg-core';

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

    /**
     * Track status change - helper method for easy status tracking
     */
    async trackStatusChange(
        tenderId: number,
        newStatus: number,
        changedBy: number,
        prevStatus?: number | null,
        comment?: string | null
    ): Promise<void> {
        await this.create({
            tenderId,
            prevStatus: prevStatus ?? null,
            newStatus,
            comment: comment ?? null,
            changedBy,
        });
    }

    /**
     * Optimized findByTenderId - fixed N+1 query issue using proper aliases
     */
    async findByTenderId(
        tenderId: number,
    ): Promise<TenderStatusHistoryWithNames[]> {
        // Use proper aliases for multiple joins on same table
        const prevStatusAlias = alias(statuses, 'prev_status');
        const newStatusAlias = alias(statuses, 'new_status');
        const userAlias = alias(users, 'changed_by_user');

        const rows = await this.db
            .select({
                id: tenderStatusHistory.id,
                tenderId: tenderStatusHistory.tenderId,
                prevStatus: tenderStatusHistory.prevStatus,
                newStatus: tenderStatusHistory.newStatus,
                comment: tenderStatusHistory.comment,
                changedBy: tenderStatusHistory.changedBy,
                createdAt: tenderStatusHistory.createdAt,
                prevStatusName: prevStatusAlias.name,
                newStatusName: newStatusAlias.name,
                changedByName: userAlias.name,
                changedByUsername: userAlias.username,
            })
            .from(tenderStatusHistory)
            .leftJoin(
                prevStatusAlias,
                eq(tenderStatusHistory.prevStatus, prevStatusAlias.id)
            )
            .innerJoin(
                newStatusAlias,
                eq(tenderStatusHistory.newStatus, newStatusAlias.id)
            )
            .innerJoin(
                userAlias,
                eq(tenderStatusHistory.changedBy, userAlias.id)
            )
            .where(eq(tenderStatusHistory.tenderId, tenderId))
            .orderBy(desc(tenderStatusHistory.createdAt));

        return rows.map((row) => ({
            id: row.id,
            tenderId: row.tenderId,
            prevStatus: row.prevStatus,
            prevStatusName: row.prevStatusName,
            newStatus: row.newStatus,
            newStatusName: row.newStatusName,
            comment: row.comment,
            changedBy: row.changedBy,
            changedByName: row.changedByName,
            changedByUsername: row.changedByUsername,
            createdAt: row.createdAt,
        }));
    }
}
