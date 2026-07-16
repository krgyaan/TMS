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
import type { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

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

// Alias users table for the two different joins
// Drizzle requires aliased table references when joining the same table twice
const bdUser = alias(users, 'bd_user');
const teUser = alias(users, 'te_user');

@Injectable()
export class LeadsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Defines the SELECT shape for the base query.
     * Mirrors getTenderBaseSelect() in TenderInfosService.
     */
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

    /**
     * Returns a pre-joined query builder ready for .where(), .orderBy(), etc.
     * Mirrors getBaseQueryBuilder() in TenderInfosService.
     */
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

    /**
     * Maps a joined row returned by the query builder into a typed LeadWithNames object.
     * Mirrors mapJoinedRow() in TenderInfosService.
     */
    private mapJoinedRow = (row: {
        leads: typeof leads.$inferSelect;
        industryName: string | null;
        typeName: string | null;
        teamName: string | null;
        bdPersonName: string | null;
        allocatedTeName: string | null;
    }): LeadWithNames => {
        return {
            ...row.leads,
            industryName: row.industryName ?? null,
            typeName: row.typeName ?? null,
            teamName: row.teamName ?? null,
            bdPersonName: row.bdPersonName ?? null,
            allocatedTeName: row.allocatedTeName ?? null,
        };
    };

    // ─── Public Methods ───────────────────────────────────────────────────────

    async findAll(filters?: LeadListFilters): Promise<{
        data: LeadWithNames[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // 1. Build where conditions
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

        // 2. Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        // 3. Determine sort order
        const sortFn = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: SQL<unknown>;

        switch (filters?.sortBy) {
            case 'companyName':
                orderByClause = sortFn(leads.companyName);
                break;
            case 'name':
                orderByClause = sortFn(leads.name);
                break;
            case 'email':
                orderByClause = sortFn(leads.email);
                break;
            case 'createdAt':
                orderByClause = sortFn(leads.createdAt);
                break;
            default:
                orderByClause = desc(leads.createdAt);
        }

        // 4. Get paginated data
        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // 5. Map and return
        const data = rows.map(this.mapJoinedRow);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<LeadWithNames> {
        const rows = await this.getBaseQueryBuilder()
            .where(eq(leads.id, id))
            .limit(1);

        const row = rows[0];

        if (!row) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return this.mapJoinedRow(row);
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
            })
            .returning();

        return newLead;
    }

    async update(id: number, data: UpdateLeadDto): Promise<Lead> {
        // Validate existence first
        await this.findById(id);

        const [updated] = await this.db
            .update(leads)
            .set({ ...data as Partial<NewLead>, updatedAt: new Date() })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return updated;
    }

    async delete(id: number): Promise<void> {
        // Validate existence first
        await this.findById(id);

        await this.db
            .delete(leads)
            .where(eq(leads.id, id));
    }
}