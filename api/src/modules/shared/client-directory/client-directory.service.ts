import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, and, or, ilike, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { clientDirectory } from '@db/schemas/shared/client-directory.schema';
import { ClientDirectorySyncService } from '@/modules/shared/client-directory/client-directory-sync.service';
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
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly clientDirectorySyncService: ClientDirectorySyncService,
    ) {}

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

    async syncAll(): Promise<{ synced: number }> {
        const allContacts: { name: string; email: string | null; phone: string | null; org: string | null }[] = [];

        const sources = [
            { name: sql<string>`client_name`, email: sql<string | null>`client_email`, phone: sql<string | null>`client_mobile`, org: sql<string | null>`NULL`, table: sql`tender_clients` },
            { name: sql<string>`name`, email: sql<string | null>`email`, phone: sql<string | null>`phone`, org: sql<string | null>`NULL`, table: sql`physical_docs_persons` },
            { name: sql<string>`name`, email: sql<string | null>`email`, phone: sql<string | null>`phone`, org: sql<string | null>`organization`, table: sql`follow_up_persons` },
            { name: sql<string>`name`, email: sql<string | null>`email`, phone: sql<string | null>`phone`, org: sql<string | null>`organization`, table: sql`wo_contacts` },
            { name: sql<string>`name`, email: sql<string | null>`email`, phone: sql<string | null>`mobile`, org: sql<string | null>`NULL`, table: sql`vendors` },
            { name: sql<string>`contact_person_name`, email: sql<string | null>`contact_person_email`, phone: sql<string | null>`contact_person_phone`, org: sql<string | null>`seller_name`, table: sql`purchase_orders` },
            { name: sql<string>`contact_person_name`, email: sql<string | null>`contact_person_email`, phone: sql<string | null>`contact_person_phone`, org: sql<string | null>`seller_name`, table: sql`vendor_work_orders` },
            { name: sql<string>`person_name`, email: sql<string | null>`email`, phone: sql<string | null>`phone`, org: sql<string | null>`org_name`, table: sql`loan_bank_contacts` },
            { name: sql<string>`name`, email: sql<string | null>`email`, phone: sql<string | null>`NULL`, org: sql<string | null>`NULL`, table: sql`project_parties` },
        ];

        for (const src of sources) {
            const rows = await this.db
                .select({ name: src.name, email: src.email, phone: src.phone, org: src.org })
                .from(src.table)
                .where(sql`${src.name} IS NOT NULL AND ${src.name} != ''`);

            for (const row of rows) {
                if (row.name) {
                    allContacts.push({ name: row.name, email: row.email, phone: row.phone, org: row.org });
                }
            }
        }

        // JSONB sources
        const [fuRows, sqRows, reRows] = await Promise.all([
            this.db.execute(sql`SELECT contacts FROM follow_ups WHERE contacts IS NOT NULL`),
            this.db.execute(sql`SELECT client_contacts FROM submit_queries WHERE client_contacts IS NOT NULL`),
            this.db.execute(sql`SELECT clients FROM request_extensions WHERE clients IS NOT NULL`),
        ]);

        for (const row of (fuRows as any).rows ?? []) {
            for (const c of row.contacts ?? []) {
                if (c?.name) allContacts.push({ name: c.name, email: c.email ?? null, phone: c.phone ?? null, org: c.org ?? null });
            }
        }
        for (const row of (sqRows as any).rows ?? []) {
            for (const c of row.client_contacts ?? []) {
                if (c?.client_name) allContacts.push({ name: c.client_name, email: c.client_email ?? null, phone: c.client_phone ?? null, org: c.client_org ?? null });
            }
        }
        for (const row of (reRows as any).rows ?? []) {
            for (const c of row.clients ?? []) {
                if (c?.name) allContacts.push({ name: c.name, email: c.email ?? null, phone: c.phone ?? null, org: c.org ?? null });
            }
        }

        await this.clientDirectorySyncService.syncToClientDirectory(allContacts);
        return { synced: allContacts.length };
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
