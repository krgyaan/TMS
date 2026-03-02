import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { CreateRequestExtensionDto, UpdateRequestExtensionDto } from './dto/request-extension.dto';
import { requestExtension } from '@/db/schemas/tendering/request-extension.schema';
import { tenderInfos } from '@/db/schemas';

export type RequestExtensionFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type RequestExtensionResponse = {
    id: number;
    tenderId: number;
    days: number;
    reason: string;
    clients: string;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class RequestExtensionsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapCreateToDb(data: CreateRequestExtensionDto) {
        const now = new Date();
        return {
            tenderId: data.tenderId,
            days: data.days,
            reason: data.reason,
            clients: data.clients,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateRequestExtensionDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.tenderId !== undefined) out.tenderId = data.tenderId;
        if (data.days !== undefined) out.days = data.days;
        if (data.reason !== undefined) out.reason = data.reason;
        if (data.clients !== undefined) out.clients = data.clients;

        return out as Partial<typeof requestExtension.$inferInsert>;
    }

    private mapRowToResponse(row: any): RequestExtensionResponse {
        return {
            id: row.id,
            tenderId: row.tenderId,
            days: row.days,
            reason: row.reason,
            clients: row.clients,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?:     RequestExtensionFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: (SQL<any> | undefined)[] = [];
        if (search) {
            conditions.push(
                or(
                    ilike(requestExtension.reason, `%${search}%`),
                    ilike(requestExtension.clients, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        // Build the base query with JOIN — needed for both count and data
        // since search may reference the teams table
        const baseQuery = this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(requestExtension)
            .innerJoin(tenderInfos, eq(requestExtension.tenderId, tenderInfos.id));

        const [countResult, rows] = await Promise.all([
            baseQuery
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select({
                    id: requestExtension.id,
                    tenderId: requestExtension.tenderId,
                    tenderName: tenderInfos.tenderName,
                    tenderNo: tenderInfos.tenderNo,
                    tenderDue: tenderInfos.dueDate,
                    days: requestExtension.days,
                    reason: requestExtension.reason,
                    clients: requestExtension.clients,
                    createdAt: requestExtension.createdAt,
                    updatedAt: requestExtension.updatedAt,
                })
                .from(requestExtension)
                .innerJoin(tenderInfos, eq(requestExtension.tenderId, tenderInfos.id))
                .where(whereClause)
                .orderBy(orderFn(requestExtension.createdAt))
                .limit(limit)
                .offset(offset),
        ]);

        const total = countResult;
        const data = rows.map((r) => this.mapRowToResponse(r));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async findById(id: number) {
        const [row] = await this.db.select({
                id: requestExtension.id,
                tenderId: requestExtension.tenderId,
                days: requestExtension.days,
                reason: requestExtension.reason,
                clients: requestExtension.clients,
                createdAt: requestExtension.createdAt,
                updatedAt: requestExtension.updatedAt,
            })
            .from(requestExtension)
            .where(eq(requestExtension.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Request Extension with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async create(data: CreateRequestExtensionDto) {
        const insertValues = this.mapCreateToDb(data);
        const [inserted] = await this.db
            .insert(requestExtension)
            .values(insertValues as never)
            .returning({ id: requestExtension.id });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateRequestExtensionDto) {
        const updateValues = this.mapUpdateToDb(data);
        await this.db
        .update(requestExtension)
        .set(updateValues)
        .where(eq(requestExtension.id, id));

        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(requestExtension)
            .where(eq(requestExtension.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Request Extension with ID ${id} not found`);
        }
    }
}
