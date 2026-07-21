import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leads, type NewLead, type Lead } from '@db/schemas/crm/leads.schema';
import { leadFollowups } from '@db/schemas/crm/lead-followups.schema';
import { leadIndustries } from '@db/schemas/master/lead-industries.schema';
import { leadTypes } from '@db/schemas/crm/lead-types.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { users } from '@db/schemas/auth/users.schema';
import { and, asc, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CreateLeadDto, UpdateLeadDto, AllocateLeadDto, DeleteLeadDto } from './dto/lead.dto';

export type LeadListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    priority?: string;
    status?: string;
    team?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type LeadWithNames = Lead & {
    industryName?: string | null;
    typeName?: string | null;
    teamName?: string | null;
    bdPersonName?: string | null;
    allocatedTeName?: string | null;
    allocatedByName?: string | null;
    nextFollowupDate?: string | null;
};

const bdUser = alias(users, 'bd_user');
const teUser = alias(users, 'te_user');
const allocatedByUser = alias(users, 'allocated_by_user');

@Injectable()
export class LeadsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    // ─── Private Helpers ──────────────────────────────────────────────

    /**
     * Creates the subquery for the latest followup per lead.
     * This is reused in count and data queries.
     */
    private getLatestFollowupSubquery() {
        return this.db
            .selectDistinctOn([leadFollowups.leadId], {
                leadId: leadFollowups.leadId,
                nextFollowupDate: leadFollowups.nextFollowupDate,
            })
            .from(leadFollowups)
            .where(isNotNull(leadFollowups.nextFollowupDate))
            .orderBy(
                leadFollowups.leadId,
                desc(leadFollowups.createdAt),
                desc(leadFollowups.id),
            )
            .as('latest_followup');
    }

    // ─── Public Methods ───────────────────────────────────────────────

    async findAll(filters?: LeadListFilters): Promise<{
        data: LeadWithNames[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const latestFollowupSubquery = this.getLatestFollowupSubquery();
        const conditions: SQL[] = [];

        // 1. Disqualified Filter
        if (filters?.status === 'disqualified') {
            conditions.push(eq(leads.isDeleted, true));
        } else {
            conditions.push(eq(leads.isDeleted, false));
        }

        // 2. Search Filter
        if (filters?.search) {
            conditions.push(
                or(
                    ilike(leads.companyName, `%${filters.search}%`),
                    ilike(leads.name, `%${filters.search}%`),
                    ilike(leads.email, `%${filters.search}%`),
                    ilike(leads.phone, `%${filters.search}%`),
                ) as SQL
            );
        }

        // 3. Priority Filter
        if (filters?.priority) {
            conditions.push(eq(leads.leadPriority, filters.priority));
        }

        // 4. Team Filter (via name)
        if (filters?.team) {
            conditions.push(eq(teams.name, filters.team));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // ── Count Query ───────────────────────────────────────────────
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leads.team}, '')::BIGINT`))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        // ── Data Query ────────────────────────────────────────────────
        const sortFn = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: SQL<unknown>;

        switch (filters?.sortBy) {
            case 'companyName': orderByClause = sortFn(leads.companyName); break;
            case 'name':        orderByClause = sortFn(leads.name); break;
            case 'email':       orderByClause = sortFn(leads.email); break;
            case 'createdAt':   orderByClause = sortFn(leads.createdAt); break;
            default:            orderByClause = desc(leads.createdAt);
        }

        const rows = await this.db
            .select({
                leads,
                industryName: leadIndustries.name,
                typeName: leadTypes.name,
                teamName: teams.name,
                bdPersonName: bdUser.name,
                allocatedTeName: teUser.name,
                allocatedByName: allocatedByUser.name,
                nextFollowupDate: latestFollowupSubquery.nextFollowupDate, // Qualified from subquery
            })
            .from(leads)
            .leftJoin(leadIndustries, eq(leadIndustries.id, sql`NULLIF(${leads.industry}, '')::BIGINT`))
            .leftJoin(leadTypes, eq(leadTypes.id, sql`NULLIF(${leads.type}, '')::BIGINT`))
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leads.team}, '')::BIGINT`))
            .leftJoin(bdUser, eq(bdUser.id, leads.bdPerson))
            .leftJoin(teUser, eq(teUser.id, leads.allocatedTe))
            .leftJoin(allocatedByUser, eq(allocatedByUser.id, leads.allocatedBy))
            .leftJoin(latestFollowupSubquery, eq(latestFollowupSubquery.leadId, leads.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            data: rows.map(row => ({
                ...row.leads,
                industryName: row.industryName ?? null,
                typeName: row.typeName ?? null,
                teamName: row.teamName ?? null,
                bdPersonName: row.bdPersonName ?? null,
                allocatedTeName: row.allocatedTeName ?? null,
                allocatedByName: row.allocatedByName ?? null,
                nextFollowupDate: row.nextFollowupDate ? row.nextFollowupDate.toISOString() : null,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: number): Promise<LeadWithNames> {
        const latestFollowupSubquery = this.getLatestFollowupSubquery();
        
        const [row] = await this.db
            .select({
                leads,
                industryName: leadIndustries.name,
                typeName: leadTypes.name,
                teamName: teams.name,
                bdPersonName: bdUser.name,
                allocatedTeName: teUser.name,
                allocatedByName: allocatedByUser.name,
                nextFollowupDate: latestFollowupSubquery.nextFollowupDate,
            })
            .from(leads)
            .leftJoin(leadIndustries, eq(leadIndustries.id, sql`NULLIF(${leads.industry}, '')::BIGINT`))
            .leftJoin(leadTypes, eq(leadTypes.id, sql`NULLIF(${leads.type}, '')::BIGINT`))
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leads.team}, '')::BIGINT`))
            .leftJoin(bdUser, eq(bdUser.id, leads.bdPerson))
            .leftJoin(teUser, eq(teUser.id, leads.allocatedTe))
            .leftJoin(allocatedByUser, eq(allocatedByUser.id, leads.allocatedBy))
            .leftJoin(latestFollowupSubquery, eq(latestFollowupSubquery.leadId, leads.id))
            .where(eq(leads.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Lead with ID ${id} not found`);
        
        return {
            ...row.leads,
            industryName: row.industryName ?? null,
            typeName: row.typeName ?? null,
            teamName: row.teamName ?? null,
            bdPersonName: row.bdPersonName ?? null,
            allocatedTeName: row.allocatedTeName ?? null,
            allocatedByName: row.allocatedByName ?? null,
            nextFollowupDate: row.nextFollowupDate ? row.nextFollowupDate.toISOString() : null,
        };
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
        const [updated] = await this.db
            .update(leads)
            .set({ ...data as Partial<NewLead>, updatedAt: new Date() })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead with ID ${id} not found`);
        return updated;
    }

    async allocate(id: number, data: AllocateLeadDto, allocatedBy: number): Promise<Lead> {
        const [updated] = await this.db
            .update(leads)
            .set({
                allocatedTe: data.allocatedTe,
                allocationNotes: data.allocationNotes ?? null,
                allocatedBy: allocatedBy,
                allocatedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead with ID ${id} not found`);
        return updated;
    }

    async delete(id: number, data?: DeleteLeadDto): Promise<void> {
        await this.db
            .update(leads)
            .set({
                isDeleted: true,
                deleteReason: data?.reason ?? null,
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id));
    }
}