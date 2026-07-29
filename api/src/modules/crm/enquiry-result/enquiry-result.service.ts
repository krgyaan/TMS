import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { enquiryResults } from '@db/schemas/crm/enquiry-result.schema';
import { eq, desc, and, sql, type SQL } from 'drizzle-orm';
import type { CreateEnquiryResultDto, UpdateEnquiryResultDto, EnquiryResultListDto } from './dto/enquiry-result.dto';

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
        if (filters?.enquiryId) {
            conditions.push(eq(enquiryResults.enquiryId, filters.enquiryId));
        }
        if (filters?.status) {
            conditions.push(eq(enquiryResults.status, filters.status));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [data, countResult] = await Promise.all([
            this.db
                .select()
                .from(enquiryResults)
                .where(where)
                .offset(offset)
                .limit(limit)
                .orderBy(desc(enquiryResults.createdAt)),
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
        const [row] = await this.db
            .select()
            .from(enquiryResults)
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
