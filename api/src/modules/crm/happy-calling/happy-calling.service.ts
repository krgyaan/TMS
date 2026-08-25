import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, and, or, ilike, sql, isNotNull, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { happyCalling } from '@db/schemas/crm/happy-calling.schema';
import { leadFollowups } from '@db/schemas/crm/lead-followups.schema';
import { users } from '@db/schemas/auth/users.schema';
import type { CreateHappyCallingDto, UpdateHappyCallingDto } from './dto/happy-calling.dto';

export type HappyCallingListFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

@Injectable()
export class HappyCallingService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    private getLatestFollowupSubquery() {
        return this.db
            .selectDistinctOn([leadFollowups.happyCallingId], {
                happyCallingId: leadFollowups.happyCallingId,
                nextFollowupDate: leadFollowups.nextFollowupDate,
                lastFollowupDate: leadFollowups.createdAt,
            })
            .from(leadFollowups)
            .where(and(eq(leadFollowups.sourceType, 'happy_calling'), isNotNull(leadFollowups.happyCallingId)))
            .orderBy(leadFollowups.happyCallingId, desc(leadFollowups.createdAt), desc(leadFollowups.id))
            .as('latest_happy_followup');
    }

    async findAll(filters?: HappyCallingListFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        const latestFollowupSubquery = this.getLatestFollowupSubquery();

        const orderColumn =
            sortBy === 'name'
                ? happyCalling.name
                : sortBy === 'organization'
                  ? happyCalling.organization
                  : sortBy === 'designation'
                    ? happyCalling.designation
                    : sortBy === 'email'
                      ? happyCalling.email
                      : sortBy === 'phone'
                          ? happyCalling.phone
                        : sortBy === 'status'
                          ? happyCalling.status
                          : sortBy === 'broadcast'
                            ? happyCalling.broadcast
                            : sortBy === 'nextFollowupDate'
                              ? latestFollowupSubquery.nextFollowupDate
                              : sortBy === 'lastFollowupDate'
                                ? latestFollowupSubquery.lastFollowupDate
                                : happyCalling.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: (SQL | undefined)[] = [];
        if (search) {
            conditions.push(
                or(
                    ilike(happyCalling.organization, `%${search}%`),
                    ilike(happyCalling.name, `%${search}%`),
                    ilike(happyCalling.designation, `%${search}%`),
                    ilike(happyCalling.email, `%${search}%`),
                    ilike(happyCalling.phone, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(happyCalling)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(happyCalling)
                .leftJoin(users, eq(users.id, happyCalling.createdBy))
                .leftJoin(latestFollowupSubquery, eq(latestFollowupSubquery.happyCallingId, happyCalling.id))
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        const data = rows.map((row) => ({
            ...row.happy_calling,
            createdByName: row.users?.name ?? null,
            nextFollowupDate: row.latest_happy_followup?.nextFollowupDate ?? null,
            lastFollowupDate: row.latest_happy_followup?.lastFollowupDate ?? null,
        }));

        return {
            data,
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async findById(id: number) {
        const latestFollowupSubquery = this.getLatestFollowupSubquery();
        const [row] = await this.db
            .select()
            .from(happyCalling)
            .leftJoin(users, eq(users.id, happyCalling.createdBy))
            .leftJoin(latestFollowupSubquery, eq(latestFollowupSubquery.happyCallingId, happyCalling.id))
            .where(eq(happyCalling.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Happy calling entry with ID ${id} not found`);
        }

        return {
            ...row.happy_calling,
            createdByName: row.users?.name ?? null,
            nextFollowupDate: row.latest_happy_followup?.nextFollowupDate ?? null,
            lastFollowupDate: row.latest_happy_followup?.lastFollowupDate ?? null,
        };
    }

    async create(data: CreateHappyCallingDto, userId?: number) {
        const [inserted] = await this.db
            .insert(happyCalling)
            .values({
                cDId: data.cDId ?? null,
                organization: data.organization ?? null,
                name: data.name,
                designation: data.designation ?? null,
                email: data.email ?? null,
                phone: data.phone ?? null,
                status: data.status ?? null,
                broadcast: data.broadcast,
                details: data.details ?? null,
                createdBy: userId ?? null,
            })
            .returning({ id: happyCalling.id });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateHappyCallingDto) {
        const [existing] = await this.db
            .select()
            .from(happyCalling)
            .where(eq(happyCalling.id, id))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Happy calling entry with ID ${id} not found`);
        }

        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        if (data.cDId !== undefined) updateValues.cDId = data.cDId;
        if (data.organization !== undefined) updateValues.organization = data.organization;
        if (data.name !== undefined) updateValues.name = data.name;
        if (data.designation !== undefined) updateValues.designation = data.designation;
        if (data.email !== undefined) updateValues.email = data.email;
        if (data.phone !== undefined) updateValues.phone = data.phone;
        if (data.status !== undefined) updateValues.status = data.status ?? null;
        if (data.broadcast !== undefined) updateValues.broadcast = data.broadcast;
        if (data.details !== undefined) updateValues.details = data.details;

        await this.db
            .update(happyCalling)
            .set(updateValues)
            .where(eq(happyCalling.id, id));

        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(happyCalling)
            .where(eq(happyCalling.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Happy calling entry with ID ${id} not found`);
        }
    }
}