import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";
import { financialYears } from "@db/schemas/shared/financial_year.schema";

type FinancialYearRow = typeof financialYears.$inferSelect;

@Injectable()
export class FinancialYearService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private mapRowToResponse(row: FinancialYearRow) {
        return {
            id: row.id,
            name: row.financialYear,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findAll() {
        const rows = await this.db
            .select()
            .from(financialYears)
            .where(eq(financialYears.status, true));

        return rows.map((row) => this.mapRowToResponse(row));
    }

    async findById(id: number) {
        const [row] = await this.db
            .select()
            .from(financialYears)
            .where(eq(financialYears.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Financial year with ID ${id} not found`);
        }

        return this.mapRowToResponse(row);
    }
}
