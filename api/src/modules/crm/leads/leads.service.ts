import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leads, type NewLead, type Lead } from '@db/schemas/crm/leads.schema';
import { leadFollowups } from '@db/schemas/crm/lead-followups.schema';
import { happyCalling } from '@db/schemas/crm/happy-calling.schema';
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
    /** When true, happy_calling entries are merged into the list (Cold tab only). */
    includeHappyCalling?: boolean;
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

export type LeadListSource = 'lead' | 'happy_calling';

export type LeadListRow = LeadWithNames & {
    source: LeadListSource;
    happyCallingStatus?: string | null;
    cDId?: number | null;
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

    /**
     * Latest followup per happy calling entry.
     */
    private getLatestHappyCallingFollowupSubquery() {
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

    /**
     * Value used to order a combined list row. Dates are normalised to ISO
     * strings so leads (Date) and happy calling (Date) compare consistently.
     */
    private static toSortValue(value: unknown): string | null {
        if (value === null || value === undefined || value === '') return null;
        if (value instanceof Date) return value.toISOString();
        return String(value);
    }

    private static sortValueOf(row: LeadListRow, sortBy?: string): string | null {
        switch (sortBy) {
            case 'companyName': return LeadsService.toSortValue(row.companyName);
            case 'name':        return LeadsService.toSortValue(row.name);
            case 'email':       return LeadsService.toSortValue(row.email);
            case 'nextFollowupDate':
                return LeadsService.toSortValue(row.nextFollowupDate);
            case 'lastMailSentAt':
                return LeadsService.toSortValue(row.lastMailSentAt);
            case 'recentFollowUp':
            case 'status':
                return LeadsService.toSortValue(row.recentFollowUp ?? row.happyCallingStatus);
            case 'createdAt':
            default:            return LeadsService.toSortValue(row.createdAt);
        }
    }

    /**
     * Fetches every happy calling entry matching the search, already mapped onto
     * the lead list shape so both sources can be merged and paginated together.
     */
    private async fetchHappyCallingRows(search?: string): Promise<{ rows: LeadListRow[]; total: number }> {
        const conditions: SQL[] = [];
        const trimmed = search?.trim();
        if (trimmed) {
            conditions.push(
                or(
                    ilike(happyCalling.organization, `%${trimmed}%`),
                    ilike(happyCalling.name, `%${trimmed}%`),
                    ilike(happyCalling.designation, `%${trimmed}%`),
                    ilike(happyCalling.email, `%${trimmed}%`),
                    ilike(happyCalling.phone, `%${trimmed}%`),
                ) as SQL
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const latestFollowupSubquery = this.getLatestHappyCallingFollowupSubquery();

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(happyCalling)
                .where(whereClause),
            this.db
                .select({
                    happyCalling,
                    nextFollowupDate: latestFollowupSubquery.nextFollowupDate,
                    lastFollowupDate: latestFollowupSubquery.lastFollowupDate,
                })
                .from(happyCalling)
                .leftJoin(latestFollowupSubquery, eq(latestFollowupSubquery.happyCallingId, happyCalling.id))
                .where(whereClause),
        ]);

        const total = Number(countResult?.[0]?.count || 0);

        const mapped: LeadListRow[] = rows.map(row => {
            const entry = row.happyCalling;
            const nextFollowupDate = row.nextFollowupDate ?? null;
            const lastFollowupDate = row.lastFollowupDate ?? null;

            return {
                source: 'happy_calling',
                id: entry.id,
                cDId: entry.cDId ?? null,
                happyCallingStatus: entry.status ?? null,

                companyName: entry.organization ?? null,
                name: entry.name,
                designation: entry.designation ?? null,
                email: entry.email ?? null,
                phone: entry.phone ?? null,

                address: null,
                liveLocation: null,
                country: null,
                state: null,
                type: null,
                industry: null,
                team: null,
                bdPerson: null,
                allocatedTe: null,
                allocatedBy: null,
                allocationNotes: null,
                allocatedAt: null,
                pointsDiscussed: null,
                veResponsibility: null,

                mailFollowupCount: 0,
                callFollowupCount: 0,
                visitFollowupCount: 0,
                letterSentCount: 0,
                whatsappFollowupCount: 0,

                enquiryReceivedAt: null,
                lastMailSentAt: lastFollowupDate ?? null,
                lastCallAt: null,
                lastVisitAt: null,
                lastLetterSentAt: null,
                lastWhatsappSentAt: null,

                leadPriority: 'Cold',
                recentFollowUp: null,
                isDeleted: false,
                deleteReason: null,
                deletedAt: null,

                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,

                industryName: null,
                typeName: null,
                teamName: null,
                bdPersonName: null,
                allocatedTeName: null,
                allocatedByName: null,
                nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
            };
        });

        return { rows: mapped, total };
    }

    // ─── Public Methods ───────────────────────────────────────────────

    async findAll(filters?: LeadListFilters): Promise<{
        data: LeadListRow[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Happy calling entries are surfaced in the Cold tab only: they carry no
        // priority, no team and no soft-delete flag, so they are skipped whenever
        // one of those filters is active.
        const includeHappyCalling =
            !!filters?.includeHappyCalling &&
            filters?.status !== 'disqualified' &&
            !filters?.team &&
            (!filters?.priority || filters.priority === 'Cold');

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

        const leadsTotal = Number(countResult?.count || 0);

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

        const leadsQuery = this.db
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
            .orderBy(orderByClause);

        if (!includeHappyCalling) {
            const rows = await leadsQuery.limit(limit).offset(offset);

            return {
                data: rows.map(row => ({
                    ...row.leads,
                    source: 'lead' as const,
                    industryName: row.industryName ?? null,
                    typeName: row.typeName ?? null,
                    teamName: row.teamName ?? null,
                    bdPersonName: row.bdPersonName ?? null,
                    allocatedTeName: row.allocatedTeName ?? null,
                    allocatedByName: row.allocatedByName ?? null,
                    nextFollowupDate: row.nextFollowupDate ? row.nextFollowupDate.toISOString() : null,
                })),
                meta: { total: leadsTotal, page, limit, totalPages: Math.ceil(leadsTotal / limit) },
            };
        }

        // ── Combined list (leads + happy calling) ─────────────────────
        const [happyCalling, allLeadRows] = await Promise.all([
            this.fetchHappyCallingRows(filters?.search),
            leadsQuery,
        ]);

        const merged: LeadListRow[] = [
            ...allLeadRows.map(row => ({
                ...row.leads,
                source: 'lead' as const,
                industryName: row.industryName ?? null,
                typeName: row.typeName ?? null,
                teamName: row.teamName ?? null,
                bdPersonName: row.bdPersonName ?? null,
                allocatedTeName: row.allocatedTeName ?? null,
                allocatedByName: row.allocatedByName ?? null,
                nextFollowupDate: row.nextFollowupDate ? row.nextFollowupDate.toISOString() : null,
            })),
            ...happyCalling.rows,
        ];

        const sortBy = filters?.sortBy;
        // Without an explicit sortBy the list stays newest first, as before.
        const direction = sortBy ? (filters?.sortOrder === 'desc' ? -1 : 1) : -1;

        merged.sort((a, b) => {
            const left = LeadsService.sortValueOf(a, sortBy);
            const right = LeadsService.sortValueOf(b, sortBy);

            // Missing values always sink to the bottom.
            if (left === null && right === null) return 0;
            if (left === null) return 1;
            if (right === null) return -1;
            if (left === right) {
                return (LeadsService.toSortValue(b.createdAt) ?? '')
                    .localeCompare(LeadsService.toSortValue(a.createdAt) ?? '');
            }
            return left.localeCompare(right) * direction;
        });

        const total = leadsTotal + happyCalling.total;

        return {
            data: merged.slice(offset, offset + limit),
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