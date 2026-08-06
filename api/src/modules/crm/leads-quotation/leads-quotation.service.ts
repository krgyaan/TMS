import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { privateQuotes } from '@db/schemas/crm/private-quotes.schema';
import { leadEnquiries } from '@db/schemas/crm/lead-enquiries.schema';
import { privateCostingSheets } from '@db/schemas/crm/private-costing-sheets.schema';
import { leadContacts } from '@db/schemas/crm/lead-contacts.schema';
import { enquiryResults } from '@db/schemas/crm/enquiry-result.schema';
import { eq, desc, like, or, and, sql, inArray, type SQL } from 'drizzle-orm';
import type { CreatePrivateQuoteDto, UpdatePrivateQuoteDto, PrivateQuoteListDto, ContactEntryDto } from './dto/leads-quotation.dto';

export type PrivateQuoteListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    enquiryId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

const quoteSelect = {
    id: privateQuotes.id,
    enquiryId: privateQuotes.enquiryId,
    quoteSubmissionDatetime: privateQuotes.quoteSubmissionDatetime,
    submittedDocuments: privateQuotes.submittedDocuments,
    contacts: privateQuotes.contacts,
    missedReason: privateQuotes.missedReason,
    oemName: privateQuotes.oemName,
    oemVendorId: privateQuotes.oemVendorId,
    preventRepeat: privateQuotes.preventRepeat,
    tmsImprovement: privateQuotes.tmsImprovement,
    status: privateQuotes.status,
    createdAt: privateQuotes.createdAt,
    updatedAt: privateQuotes.updatedAt,
    enquiryNumber: leadEnquiries.enquiryNumber,
    enqName: leadEnquiries.enqName,
    approxValue: leadEnquiries.approxValue,
    organizationName: leadEnquiries.organizationName,
    finalPrice: sql<string>`(
        SELECT pcs.final_price
        FROM ${privateCostingSheets} pcs
        WHERE pcs.enquiry_id = ${privateQuotes.enquiryId}
        ORDER BY pcs.updated_at DESC
        LIMIT 1
    )`.as('final_price'),
    approvedFinalPrice: sql<string>`(
        SELECT pcs.approved_final_price
        FROM ${privateCostingSheets} pcs
        WHERE pcs.enquiry_id = ${privateQuotes.enquiryId}
        ORDER BY pcs.updated_at DESC
        LIMIT 1
    )`.as('approved_final_price'),
    sheetUrl: sql<string>`(
        SELECT pcs.sheet_url
        FROM ${privateCostingSheets} pcs
        WHERE pcs.enquiry_id = ${privateQuotes.enquiryId}
        ORDER BY pcs.updated_at DESC
        LIMIT 1
    )`.as('sheet_url'),
};

const quoteBaseQuery = (db: DbInstance) =>
    db
        .select(quoteSelect)
        .from(privateQuotes)
        .leftJoin(leadEnquiries, eq(privateQuotes.enquiryId, leadEnquiries.id));

function buildWhere(filters?: PrivateQuoteListFilters): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters?.search) {
        conditions.push(
            or(
                like(privateQuotes.oemName, `%${filters.search}%`),
                like(privateQuotes.contacts, `%${filters.search}%`),
                like(leadEnquiries.enquiryNumber, `%${filters.search}%`),
                like(leadEnquiries.enqName, `%${filters.search}%`),
            ) as SQL,
        );
    }

    if (filters?.status) {
        const statuses = filters.status.split(',');
        if (statuses.length === 1) {
            conditions.push(eq(privateQuotes.status, filters.status));
        } else {
            conditions.push(sql`${privateQuotes.status} IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})`);
        }
    }

    if (filters?.enquiryId) {
        conditions.push(eq(privateQuotes.enquiryId, filters.enquiryId));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildOrderBy(filters?: PrivateQuoteListFilters) {
    const sortBy = filters?.sortBy;
    const sortOrder = filters?.sortOrder ?? 'desc';

    if (!sortBy) {
        return [desc(privateQuotes.createdAt)];
    }

    const allowedSorts: Record<string, SQL> = {
        createdAt: sortOrder === 'asc' ? sql`created_at ASC` : sql`created_at DESC`,
        enquiryNumber: sortOrder === 'asc' ? sql`enquiry_number ASC` : sql`enquiry_number DESC`,
        enqName: sortOrder === 'asc' ? sql`enq_name ASC` : sql`enq_name DESC`,
        approxValue: sortOrder === 'asc' ? sql`approx_value ASC` : sql`approx_value DESC`,
        status: sortOrder === 'asc' ? sql`status ASC` : sql`status DESC`,
    };

    const order = allowedSorts[sortBy];
    return order ? [order] : [desc(privateQuotes.createdAt)];
}

@Injectable()
export class LeadsQuotationService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    async findAll(filters?: PrivateQuoteListFilters) {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;

        const where = buildWhere(filters);
        const orderBy = buildOrderBy(filters);

        const [data, countResult] = await Promise.all([
            quoteBaseQuery(this.db)
                .where(where)
                .offset(offset)
                .limit(limit)
                .orderBy(...orderBy),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(privateQuotes)
                .where(where),
        ]);

        const total = Number(countResult[0]?.count ?? 0);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: number) {
        const [quote] = await quoteBaseQuery(this.db)
            .where(eq(privateQuotes.id, id))
            .limit(1);

        if (!quote) throw new NotFoundException(`Private quote with ID ${id} not found`);
        return this.resolveContacts(quote);
    }

    async findByLeadId(leadId: number) {
        const rows = await this.db
            .select(quoteSelect)
            .from(privateQuotes)
            .innerJoin(leadEnquiries, eq(privateQuotes.enquiryId, leadEnquiries.id))
            .where(eq(leadEnquiries.leadId, leadId))
            .orderBy(desc(privateQuotes.createdAt));

        return Promise.all(rows.map(r => this.resolveContacts(r)));
    }

    private async resolveContacts(quote: any) {
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

        return { ...quote, contacts };
    }

    async create(data: CreatePrivateQuoteDto) {
        const [quote] = await this.db
            .insert(privateQuotes)
            .values({
                enquiryId: data.enquiryId,
                status: data.status ?? 'Submission Pending',
            })
            .returning();

        return quote;
    }

    async update(id: number, data: UpdatePrivateQuoteDto) {
        const existingQuote = await this.findOne(id);

        let contactsStr: string | undefined = undefined;

        if (data.contacts) {
            const createdContacts = await Promise.all(
                data.contacts.map((c: ContactEntryDto) =>
                    this.db
                        .insert(leadContacts)
                        .values({
                            leadId: id,
                            source: 'quotation',
                            name: c.name,
                            designation: c.designation ?? null,
                            phone: c.phone ?? null,
                            email: c.email ?? null,
                        })
                        .returning({ id: leadContacts.id }),
                ),
            );
            contactsStr = createdContacts.map(r => r[0]?.id).filter(Boolean).join(',');
        }

        const updateValues: Record<string, any> = {
            quoteSubmissionDatetime:
                data.quoteSubmissionDatetime != null
                    ? new Date(data.quoteSubmissionDatetime)
                    : undefined,
            submittedDocuments: data.submittedDocuments,
            contacts: contactsStr,
            missedReason: data.missedReason,
            oemName: data.oemName,
            oemVendorId: data.oemVendorId,
            preventRepeat: data.preventRepeat,
            tmsImprovement: data.tmsImprovement,
            status: data.status,
            updatedAt: new Date(),
        };

        Object.keys(updateValues).forEach(k => {
            if (updateValues[k] === undefined) delete updateValues[k];
        });

        return await this.db.transaction(async (tx) => {
            const [quote] = await tx
                .update(privateQuotes)
                .set(updateValues)
                .where(eq(privateQuotes.id, id))
                .returning();

            if (data.status === 'Quotation Submitted' || data.status === 'Quotation Dropped') {
                await tx
                    .update(leadEnquiries)
                    .set({ status: data.status, updatedAt: new Date() })
                    .where(eq(leadEnquiries.id, existingQuote.enquiryId));
            }

            if (data.status === 'Quotation Submitted') {
                const [existing] = await tx
                    .select({ id: enquiryResults.id })
                    .from(enquiryResults)
                    .where(eq(enquiryResults.enquiryId, existingQuote.enquiryId))
                    .limit(1);

                if (!existing) {
                    await tx
                        .insert(enquiryResults)
                        .values({
                            enquiryId: existingQuote.enquiryId,
                            status: 'Quotation Submitted',
                        });
                }
            }

            return quote;
        });
    }

    async appendQuoteDocs(id: number, newFilenames: string[]): Promise<void> {
        const [existing] = await this.db
            .select({ docs: privateQuotes.submittedDocuments })
            .from(privateQuotes)
            .where(eq(privateQuotes.id, id))
            .limit(1);

        if (!existing) throw new NotFoundException(`Private quote with ID ${id} not found`);

        const existingDocs = existing.docs ? existing.docs.split(',').filter(Boolean) : [];
        const allDocs = [...existingDocs, ...newFilenames];

        await this.db
            .update(privateQuotes)
            .set({ submittedDocuments: allDocs.join(','), updatedAt: new Date() })
            .where(eq(privateQuotes.id, id));
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.db
            .delete(privateQuotes)
            .where(eq(privateQuotes.id, id));
    }
}
