import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leads, type NewLead, type Lead } from '@db/schemas/crm/leads.schema';
import { leadIndustries } from '@db/schemas/master/lead-industries.schema';
import { leadTypes } from '@db/schemas/crm/lead-types.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { users } from '@db/schemas/auth/users.schema';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CreateLeadDto, UpdateLeadDto, AllocateLeadDto } from './dto/lead.dto';

export type LeadListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type LeadWithNames = Lead & {
    industryName?: string | null;
    typeName?: string | null;
    teamName?: string | null;
    bdPersonName?: string | null;
    allocatedTeName?: string | null;
};

const bdUser = alias(users, 'bd_user');
const teUser = alias(users, 'te_user');

@Injectable()
export class LeadsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    // ─── Private Helpers ──────────────────────────────────────────────

    private getLeadBaseSelect() {
        return {
            leads,
            industryName: leadIndustries.name,
            typeName: leadTypes.name,
            teamName: teams.name,
            bdPersonName: bdUser.name,
            allocatedTeName: teUser.name,
        };
    }

    private getBaseQueryBuilder() {
        return this.db
            .select(this.getLeadBaseSelect())
            .from(leads)
            .leftJoin(leadIndustries, eq(leadIndustries.id, sql`CAST(${leads.industry} AS BIGINT)`))
            .leftJoin(leadTypes, eq(leadTypes.id, sql`CAST(${leads.type} AS BIGINT)`))
            .leftJoin(teams, eq(teams.id, sql`CAST(${leads.team} AS BIGINT)`))
            .leftJoin(bdUser, eq(bdUser.id, leads.bdPerson))
            .leftJoin(teUser, eq(teUser.id, leads.allocatedTe));
    }

    private mapJoinedRow = (row: {
        leads: typeof leads.$inferSelect;
        industryName: string | null;
        typeName: string | null;
        teamName: string | null;
        bdPersonName: string | null;
        allocatedTeName: string | null;
    }): LeadWithNames => ({
        ...row.leads,
        industryName: row.industryName ?? null,
        typeName: row.typeName ?? null,
        teamName: row.teamName ?? null,
        bdPersonName: row.bdPersonName ?? null,
        allocatedTeName: row.allocatedTeName ?? null,
    });

    // ─── Public Methods ───────────────────────────────────────────────

    async findAll(filters?: LeadListFilters): Promise<{
        data: LeadWithNames[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];

        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${leads.companyName} ILIKE ${searchStr} OR
                    ${leads.name} ILIKE ${searchStr} OR
                    ${leads.email} ILIKE ${searchStr} OR
                    ${leads.phone} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const sortFn = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: SQL<unknown>;

        switch (filters?.sortBy) {
            case 'companyName': orderByClause = sortFn(leads.companyName); break;
            case 'name':        orderByClause = sortFn(leads.name); break;
            case 'email':       orderByClause = sortFn(leads.email); break;
            case 'createdAt':   orderByClause = sortFn(leads.createdAt); break;
            default:            orderByClause = desc(leads.createdAt);
        }

        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            data: rows.map(this.mapJoinedRow),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: number): Promise<LeadWithNames> {
        const rows = await this.getBaseQueryBuilder()
            .where(eq(leads.id, id))
            .limit(1);

        if (!rows[0]) throw new NotFoundException(`Lead with ID ${id} not found`);
        return this.mapJoinedRow(rows[0]);
    }

    async exists(id: number): Promise<boolean> {
        const [result] = await this.db
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.id, id))
            .limit(1);
        return !!result;
    }

    async create(data: CreateLeadDto, createdBy: number): Promise<Lead> {
        const [newLead] = await this.db
            .insert(leads)
            .values({
                ...data as NewLead,
                bdPerson: createdBy,
                leadPriority: data.leadPriority || 'Cold',
            })
            .returning();
        return newLead;
    }

    async update(id: number, data: UpdateLeadDto): Promise<Lead> {
        await this.findById(id);

        const [updated] = await this.db
            .update(leads)
            .set({ ...data as Partial<NewLead>, updatedAt: new Date() })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead with ID ${id} not found`);
        return updated;
    }

    // ─── NEW: Allocate TE ─────────────────────────────────────────────

    async allocate(id: number, data: AllocateLeadDto): Promise<Lead> {
        await this.findById(id);

        const [updated] = await this.db
            .update(leads)
            .set({
                allocatedTe: data.allocatedTe,
                allocationNotes: data.allocationNotes ?? null,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead with ID ${id} not found`);
        return updated;
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);
        await this.db.delete(leads).where(eq(leads.id, id));
    }
}