import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { privateQuotes } from '@db/schemas/crm/private-quotes.schema';
import { eq, desc, like, or, and, sql, type SQL } from 'drizzle-orm';
import type { CreatePrivateQuoteDto, UpdatePrivateQuoteDto, PrivateQuoteListDto } from './dto/leads-quotation.dto';

export type PrivateQuoteListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    enquiryId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class LeadsQuotationService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    async findAll(filters?: PrivateQuoteListFilters) {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];

        if (filters?.search) {
            conditions.push(
                or(
                    like(privateQuotes.oemName, `%${filters.search}%`),
                    like(privateQuotes.contacts, `%${filters.search}%`),
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

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, countResult] = await Promise.all([
            this.db
                .select()
                .from(privateQuotes)
                .where(where)
                .offset(offset)
                .limit(limit)
                .orderBy(desc(privateQuotes.createdAt)),
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
        const [quote] = await this.db
            .select()
            .from(privateQuotes)
            .where(eq(privateQuotes.id, id))
            .limit(1);

        if (!quote) throw new NotFoundException(`Private quote with ID ${id} not found`);
        return quote;
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
        await this.findOne(id);

        const [quote] = await this.db
            .update(privateQuotes)
            .set({
                quoteSubmissionDatetime: data.quoteSubmissionDatetime != null ? new Date(data.quoteSubmissionDatetime) : undefined,
                submittedDocuments: data.submittedDocuments,
                contacts: data.contacts,
                missedReason: data.missedReason,
                oemName: data.oemName,
                preventRepeat: data.preventRepeat,
                tmsImprovement: data.tmsImprovement,
                status: data.status,
                updatedAt: new Date(),
            })
            .where(eq(privateQuotes.id, id))
            .returning();

        return quote;
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.db
            .delete(privateQuotes)
            .where(eq(privateQuotes.id, id));
    }
}
