import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";
import { financeDocTypes } from "@db/schemas/shared/finance-doc-type.schema";

type FinanceDocTypeRow = typeof financeDocTypes.$inferSelect;

@Injectable()
export class FinanceDocTypeService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapRowToResponse(row: FinanceDocTypeRow) {
        return {
            id: row.id,
            name: row.documentType,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll() {
        const rows = await this.db
            .select()
            .from(financeDocTypes)
            .where(eq(financeDocTypes.status, true));

        return rows.map((row) => this.mapRowToResponse(row));
    }

    async findById(id: number) {
        const [row] = await this.db
            .select()
            .from(financeDocTypes)
            .where(eq(financeDocTypes.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Finance document type with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }
}
