import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    leadTypes,
    type LeadType,
    type NewLeadType,
} from '@db/schemas/crm/lead-types.schema';

@Injectable()
export class LeadTypesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<LeadType[]> {
        return this.db.select().from(leadTypes);
    }

    async findById(id: number): Promise<LeadType | null> {
        const result = await this.db
            .select()
            .from(leadTypes)
            .where(eq(leadTypes.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewLeadType): Promise<LeadType> {
        const rows = await this.db.insert(leadTypes).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewLeadType>): Promise<LeadType> {
        const rows = await this.db
            .update(leadTypes)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(leadTypes.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Lead Type with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(leadTypes)
            .where(eq(leadTypes.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Lead Type with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<LeadType[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(leadTypes)
            .where(like(leadTypes.name, searchPattern));
    }
}
