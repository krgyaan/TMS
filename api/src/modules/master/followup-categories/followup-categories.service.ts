import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";
import { followupCategories, type FollowupCategory, type NewFollowupCategory } from "@db/schemas/crm/followup-categories.schema";

@Injectable()
export class FollowupCategoriesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<FollowupCategory[]> {
        return this.db.select().from(followupCategories);
    }

    async findById(id: number): Promise<FollowupCategory | null> {
        const result = await this.db.select().from(followupCategories).where(eq(followupCategories.id, id)).limit(1);
        return result[0] ?? null;
    }

    async create(data: NewFollowupCategory): Promise<FollowupCategory> {
        const rows = await this.db.insert(followupCategories).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewFollowupCategory>): Promise<FollowupCategory> {
        const rows = await this.db
            .update(followupCategories)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(followupCategories.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Followup Category with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(followupCategories).where(eq(followupCategories.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Followup Category with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<FollowupCategory[]> {
        const searchPattern = `%${query}%`;
        return this.db.select().from(followupCategories).where(like(followupCategories.name, searchPattern));
    }
}
