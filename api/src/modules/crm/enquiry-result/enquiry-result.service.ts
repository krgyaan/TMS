import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { enquiryResults } from '@db/schemas/crm/enquiry-result.schema';
import { leadEnquiries } from '@db/schemas/crm/lead-enquiries.schema';
import { items } from '@db/schemas/master/items.schema';
import { users } from '@db/schemas/auth/users.schema';
import { privateQuotes } from '@db/schemas/crm/private-quotes.schema';
import { privateCostingSheets } from '@db/schemas/crm/private-costing-sheets.schema';
import { eq, desc, and, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CreateEnquiryResultDto, UpdateEnquiryResultDto, EnquiryResultListDto } from './dto/enquiry-result.dto';

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
        return row;
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
}
