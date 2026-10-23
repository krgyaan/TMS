import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { transporters, type Transporter, type NewTransporter } from "@db/schemas/master/transporters.schema";

@Injectable()
export class TransportersService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<Transporter[]> {
        return this.db.select().from(transporters).orderBy(transporters.name);
    }

    async findById(id: number): Promise<Transporter> {
        const rows = await this.db.select().from(transporters).where(eq(transporters.id, id)).limit(1);
        if (!rows[0]) throw new NotFoundException(`Transporter with ID ${id} not found`);
        return rows[0];
    }

    async create(data: NewTransporter): Promise<Transporter> {
        const rows = await this.db.insert(transporters).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewTransporter>): Promise<Transporter> {
        const rows = await this.db
            .update(transporters)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(transporters.id, id))
            .returning();
        if (!rows[0]) throw new NotFoundException(`Transporter with ID ${id} not found`);
        return rows[0];
    }

    async search(query: string, ids: number[] = []): Promise<Transporter[]> {
        const searchPattern = `%${query}%`;
        const isActive = eq(transporters.status, true);
        const matchesQuery = query
            ? or(
                ilike(transporters.name, searchPattern),
                ilike(transporters.gstNo, searchPattern),
                ilike(transporters.phone, searchPattern),
            )
            : isActive;
        const pinned = ids.length > 0 ? inArray(transporters.id, ids) : undefined;

        const rows = await this.db
            .select()
            .from(transporters)
            .where(and(isActive, matchesQuery!))
            .orderBy(transporters.name, transporters.id)
            .limit(query ? 50 : 200);

        if (!pinned) return rows;

        const seen = new Set(rows.map((r) => r.id));
        const extra = (await this.db.select().from(transporters).where(pinned)).filter((r) => !seen.has(r.id));
        return [...extra, ...rows];
    }
}
