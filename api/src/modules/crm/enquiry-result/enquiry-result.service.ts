import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { enquiryResults } from '@db/schemas/crm/enquiry-result.schema';
import { leadEnquiries } from '@db/schemas/crm/lead-enquiries.schema';
import { leadContacts } from '@db/schemas/crm/lead-contacts.schema';
import { items } from '@db/schemas/master/items.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { users } from '@db/schemas/auth/users.schema';
import { privateQuotes } from '@db/schemas/crm/private-quotes.schema';
import { privateCostingSheets } from '@db/schemas/crm/private-costing-sheets.schema';
import { eq, desc, and, inArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { followUps } from '@db/schemas/shared/follow-ups.schema';
import { followUpPersons } from '@db/schemas/shared/follow-up-persons.schema';
import type { CreateEnquiryResultDto, UpdateEnquiryResultDto, EnquiryResultListDto, CreateFollowupDto } from './dto/enquiry-result.dto';

const createdByUser = alias(users, 'created_by_user');

const resultSelect = {
    id: enquiryResults.id,
    enquiryId: enquiryResults.enquiryId,
    technicallyQualified: enquiryResults.technicallyQualified,
    disqualificationReason: enquiryResults.disqualificationReason,
    qualifiedCount: enquiryResults.qualifiedCount,
    qualifiedParties: enquiryResults.qualifiedParties,
    result: enquiryResults.result,
    l1Price: enquiryResults.l1Price,
    l2Price: enquiryResults.l2Price,
    ourPrice: enquiryResults.ourPrice,
    uploadScreenshot: enquiryResults.uploadScreenshot,
    uploadDocuments: enquiryResults.uploadDocuments,
    status: enquiryResults.status,
    createdAt: enquiryResults.createdAt,
    updatedAt: enquiryResults.updatedAt,
    enquiryNumber: leadEnquiries.enquiryNumber,
    enqName: leadEnquiries.enqName,
    organizationName: leadEnquiries.organizationName,
    team: leadEnquiries.team,
    teamName: teams.name,
    createdByName: createdByUser.name,
    itemName: items.name,
    quoteSubmissionDatetime: sql<string>`(
        SELECT pq.quote_submission_datetime
        FROM ${privateQuotes} pq
        WHERE pq.enquiry_id = ${leadEnquiries.id}
        ORDER BY pq.created_at DESC
        LIMIT 1
    )`.as('quote_submission_datetime'),
    finalPrice: sql<string>`(
        SELECT pcs.final_price
        FROM ${privateCostingSheets} pcs
        WHERE pcs.enquiry_id = ${leadEnquiries.id}
        ORDER BY pcs.updated_at DESC
        LIMIT 1
    )`.as('final_price'),
    approvedFinalPrice: sql<string>`(
        SELECT pcs.approved_final_price
        FROM ${privateCostingSheets} pcs
        WHERE pcs.enquiry_id = ${leadEnquiries.id}
        ORDER BY pcs.updated_at DESC
        LIMIT 1
    )`.as('approved_final_price'),
};

const resultBaseQuery = (db: DbInstance) =>
    db
        .select(resultSelect)
        .from(enquiryResults)
        .leftJoin(leadEnquiries, eq(enquiryResults.enquiryId, leadEnquiries.id))
        .leftJoin(teams, eq(teams.id, sql`NULLIF(${leadEnquiries.team}, '')::BIGINT`))
        .leftJoin(items, eq(leadEnquiries.itemId, items.id))
        .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy));

@Injectable()
export class EnquiryResultService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    async findAll(filters?: EnquiryResultListDto) {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];
        if (filters?.search) {
            const searchPattern = `%${filters.search}%`;
            conditions.push(
                sql`(${leadEnquiries.enquiryNumber} ILIKE ${searchPattern}
                    OR ${leadEnquiries.enqName} ILIKE ${searchPattern}
                    OR ${createdByUser.name} ILIKE ${searchPattern}
                    OR ${items.name} ILIKE ${searchPattern})`,
            );
        }
        if (filters?.enquiryId) {
            conditions.push(eq(enquiryResults.enquiryId, filters.enquiryId));
        }
        if (filters?.status) {
            conditions.push(eq(enquiryResults.status, filters.status));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const orderBy = filters?.sortBy === 'createdAt' || !filters?.sortBy
            ? [desc(enquiryResults.createdAt)]
            : [desc(enquiryResults.createdAt)];

        const [data, countResult] = await Promise.all([
            resultBaseQuery(this.db)
                .where(where)
                .offset(offset)
                .limit(limit)
                .orderBy(...orderBy),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(enquiryResults)
                .where(where),
        ]);

        const total = Number(countResult[0]?.count ?? 0);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: number) {
        const [row] = await resultBaseQuery(this.db)
            .where(eq(enquiryResults.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Enquiry result with ID ${id} not found`);

        const quotation = await this.getQuotationForEnquiry(row.enquiryId);
        return { ...row, ...quotation };
    }

    private async getQuotationForEnquiry(enquiryId: number) {
        const [quote] = await this.db
            .select({ id: privateQuotes.id, contacts: privateQuotes.contacts })
            .from(privateQuotes)
            .where(eq(privateQuotes.enquiryId, enquiryId))
            .orderBy(desc(privateQuotes.createdAt))
            .limit(1);

        if (!quote) return { quotationId: null, contacts: [] as { name: string; designation: string | null; phone: string | null; email: string | null }[] };

        const contactIds = (quote.contacts || '')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(Number)
            .filter(n => !isNaN(n) && n > 0);

        const contacts = contactIds.length > 0
            ? await this.db
                .select({
                    name: leadContacts.name,
                    designation: leadContacts.designation,
                    phone: leadContacts.phone,
                    email: leadContacts.email,
                })
                .from(leadContacts)
                .where(inArray(leadContacts.id, contactIds))
            : [];

        return { quotationId: quote.id, contacts };
    }

    async create(data: CreateEnquiryResultDto) {
        const [row] = await this.db
            .insert(enquiryResults)
            .values({
                enquiryId: data.enquiryId,
                technicallyQualified: data.technicallyQualified ?? null,
                disqualificationReason: data.disqualificationReason ?? null,
                qualifiedCount: data.qualifiedCount ?? null,
                qualifiedParties: data.qualifiedParties ?? null,
                result: data.result ?? null,
                l1Price: data.l1Price ? String(data.l1Price) : null,
                l2Price: data.l2Price ? String(data.l2Price) : null,
                ourPrice: data.ourPrice ? String(data.ourPrice) : null,
                uploadScreenshot: data.uploadScreenshot ?? null,
                uploadDocuments: data.uploadDocuments ?? null,
                status: data.status ?? null,
            })
            .returning();

        return row;
    }

    async update(id: number, data: UpdateEnquiryResultDto) {
        await this.findOne(id);

        const updateValues: Record<string, any> = {
            technicallyQualified: data.technicallyQualified,
            disqualificationReason: data.disqualificationReason,
            qualifiedCount: data.qualifiedCount,
            qualifiedParties: data.qualifiedParties,
            result: data.result,
            l1Price: data.l1Price ? String(data.l1Price) : null,
            l2Price: data.l2Price ? String(data.l2Price) : null,
            ourPrice: data.ourPrice ? String(data.ourPrice) : null,
            uploadScreenshot: data.uploadScreenshot,
            uploadDocuments: data.uploadDocuments,
            status: data.status,
            updatedAt: new Date(),
        };

        Object.keys(updateValues).forEach(k => {
            if (updateValues[k] === undefined) delete updateValues[k];
        });

        const [row] = await this.db
            .update(enquiryResults)
            .set(updateValues)
            .where(eq(enquiryResults.id, id))
            .returning();

        return row;
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.db
            .delete(enquiryResults)
            .where(eq(enquiryResults.id, id));
    }

    async createFollowup(id: number, body: CreateFollowupDto, currentUserId: number) {
        const result = await this.findOne(id);

        const contacts = body.contacts.map(c => ({
            name: c.name,
            designation: c.designation ?? null,
            email: c.email ?? null,
            phone: c.phone ?? null,
            org: body.organisation_name ?? null,
            addedAt: new Date().toISOString(),
        }));

        const normalizeDateToISODate = (v?: string | null) => {
            if (!v) return null;
            const d = new Date(v);
            if (isNaN(d.getTime())) return null;
            return d.toISOString().split('T')[0];
        };

        const startFrom = normalizeDateToISODate(body.followup_start_date) ?? new Date().toISOString().split('T')[0];
        const frequency = body.frequency != null ? Number(body.frequency) : null;

        return this.db.transaction(async tx => {
            const [followUp] = await tx
                .insert(followUps)
                .values({
                    area: result.teamName || result.team || 'CRM',
                    partyName: body.organisation_name,
                    amount: result.finalPrice ? String(Number(result.finalPrice) || 0) : '0',
                    followupFor: 'Quotation',
                    assignedToId: currentUserId,
                    createdById: currentUserId,
                    assignmentStatus: 'initiated',
                    details: body.emailBody ?? null,
                    contacts,
                    frequency,
                    startFrom,
                    attachments: body.attachments ?? [],
                    followUpHistory: [],
                    reminderCount: 1,
                    emdId: null,
                    quotationId: result.quotationId ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                })
                .returning();

            if (contacts.length > 0) {
                await tx.insert(followUpPersons).values(
                    contacts.map(c => ({
                        followUpId: followUp.id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        organization: c.org || body.organisation_name,
                    }))
                );
            }

            return followUp;
        });
    }
}
