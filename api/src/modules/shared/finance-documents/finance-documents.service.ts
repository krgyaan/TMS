import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { financeDocuments } from '@db/schemas/shared/finance_docs.schema';
import type {
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from './dto/finance-documents.dto';

export type FinanceDocumentListFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type FinanceDocumentRow = typeof financeDocuments.$inferSelect;

@Injectable()
export class FinanceDocumentsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapCreateToDb(data: CreateFinanceDocumentDto) {
        const now = new Date();
        return {
            documentName: data.documentName ?? null,
            documentType: String(data.documentType),
            financialYear: String(data.financialYear),
            documentPath: data.uploadFile ?? null,
            createdAt: now,
            updatedAt: now,
        };
    }

    private mapUpdateToDb(data: UpdateFinanceDocumentDto) {
        const out: Record<string, unknown> = { updatedAt: new Date() };
        if (data.documentName !== undefined) out.documentName = data.documentName;
        if (data.documentType !== undefined)
            out.documentType = String(data.documentType);
        if (data.financialYear !== undefined)
            out.financialYear = String(data.financialYear);
        if (data.uploadFile !== undefined) out.documentPath = data.uploadFile;
        return out as Partial<typeof financeDocuments.$inferInsert>;
    }

    private mapRowToResponse(row: FinanceDocumentRow) {
        return {
            id: row.id,
            documentName: row.documentName,
            documentType: row.documentType,
            financialYear: row.financialYear,
            uploadFile: row.documentPath,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll(filters?: FinanceDocumentListFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        const orderColumn =
            sortBy === 'documentName'
                ? financeDocuments.documentName
                : sortBy === 'documentType'
                    ? financeDocuments.documentType
                    : sortBy === 'financialYear'
                        ? financeDocuments.financialYear
                        : financeDocuments.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions = [];
        if (search) {
            conditions.push(
                or(
                    ilike(financeDocuments.documentName, `%${search}%`),
                    ilike(financeDocuments.documentType, `%${search}%`),
                    ilike(financeDocuments.financialYear, `%${search}%`),
                ) as never,
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(financeDocuments)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(financeDocuments)
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
            .from(financeDocuments)
            .where(eq(financeDocuments.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(
                `Finance document with ID ${id} not found`,
            );
        }

        return this.mapRowToResponse(row);
    }

    async create(data: CreateFinanceDocumentDto) {
        const insertValues = this.mapCreateToDb(data);
        const [row] = await this.db
            .insert(financeDocuments)
            .values(insertValues)
            .returning();
        return this.mapRowToResponse(row!);
    }

    async update(id: number, data: UpdateFinanceDocumentDto) {
        const updateValues = this.mapUpdateToDb(data);
        const [row] = await this.db
            .update(financeDocuments)
            .set(updateValues)
            .where(eq(financeDocuments.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(
                `Finance document with ID ${id} not found`,
            );
        }

        return this.mapRowToResponse(row);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(financeDocuments)
            .where(eq(financeDocuments.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(
                `Finance document with ID ${id} not found`,
            );
        }
    }
}
