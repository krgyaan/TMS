import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leads, type NewLead, type Lead } from '@db/schemas/crm/leads.schema';
import { eq, sql, SQL } from 'drizzle-orm';
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

@Injectable()
export class LeadsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    private mapJoinedRow = (row: any): LeadWithNames => {
        return {
            id: row.id,
            companyName: row.company_name,
            name: row.name,
            designation: row.designation,
            phone: row.phone,
            email: row.email,
            address: row.address,
            country: row.country,
            state: row.state,
            type: row.type,
            industry: row.industry,
            team: row.team,
            bdPerson: row.bd_person,
            allocatedTe: row.allocated_te,
            pointsDiscussed: row.points_discussed,
            veResponsibility: row.ve_responsibility,
            mailFollowupCount: row.mail_followup_count,
            callFollowupCount: row.call_followup_count,
            visitFollowupCount: row.visit_followup_count,
            letterSentCount: row.letter_sent_count,
            whatsappFollowupCount: row.whatsapp_followup_count,
            enquiryReceivedAt: row.enquiry_received_at,
            lastMailSentAt: row.last_mail_sent_at,
            lastCallAt: row.last_call_at,
            lastVisitAt: row.last_visit_at,
            lastLetterSentAt: row.last_letter_sent_at,
            lastWhatsappSentAt: row.last_whatsapp_sent_at,
            leadPriority: row.lead_priority,
            recentFollowUp: row.recent_follow_up,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            industryName: row.industry_name,
            typeName: row.type_name,
            teamName: row.team_name,
            bdPersonName: row.bd_person_name,
            allocatedTeName: row.allocated_te_name,
        };
    };

    async findAll(filters?: LeadListFilters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];

        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    leads.company_name ILIKE ${searchStr} OR
                    leads.name ILIKE ${searchStr} OR
                    leads.email ILIKE ${searchStr} OR
                    leads.phone ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = conditions.length > 0
            ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
            : sql``;

        const countResults = await this.db.execute(
            sql`SELECT COUNT(*) as count FROM leads ${whereClause}`
        );

        const total = Number((countResults.rows as any[])[0]?.count || 0);

        let orderByClause = sql`ORDER BY leads.created_at DESC`;

        if (filters?.sortBy) {
            const direction = filters.sortOrder === 'desc' ? sql`DESC` : sql`ASC`;
            switch (filters.sortBy) {
                case 'companyName':
                    orderByClause = sql`ORDER BY leads.company_name ${direction}`;
                    break;
                case 'name':
                    orderByClause = sql`ORDER BY leads.name ${direction}`;
                    break;
                case 'email':
                    orderByClause = sql`ORDER BY leads.email ${direction}`;
                    break;
                case 'createdAt':
                    orderByClause = sql`ORDER BY leads.created_at ${direction}`;
                    break;
                default:
                    orderByClause = sql`ORDER BY leads.created_at DESC`;
            }
        }

        const results = await this.db.execute(sql`
            SELECT 
                leads.*,
                lead_industries.name        AS industry_name,
                lead_types.name             AS type_name,
                teams.name                  AS team_name,
                bd_user.name                AS bd_person_name,
                te_user.name                AS allocated_te_name
            FROM leads
            LEFT JOIN lead_industries
                ON lead_industries.id = CAST(leads.industry AS BIGINT)
            LEFT JOIN lead_types
                ON lead_types.id = CAST(leads.type AS BIGINT)
            LEFT JOIN teams
                ON teams.id = CAST(leads.team AS BIGINT)
            LEFT JOIN users bd_user
                ON bd_user.id = leads.bd_person
            LEFT JOIN users te_user
                ON te_user.id = leads.allocated_te
            ${whereClause}
            ${orderByClause}
            LIMIT ${limit} OFFSET ${offset}
        `);

        const rows = results.rows as any[];
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
        const results = await this.db.execute(sql`
            SELECT 
                leads.*,
                lead_industries.name        AS industry_name,
                lead_types.name             AS type_name,
                teams.name                  AS team_name,
                bd_user.name                AS bd_person_name,
                te_user.name                AS allocated_te_name
            FROM leads
            LEFT JOIN lead_industries
                ON lead_industries.id = CAST(leads.industry AS BIGINT)
            LEFT JOIN lead_types
                ON lead_types.id = CAST(leads.type AS BIGINT)
            LEFT JOIN teams
                ON teams.id = CAST(leads.team AS BIGINT)
            LEFT JOIN users bd_user
                ON bd_user.id = leads.bd_person
            LEFT JOIN users te_user
                ON te_user.id = leads.allocated_te
            WHERE leads.id = ${id}
            LIMIT 1
        `);

        const rows = results.rows as any[];

        if (!rows[0]) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return this.mapJoinedRow(rows[0]);
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
        await this.findById(id);

        const [updated] = await this.db
            .update(leads)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(leads.id, id))
            .returning();

        if (!updated) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        return updated;
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);

        await this.db
            .delete(leads)
            .where(eq(leads.id, id));
    }
}