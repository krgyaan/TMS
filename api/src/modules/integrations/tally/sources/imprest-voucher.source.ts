import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import { employeeImprestVoucherItems, employeeImprestVouchers, employeeImprests, imprestCategories, projects, tallyLedgers, teams, users } from "@/db/schemas";
import type { DbInstance } from "@db";
import { and, asc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { TallyValidationError } from "../errors/tally.errors";
import { deriveCategoryContext, isBusinessDevelopmentTeam, resolveEntryLedger } from "../ledgers/category-ledger-resolver";
import { IMPREST_TALLY_CONFIG, type ImprestTallyConfig } from "../mappings/imprest-tally.config";
import { buildVoucherSnapshot, type LedgerLink, type VoucherLineInput, type VoucherSnapshot } from "./voucher-snapshot.builder";

export interface ListSnapshotsParams {
    from: Date;
    to: Date;
    config?: ImprestTallyConfig;
}

interface EmployeeRow {
    id: number;
    name: string;
    imprestLedgerId: number | null;
    team: number | null;
    primaryTeamId: number | null;
}

interface ResolvedEmployeeRow extends EmployeeRow {
    isBusinessDevelopment: boolean;
}

const BENEFICIARY_ID = sql<number | null>`CASE WHEN ${employeeImprestVouchers.beneficiaryName} ~ '^[0-9]+$' THEN ${employeeImprestVouchers.beneficiaryName}::int ELSE NULL END`;

function toCategoryLedger(ledger: { name: string; parent: string | null; isActive: boolean } | undefined): LedgerLink | null {
    return ledger ? { ledger: ledger.name, group: ledger.parent ?? "", active: ledger.isActive } : null;
}

@Injectable()
export class ImprestVoucherSource {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async listSnapshots(params: ListSnapshotsParams): Promise<VoucherSnapshot[]> {
        this.assertRange(params);

        const vouchers = await this.db
            .select({
                voucherId: employeeImprestVouchers.id,
                voucherCode: employeeImprestVouchers.voucherCode,
                employeeId: BENEFICIARY_ID,
                amount: sql<string>`${employeeImprestVouchers.amount}::text`,
                validFrom: employeeImprestVouchers.validFrom,
                validTo: employeeImprestVouchers.validTo,
                accountsSignedAt: employeeImprestVouchers.accountsSignedAt,
            })
            .from(employeeImprestVouchers)
            .where(and(isNotNull(employeeImprestVouchers.accountsSignedAt), gte(employeeImprestVouchers.validFrom, params.from), lte(employeeImprestVouchers.validFrom, params.to)))
            .orderBy(asc(employeeImprestVouchers.validFrom), asc(employeeImprestVouchers.id));

        if (vouchers.length === 0) {
            return [];
        }

        const voucherIds = vouchers.map(voucher => voucher.voucherId);
        const employeeIds = [...new Set(vouchers.map(voucher => voucher.employeeId).filter((id): id is number => id !== null))];

        const employeeRowsPromise: Promise<EmployeeRow[]> =
            employeeIds.length > 0
                ? this.db
                      .select({ id: users.id, name: users.name, imprestLedgerId: users.imprestLedgerId, team: users.team, primaryTeamId: users.primaryTeamId })
                      .from(users)
                      .where(inArray(users.id, employeeIds))
                : Promise.resolve([]);

        const [employeeRows, lineRows] = await Promise.all([
            employeeRowsPromise,
            this.db
                .select({
                    voucherId: employeeImprestVoucherItems.voucherId,
                    imprestId: employeeImprests.id,
                    amount: sql<string | null>`${employeeImprests.amount}::text`,
                    categoryId: employeeImprests.categoryId,
                    categoryName: imprestCategories.name,
                    categoryBlocked: imprestCategories.tallyBlocked,
                    categoryDefaultLedgerId: imprestCategories.tallyLedgerId,
                    categoryProjectLedgerId: imprestCategories.projectLedgerId,
                    categoryBdLedgerId: imprestCategories.businessDevelopmentLedgerId,
                    projectId: employeeImprests.projectId,
                    projectTeamName: projects.teamName,
                    projectCode: projects.projectCode,
                    dateOfExpense: employeeImprests.dateOfExpense,
                    approvalStatus: employeeImprests.approvalStatus,
                    overrideLedgerId: employeeImprests.tallyLedgerId,
                })
                .from(employeeImprestVoucherItems)
                .innerJoin(employeeImprests, eq(employeeImprests.id, employeeImprestVoucherItems.imprestId))
                .leftJoin(projects, eq(projects.id, employeeImprests.projectId))
                .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
                .where(inArray(employeeImprestVoucherItems.voucherId, voucherIds))
                .orderBy(asc(employeeImprestVoucherItems.voucherId), asc(employeeImprests.id)),
        ]);

        const teamIds = [...new Set(employeeRows.flatMap(row => [row.team, row.primaryTeamId]).filter((id): id is number => id !== null))];
        const teamRows = teamIds.length > 0 ? await this.db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
        const teamNames = new Map(teamRows.map(team => [team.id, team.name] as const));

        const employeesById = new Map<number, ResolvedEmployeeRow>(
            employeeRows.map(row => {
                const isBusinessDevelopment = [row.team, row.primaryTeamId].filter((id): id is number => id !== null).some(id => isBusinessDevelopmentTeam(teamNames.get(id)));

                return [row.id, { ...row, isBusinessDevelopment }] as const;
            })
        );

        const ledgerIds = new Set<number>();

        for (const employee of employeeRows) {
            if (employee.imprestLedgerId !== null) {
                ledgerIds.add(employee.imprestLedgerId);
            }
        }

        for (const row of lineRows) {
            for (const id of [row.overrideLedgerId, row.categoryDefaultLedgerId, row.categoryProjectLedgerId, row.categoryBdLedgerId]) {
                if (id !== null) {
                    ledgerIds.add(id);
                }
            }
        }

        const ledgerRows =
            ledgerIds.size > 0
                ? await this.db
                      .select({ id: tallyLedgers.id, name: tallyLedgers.name, parent: tallyLedgers.parent, isActive: tallyLedgers.isActive })
                      .from(tallyLedgers)
                      .where(inArray(tallyLedgers.id, [...ledgerIds]))
                : [];

        const ledgersById = new Map(ledgerRows.map(row => [row.id, row] as const));
        const voucherById = new Map(vouchers.map(voucher => [voucher.voucherId, voucher] as const));
        const linesByVoucher = new Map<number, VoucherLineInput[]>();

        for (const row of lineRows) {
            const voucher = voucherById.get(row.voucherId);
            const employee = voucher?.employeeId != null ? employeesById.get(voucher.employeeId) : undefined;
            const context = deriveCategoryContext({
                projectId: row.projectId,
                projectTeamName: row.projectTeamName,
                employeeIsBusinessDevelopment: employee?.isBusinessDevelopment ?? false,
            });
            const resolution = resolveEntryLedger({
                overrideLedgerId: row.overrideLedgerId,
                category: {
                    defaultLedgerId: row.categoryDefaultLedgerId,
                    projectLedgerId: row.categoryProjectLedgerId,
                    businessDevelopmentLedgerId: row.categoryBdLedgerId,
                    blocked: row.categoryBlocked ?? false,
                },
                context,
            });
            const finalLedger = resolution.finalLedgerId !== null ? ledgersById.get(resolution.finalLedgerId) : undefined;

            const lines = linesByVoucher.get(row.voucherId) ?? [];

            lines.push({
                imprestId: row.imprestId,
                amount: row.amount,
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                categoryBlocked: row.categoryBlocked ?? false,
                categoryOverride: resolution.source === "manual",
                categoryLedger: toCategoryLedger(finalLedger),
                projectCode: row.projectCode,
                dateOfExpense: row.dateOfExpense,
                approvalStatus: row.approvalStatus,
            });

            linesByVoucher.set(row.voucherId, lines);
        }

        const config = params.config ?? IMPREST_TALLY_CONFIG;

        return vouchers.map(voucher => {
            const employee = voucher.employeeId === null ? undefined : employeesById.get(voucher.employeeId);
            const linkedLedger = employee?.imprestLedgerId != null ? ledgersById.get(employee.imprestLedgerId) : undefined;

            return buildVoucherSnapshot(config, {
                voucherId: voucher.voucherId,
                voucherCode: voucher.voucherCode,
                employeeId: voucher.employeeId,
                employeeName: employee?.name ?? null,
                employeeLedger: toCategoryLedger(linkedLedger),
                amount: voucher.amount,
                validFrom: voucher.validFrom,
                validTo: voucher.validTo,
                accountsSignedAt: voucher.accountsSignedAt,
                lines: linesByVoucher.get(voucher.voucherId) ?? [],
            });
        });
    }

    private assertRange(params: ListSnapshotsParams): void {
        if (!(params.from instanceof Date) || Number.isNaN(params.from.getTime())) {
            throw new TallyValidationError("from must be a valid date");
        }

        if (!(params.to instanceof Date) || Number.isNaN(params.to.getTime())) {
            throw new TallyValidationError("to must be a valid date");
        }

        if (params.from.getTime() > params.to.getTime()) {
            throw new TallyValidationError("from must be on or before to");
        }
    }
}
