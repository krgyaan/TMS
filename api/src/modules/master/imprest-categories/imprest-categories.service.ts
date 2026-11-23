import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, ilike } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@db";
import { tallyLedgers } from "@db/schemas";
import { imprestCategories, type ImprestCategory, type NewImprestCategory } from "@db/schemas/accounts/imprest-categories.schema";

export interface ImprestCategoryWithTally extends ImprestCategory {
    tallyLedgerName: string | null;
    tallyLedgerParent: string | null;
    tallyLedgerActive: boolean | null;
}

const CATEGORY_SELECTION = {
    id: imprestCategories.id,
    name: imprestCategories.name,
    heading: imprestCategories.heading,
    status: imprestCategories.status,
    tallyLedgerId: imprestCategories.tallyLedgerId,
    tallyBlocked: imprestCategories.tallyBlocked,
    createdAt: imprestCategories.createdAt,
    updatedAt: imprestCategories.updatedAt,
    tallyLedgerName: tallyLedgers.name,
    tallyLedgerParent: tallyLedgers.parent,
    tallyLedgerActive: tallyLedgers.isActive,
};

@Injectable()
export class ImprestCategoriesService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly config: ConfigService
    ) {}

    async findAll(): Promise<ImprestCategoryWithTally[]> {
        return this.db
            .select(CATEGORY_SELECTION)
            .from(imprestCategories)
            .leftJoin(tallyLedgers, eq(tallyLedgers.id, imprestCategories.tallyLedgerId))
            .where(eq(imprestCategories.status, true))
            .orderBy(imprestCategories.name);
    }

    async findById(id: number): Promise<ImprestCategoryWithTally | null> {
        const result = await this.db
            .select(CATEGORY_SELECTION)
            .from(imprestCategories)
            .leftJoin(tallyLedgers, eq(tallyLedgers.id, imprestCategories.tallyLedgerId))
            .where(eq(imprestCategories.id, id))
            .limit(1);

        return result[0] ?? null;
    }

    async create(data: NewImprestCategory): Promise<ImprestCategory> {
        await this.assertTallyLedger(data.tallyLedgerId);

        const rows = await this.db.insert(imprestCategories).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewImprestCategory>): Promise<ImprestCategory> {
        await this.assertTallyLedger(data.tallyLedgerId);

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
        return this.db.select().from(imprestCategories).where(ilike(imprestCategories.name, searchPattern));
    }

    private async assertTallyLedger(ledgerId: number | null | undefined): Promise<void> {
        if (ledgerId === undefined || ledgerId === null) {
            return;
        }

        const company = this.config.get<{ company: string | null }>("tally")?.company;

        if (!company) {
            throw new BadRequestException("TALLY_COMPANY is not configured; cannot map a Tally ledger");
        }

        const [ledger] = await this.db
            .select({ id: tallyLedgers.id, isActive: tallyLedgers.isActive })
            .from(tallyLedgers)
            .where(and(eq(tallyLedgers.id, ledgerId), eq(tallyLedgers.company, company)))
            .limit(1);

        if (!ledger) {
            throw new BadRequestException(`Tally ledger ${ledgerId} does not exist for company "${company}"`);
        }

        if (!ledger.isActive) {
            throw new BadRequestException(`Tally ledger ${ledgerId} is inactive`);
        }
    }
}
