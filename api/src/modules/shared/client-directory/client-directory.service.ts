import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, and, or, ilike, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { clientDirectory } from '@db/schemas/shared/client-directory.schema';
import type { CreateClientDirectoryDto, UpdateClientDirectoryDto } from './dto/client-directory.dto';

export type ClientDirectoryListFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type ClientDirectoryRow = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    organization: string | null;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class ClientDirectoryService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(filters?: ClientDirectoryListFilters) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? 'desc';
        const sortBy = filters?.sortBy ?? 'createdAt';
        const search = filters?.search?.trim();

        const orderColumn =
            sortBy === 'name'
                ? clientDirectory.name
                : sortBy === 'email'
                  ? clientDirectory.email
                  : sortBy === 'phone'
                    ? clientDirectory.phone
                    : sortBy === 'organization'
                      ? clientDirectory.organization
                      : clientDirectory.createdAt;
        const orderFn = sortOrder === 'desc' ? desc : asc;

        const conditions: (SQL | undefined)[] = [];
        if (search) {
            conditions.push(
                or(
                    ilike(clientDirectory.name, `%${search}%`),
                    ilike(clientDirectory.email, `%${search}%`),
                    ilike(clientDirectory.phone, `%${search}%`),
                    ilike(clientDirectory.organization, `%${search}%`),
                ),
            );
        }
        const whereClause = conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(clientDirectory)
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select()
                .from(clientDirectory)
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        return {
            data: rows,
            meta: {
                total: countResult,
                page,
                limit,
                totalPages: Math.ceil(countResult / limit) || 1,
            },
        };
    }

    async findById(id: number): Promise<ClientDirectoryRow> {
        const [row] = await this.db
            .select()
            .from(clientDirectory)
            .where(eq(clientDirectory.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Client directory entry with ID ${id} not found`);
        }

        return row;
    }

    async create(data: CreateClientDirectoryDto) {
        const [inserted] = await this.db
            .insert(clientDirectory)
            .values({
                name: data.name,
                email: data.email ?? null,
                phone: data.phone ?? null,
                organization: data.organization ?? null,
            })
            .returning({ id: clientDirectory.id });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateClientDirectoryDto) {
        const updateValues: Record<string, unknown> = { updatedAt: new Date() };

        if (data.name !== undefined) updateValues.name = data.name;
        if (data.email !== undefined) updateValues.email = data.email;
        if (data.phone !== undefined) updateValues.phone = data.phone;
        if (data.organization !== undefined) updateValues.organization = data.organization;

        await this.db
            .update(clientDirectory)
            .set(updateValues)
            .where(eq(clientDirectory.id, id));

        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        const [row] = await this.db
            .delete(clientDirectory)
            .where(eq(clientDirectory.id, id))
            .returning();

        if (!row) {
            throw new NotFoundException(`Client directory entry with ID ${id} not found`);
        }
    }
}
