import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    loanParties,
    type LoanParty,
    type NewLoanParty,
} from '../../../db/loan-parties.schema';

@Injectable()
export class LoanPartiesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<LoanParty[]> {
        return this.db.select().from(loanParties);
    }

    async findById(id: number): Promise<LoanParty | null> {
        const result = await this.db
            .select()
            .from(loanParties)
            .where(eq(loanParties.id, id))
            .limit(1);
        return result[0] ?? null;
    }

    async create(data: NewLoanParty): Promise<LoanParty> {
        const rows = await this.db.insert(loanParties).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewLoanParty>): Promise<LoanParty> {
        const rows = await this.db
            .update(loanParties)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(loanParties.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Loan Party with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(loanParties)
            .where(eq(loanParties.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Loan Party with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<LoanParty[]> {
        const searchPattern = `%${query}%`;
        return this.db
            .select()
            .from(loanParties)
            .where(like(loanParties.name, searchPattern));
    }
}
