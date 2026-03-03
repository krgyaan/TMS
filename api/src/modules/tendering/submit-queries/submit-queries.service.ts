import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { CreateSubmitQueriesDto, UpdateSubmitQueriesDto, ClientContact, QueryListItem } from './dto/submit-queries.dto';
import { submitQueries, submitQueriesLists } from '@/db/schemas/tendering/submit-queries.schema';
import { tenderInfos } from '@/db/schemas';

export type SubmitQueriesFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type SubmitQueryResponse = {
    id: number;
    tenderId: number;
    tenderName?: string;
    tenderNo?: string;
    clientContacts: ClientContact[];
    queries: QueryListItem[];
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class SubmitQueriesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapCreateToDb(data: CreateSubmitQueriesDto) {
        const now = new Date();
        return {
            tenderId: data.tenderId,
            clientContacts: data.clientContacts,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateSubmitQueriesDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };

        if (data.tenderId !== undefined) out.tenderId = data.tenderId;
        if (data.clientContacts !== undefined) out.clientContacts = data.clientContacts;

        return out as Partial<typeof submitQueries.$inferInsert>;
    }

    private mapRowToResponse(row: any, queries: any[] = []): SubmitQueryResponse {
        return {
            id: row.id,
            tenderId: row.tenderId,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            clientContacts: row.clientContacts as ClientContact[] || [],
            queries: queries.map(q => ({
                pageNo: q.pageNo,
                clauseNo: q.clauseNo,
                queryType: q.queryType,
                currentStatement: q.currentStatement,
                requestedStatement: q.requestedStatement,
            })),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?: SubmitQueriesFilters) {
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
                    ilike(tenderInfos.tenderName, `%${search}%`),
                    ilike(tenderInfos.tenderNo, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        const baseQuery = this.db
            .select({ count: sql<number>`count(*)::int` })
            .from(submitQueries)
            .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id));

        const [countResult, rows] = await Promise.all([
            baseQuery
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select({
                    id: submitQueries.id,
                    tenderId: submitQueries.tenderId,
                    tenderName: tenderInfos.tenderName,
                    tenderNo: tenderInfos.tenderNo,
                    clientContacts: submitQueries.clientContacts,
                    createdAt: submitQueries.createdAt,
                    updatedAt: submitQueries.updatedAt,
                })
                .from(submitQueries)
                .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id))
                .where(whereClause)
                .orderBy(orderFn(submitQueries.createdAt))
                .limit(limit)
                .offset(offset),
        ]);

        const total = countResult;

        // Fetch queries for each submit_queries record
        const data = await Promise.all(
            rows.map(async (row) => {
                const queries = await this.db
                    .select()
                    .from(submitQueriesLists)
                    .where(eq(submitQueriesLists.submitQueriesId, BigInt(row.id)));

                return this.mapRowToResponse(row, queries);
            })
        );

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
        const [row] = await this.db
            .select({
                id: submitQueries.id,
                tenderId: submitQueries.tenderId,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                clientContacts: submitQueries.clientContacts,
                createdAt: submitQueries.createdAt,
                updatedAt: submitQueries.updatedAt,
            })
            .from(submitQueries)
            .innerJoin(tenderInfos, eq(submitQueries.tenderId, tenderInfos.id))
            .where(eq(submitQueries.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Submit Query with ID ${id} not found`);
        }

        // Fetch associated queries
        const queries = await this.db
            .select()
            .from(submitQueriesLists)
            .where(eq(submitQueriesLists.submitQueriesId, BigInt(id)));

        return this.mapRowToResponse(row, queries);
    }

    async create(data: CreateSubmitQueriesDto) {
        return await this.db.transaction(async (tx) => {
            // Insert main record
            const insertValues = this.mapCreateToDb(data);
            const [inserted] = await tx
                .insert(submitQueries)
                .values(insertValues as never)
                .returning({ id: submitQueries.id });

            // Insert query list items
            if (data.queries && data.queries.length > 0) {
                const now = new Date();
                const queryListValues = data.queries.map(q => ({
                    submitQueriesId: inserted.id,
                    pageNo: q.pageNo,
                    clauseNo: q.clauseNo,
                    queryType: q.queryType,
                    currentStatement: q.currentStatement,
                    requestedStatement: q.requestedStatement,
                    createdAt: now,
                    updatedAt: now,
                }));

                await tx
                    .insert(submitQueriesLists)
                    .values(queryListValues as never);
            }

            return this.findById(inserted.id);
        });
    }

    async update(id: number, data: UpdateSubmitQueriesDto) {
        return await this.db.transaction(async (tx) => {
            // Update main record
            const updateValues = this.mapUpdateToDb(data);
            await tx
                .update(submitQueries)
                .set(updateValues)
                .where(eq(submitQueries.id, id));

            // Update queries if provided
            if (data.queries !== undefined) {
                // Delete existing queries
                await tx
                    .delete(submitQueriesLists)
                    .where(eq(submitQueriesLists.submitQueriesId, BigInt(id)));

                // Insert new queries
                if (data.queries.length > 0) {
                    const now = new Date();
                    const queryListValues = data.queries.map(q => ({
                        submitQueriesId: id,
                        pageNo: q.pageNo,
                        clauseNo: q.clauseNo,
                        queryType: q.queryType,
                        currentStatement: q.currentStatement,
                        requestedStatement: q.requestedStatement,
                        createdAt: now,
                        updatedAt: now,
                    }));

                    await tx
                        .insert(submitQueriesLists)
                        .values(queryListValues as never);
                }
            }

            return this.findById(id);
        });
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(submitQueries)
            .where(eq(submitQueries.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Submit Query with ID ${id} not found`);
        }

        // Queries will be auto-deleted due to cascade
    }
}
