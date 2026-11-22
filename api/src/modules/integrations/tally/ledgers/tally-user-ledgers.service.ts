import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import { tallyLedgers, users } from "@/db/schemas";
import type { DbInstance } from "@db";
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface UserLedgerLink {
    id: number;
    name: string;
    parent: string | null;
    isActive: boolean;
}

export interface UserLedgerLinks {
    userId: number;
    userName: string;
    imprest: UserLedgerLink | null;
    salary: UserLedgerLink | null;
    salaryPayable: UserLedgerLink | null;
}

export interface UserLedgerLinkInput {
    imprestLedgerId?: number | null;
    salaryLedgerId?: number | null;
    salaryPayableLedgerId?: number | null;
}

@Injectable()
export class TallyUserLedgersService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getForUser(userId: number, company: string): Promise<UserLedgerLinks> {
        const imprestLedger = alias(tallyLedgers, "imprest_ledger");
        const salaryLedger = alias(tallyLedgers, "salary_ledger");
        const salaryPayableLedger = alias(tallyLedgers, "salary_payable_ledger");

        const [row] = await this.db
            .select({
                userId: users.id,
                userName: users.name,
                imprest: { id: imprestLedger.id, name: imprestLedger.name, parent: imprestLedger.parent, isActive: imprestLedger.isActive },
                salary: { id: salaryLedger.id, name: salaryLedger.name, parent: salaryLedger.parent, isActive: salaryLedger.isActive },
                salaryPayable: {
                    id: salaryPayableLedger.id,
                    name: salaryPayableLedger.name,
                    parent: salaryPayableLedger.parent,
                    isActive: salaryPayableLedger.isActive,
                },
            })
            .from(users)
            .leftJoin(imprestLedger, and(eq(imprestLedger.id, users.imprestLedgerId), eq(imprestLedger.company, company)))
            .leftJoin(salaryLedger, and(eq(salaryLedger.id, users.salaryLedgerId), eq(salaryLedger.company, company)))
            .leftJoin(salaryPayableLedger, and(eq(salaryPayableLedger.id, users.salaryPayableLedgerId), eq(salaryPayableLedger.company, company)))
            .where(eq(users.id, userId))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`User ${userId} not found`);
        }

        return {
            userId: row.userId,
            userName: row.userName,
            imprest: this.toLink(row.imprest),
            salary: this.toLink(row.salary),
            salaryPayable: this.toLink(row.salaryPayable),
        };
    }

    async setForUser(userId: number, input: UserLedgerLinkInput, company: string): Promise<UserLedgerLinks> {
        const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
            throw new NotFoundException(`User ${userId} not found`);
        }

        const ids = [input.imprestLedgerId, input.salaryLedgerId, input.salaryPayableLedgerId].filter((id): id is number => typeof id === "number");

        if (ids.length !== new Set(ids).size) {
            throw new BadRequestException("The same ledger cannot be used for more than one role");
        }

        if (ids.length > 0) {
            const ledgers = await this.db
                .select({ id: tallyLedgers.id, isActive: tallyLedgers.isActive })
                .from(tallyLedgers)
                .where(and(eq(tallyLedgers.company, company), inArray(tallyLedgers.id, ids)));

            if (ledgers.length !== new Set(ids).size) {
                throw new BadRequestException("One or more ledger ids do not exist for this company");
            }

            if (ledgers.some(ledger => !ledger.isActive)) {
                throw new BadRequestException("One or more ledgers are inactive");
            }
        }

        const patch: UserLedgerLinkInput = {};

        if (input.imprestLedgerId !== undefined) patch.imprestLedgerId = input.imprestLedgerId;
        if (input.salaryLedgerId !== undefined) patch.salaryLedgerId = input.salaryLedgerId;
        if (input.salaryPayableLedgerId !== undefined) patch.salaryPayableLedgerId = input.salaryPayableLedgerId;

        if (Object.keys(patch).length > 0) {
            await this.db.update(users).set(patch).where(eq(users.id, userId));
        }

        return this.getForUser(userId, company);
    }

    async clearForUser(userId: number, company: string): Promise<UserLedgerLinks> {
        return this.setForUser(userId, { imprestLedgerId: null, salaryLedgerId: null, salaryPayableLedgerId: null }, company);
    }

    private toLink(link: { id: number | null; name: string | null; parent: string | null; isActive: boolean | null }): UserLedgerLink | null {
        if (link.id === null) {
            return null;
        }

        return { id: link.id, name: link.name ?? "", parent: link.parent, isActive: link.isActive ?? false };
    }
}
