import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    documentsSubmitted,
    type DocumentSubmitted,
    type NewDocumentSubmitted,
} from '@db/schemas/master/documents-submitted.schema';

@Injectable()
export class DocumentsSubmittedService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<DocumentSubmitted[]> {
        return this.db.select().from(documentsSubmitted);
    }

    async findById(id: number): Promise<DocumentSubmitted | null> {
        const result = await this.db
            .select()
            .from(documentsSubmitted)
            .where(eq(documentsSubmitted.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewDocumentSubmitted): Promise<DocumentSubmitted> {
        const rows = await this.db
            .insert(documentsSubmitted)
            .values(data)
            .returning();
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<NewDocumentSubmitted>,
    ): Promise<DocumentSubmitted> {
        const rows = await this.db
            .update(documentsSubmitted)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(documentsSubmitted.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Document type with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(documentsSubmitted)
            .where(eq(documentsSubmitted.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Document type with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<DocumentSubmitted[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(documentsSubmitted)
            .where(like(documentsSubmitted.name, searchPattern));
    }
}
