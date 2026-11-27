import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import { tallyLedgers } from "@/db/schemas";
import type { DbInstance } from "@db";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { TallyValidationError } from "../errors/tally.errors";
import { TallyClient } from "../client/tally.client";
import { planLedgerSync, type LedgerSyncConflict } from "./ledger-sync.plan";
import { normalizeLedgerName } from "./ledger-name";

export interface LedgerListParams {
    company: string;
    q?: string;
    parent?: string;
    active?: boolean;
    page?: number;
    limit?: number;
}

export interface LedgerSyncSummary {
    inserted: number;
    updated: number;
    reactivated: number;
    deactivated: number;
    conflicts: LedgerSyncConflict[];
}

export interface LedgerRecord {
    id: number;
    name: string;
    parent: string | null;
    isActive: boolean;
}

@Injectable()
export class TallyLedgersService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly client: TallyClient
    ) {}

    async sync(company: string): Promise<LedgerSyncSummary> {
        const companyName = this.requireCompany(company);
        const runStartedAt = new Date();
        const records = await this.client.exportMasters("ledger");

        const existingRows = await this.db
            .select({
                id: tallyLedgers.id,
                name: tallyLedgers.name,
                nameNormalized: tallyLedgers.nameNormalized,
                parent: tallyLedgers.parent,
                guid: tallyLedgers.guid,
                isActive: tallyLedgers.isActive,
            })
            .from(tallyLedgers)
            .where(eq(tallyLedgers.company, companyName));

        const incoming = records.map(record => ({ name: record.name, parent: record.parent, guid: record.guid }));
        const plan = planLedgerSync(existingRows, incoming);
        const existingById = new Map(existingRows.map(row => [row.id, row] as const));

        const changed = plan.updates.filter(update => {
            const previous = existingById.get(update.id);

            return !previous || previous.name !== update.name || previous.parent !== update.parent || previous.guid !== update.guid || !previous.isActive;
        });

        const changedIds = new Set(changed.map(update => update.id));
        const reactivated = plan.updates.filter(update => {
            const previous = existingById.get(update.id);

            return previous !== undefined && !previous.isActive && !changedIds.has(update.id);
        }).length;
        const touchedIds = plan.updates.map(update => update.id);

        await this.db.transaction(async tx => {
            for (const update of changed) {
                await tx
                    .update(tallyLedgers)
                    .set({
                        name: update.name,
                        nameNormalized: update.nameNormalized,
                        parent: update.parent,
                        guid: update.guid,
                        isActive: true,
                        lastSeenAt: runStartedAt,
                        updatedAt: runStartedAt,
                    })
                    .where(and(eq(tallyLedgers.id, update.id), eq(tallyLedgers.company, companyName)));
            }

            if (touchedIds.length > 0) {
                await tx
                    .update(tallyLedgers)
                    .set({ isActive: true, lastSeenAt: runStartedAt, updatedAt: runStartedAt })
                    .where(and(eq(tallyLedgers.company, companyName), inArray(tallyLedgers.id, touchedIds)));
            }

            if (plan.inserts.length > 0) {
                await tx.insert(tallyLedgers).values(
                    plan.inserts.map(insert => ({
                        company: companyName,
                        name: insert.name,
                        nameNormalized: normalizeLedgerName(insert.name),
                        parent: insert.parent,
                        guid: insert.guid,
                        isActive: true,
                        lastSeenAt: runStartedAt,
                    }))
                );
            }

            if (plan.deactivateIds.length > 0) {
                await tx
                    .update(tallyLedgers)
                    .set({ isActive: false, updatedAt: runStartedAt })
                    .where(and(eq(tallyLedgers.company, companyName), inArray(tallyLedgers.id, plan.deactivateIds)));
            }
        });

        return {
            inserted: plan.inserts.length,
            updated: changed.length,
            reactivated,
            deactivated: plan.deactivateIds.length,
            conflicts: plan.conflicts,
        };
    }

    async list(params: LedgerListParams) {
        const company = this.requireCompany(params.company);
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(200, Math.max(1, params.limit ?? 50));
        const conditions = [eq(tallyLedgers.company, company)];

        if (params.q?.trim()) {
            conditions.push(ilike(tallyLedgers.name, `%${params.q.trim()}%`));
        }

        if (params.parent?.trim()) {
            conditions.push(eq(tallyLedgers.parent, params.parent.trim()));
        }

        if (params.active !== undefined) {
            conditions.push(eq(tallyLedgers.isActive, params.active));
        }

        const where = and(...conditions);

        const [rows, totalRows] = await Promise.all([
            this.db
                .select({
                    id: tallyLedgers.id,
                    name: tallyLedgers.name,
                    parent: tallyLedgers.parent,
                    guid: tallyLedgers.guid,
                    isActive: tallyLedgers.isActive,
                    lastSeenAt: tallyLedgers.lastSeenAt,
                })
                .from(tallyLedgers)
                .where(where)
                .orderBy(asc(tallyLedgers.name))
                .limit(limit)
                .offset((page - 1) * limit),
            this.db
                .select({ total: sql<number>`count(*)` })
                .from(tallyLedgers)
                .where(where),
        ]);

        return { data: rows, page, limit, total: Number(totalRows[0]?.total ?? 0) };
    }

    async getByIds(company: string, ids: number[]): Promise<LedgerRecord[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.db
            .select({ id: tallyLedgers.id, name: tallyLedgers.name, parent: tallyLedgers.parent, isActive: tallyLedgers.isActive })
            .from(tallyLedgers)
            .where(and(eq(tallyLedgers.company, this.requireCompany(company)), inArray(tallyLedgers.id, ids)));
    }

    private requireCompany(company: string | null | undefined): string {
        const resolved = company?.trim();

        if (!resolved) {
            throw new TallyValidationError("TALLY_COMPANY is not configured");
        }

        return resolved;
    }
}
