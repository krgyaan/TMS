import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { pqrDocuments } from '@db/schemas/shared/pqr.schema';
import type { CreatePqrDto, UpdatePqrDto } from './dto/pqr.dto';

export type PqrListFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type PqrRow = typeof pqrDocuments.$inferSelect;

@Injectable()
export class PqrService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private parseDate(value: string | undefined): Date | null {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    private mapCreateToDb(data: CreatePqrDto) {
        const now = new Date();
        return {
            teamName: String(data.teamName),
            projectName: data.projectName ?? null,
            value: String(data.value),
            item: data.item ?? null,
            poDate: this.parseDate(data.poDate),
            uploadPo: data.uploadPo ?? null,
            sapGemPoDate: this.parseDate(data.sapGemPoDate),
            uploadSapGemPo: data.uploadSapGemPo ?? null,
            completionDate: this.parseDate(data.completionDate),
            uploadCompletion: data.uploadCompletion ?? null,
            performanceCertificate: data.performanceCertificate ?? null,
            remarks: data.remarks ?? null,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdatePqrDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };
        if (data.teamName !== undefined) out.teamName = String(data.teamName);
        if (data.projectName !== undefined) out.projectName = data.projectName;
        if (data.value !== undefined) out.value = String(data.value);
        if (data.item !== undefined) out.item = data.item;
        if (data.poDate !== undefined) out.poDate = this.parseDate(data.poDate);
        if (data.uploadPo !== undefined) out.uploadPo = data.uploadPo;
        if (data.sapGemPoDate !== undefined) out.sapGemPoDate = this.parseDate(data.sapGemPoDate);
        if (data.uploadSapGemPo !== undefined) out.uploadSapGemPo = data.uploadSapGemPo;
        if (data.completionDate !== undefined) out.completionDate = this.parseDate(data.completionDate);
        if (data.uploadCompletion !== undefined) out.uploadCompletion = data.uploadCompletion;
        if (data.performanceCertificate !== undefined) out.performanceCertificate = data.performanceCertificate;
        if (data.remarks !== undefined) out.remarks = data.remarks;
        return out as Partial<typeof pqrDocuments.$inferInsert>;
    }

    private mapRowToResponse(row: PqrRow) {
        return {
            id: row.id,
            teamName: row.teamName,
            projectName: row.projectName,
            value: row.value,
            item: row.item,
            poDate: row.poDate,
            uploadPo: row.uploadPo,
            sapGemPoDate: row.sapGemPoDate,
            uploadSapGemPo: row.uploadSapGemPo,
            completionDate: row.completionDate,
            uploadCompletion: row.uploadCompletion,
            uploadPerformanceCertificate: row.performanceCertificate,
            remarks: row.remarks,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?: PqrListFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        const orderColumn =
            sortBy === 'projectName'
                ? pqrDocuments.projectName
                : sortBy === 'poDate'
                    ? pqrDocuments.poDate
                    : sortBy === 'value'
                        ? pqrDocuments.value
                        : pqrDocuments.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions = [];
        if (search) {
            conditions.push(
                or(
                    like(pqrDocuments.projectName, `%${search}%`),
                    like(pqrDocuments.item, `%${search}%`),
                    like(pqrDocuments.teamName, `%${search}%`),
                    like(pqrDocuments.value, `%${search}%`),
                    like(pqrDocuments.remarks, `%${search}%`),
                ) as never,
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(pqrDocuments)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(pqrDocuments)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
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
        const [row] = await this.db
            .select()
            .from(pqrDocuments)
            .where(eq(pqrDocuments.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`PQR with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async create(data: CreatePqrDto) {
        const insertValues = this.mapCreateToDb(data);
        const [row] = await this.db.insert(pqrDocuments).values(insertValues as never).returning();
        return this.mapRowToResponse(row!);
    }

    async update(id: number, data: UpdatePqrDto) {
        const updateValues = this.mapUpdateToDb(data);
        const [row] = await this.db
            .update(pqrDocuments)
            .set(updateValues)
            .where(eq(pqrDocuments.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`PQR with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(pqrDocuments)
            .where(eq(pqrDocuments.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`PQR with ID ${id} not found`);
        }
    }
}
