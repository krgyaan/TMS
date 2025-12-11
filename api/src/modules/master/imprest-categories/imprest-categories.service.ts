import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like } from "drizzle-orm";
import { DRIZZLE } from "@/db/schemas/shared/database.module";
import type { DbInstance } from "@db";
import { imprestCategories, type ImprestCategory, type NewImprestCategory } from "@db/schemas/accounts/imprest-categories.schema";

@Injectable()
export class ImprestCategoriesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<ImprestCategory[]> {
        return this.db.select().from(imprestCategories);
    }

    async findById(id: number): Promise<ImprestCategory | null> {
        const result = await this.db.select().from(imprestCategories).where(eq(imprestCategories.id, id)).limit(1);
        return result[0] ?? null;
    }

    async create(data: NewImprestCategory): Promise<ImprestCategory> {
        const rows = await this.db.insert(imprestCategories).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewImprestCategory>): Promise<ImprestCategory> {
        const rows = await this.db
            .update(imprestCategories)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(imprestCategories.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Imprest Category with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(imprestCategories).where(eq(imprestCategories.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Imprest Category with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<ImprestCategory[]> {
        const searchPattern = `%${query}%`;
        return this.db.select().from(imprestCategories).where(like(imprestCategories.name, searchPattern));
    }
}
