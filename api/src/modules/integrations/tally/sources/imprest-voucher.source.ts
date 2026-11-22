import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import { employeeImprestVoucherItems, employeeImprestVouchers, employeeImprests, projects, users } from "@/db/schemas";
import type { DbInstance } from "@db";
import { and, asc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { TallyValidationError } from "../errors/tally.errors";
import { IMPREST_TALLY_CONFIG, type ImprestTallyConfig } from "../mappings/imprest-tally.config";
import { buildVoucherSnapshot, type VoucherLineInput, type VoucherSnapshot } from "./voucher-snapshot.builder";

export interface ListSnapshotsParams {
    from: Date;
    to: Date;
    config?: ImprestTallyConfig;
}

const BENEFICIARY_ID = sql<number | null>`CASE WHEN ${employeeImprestVouchers.beneficiaryName} ~ '^[0-9]+$' THEN ${employeeImprestVouchers.beneficiaryName}::int ELSE NULL END`;

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

        const employeeRowsPromise: Promise<{ id: number; name: string }[]> =
            employeeIds.length > 0 ? this.db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, employeeIds)) : Promise.resolve([]);

        const [employeeRows, lineRows] = await Promise.all([
            employeeRowsPromise,
            this.db
                .select({
                    voucherId: employeeImprestVoucherItems.voucherId,
                    imprestId: employeeImprests.id,
                    amount: sql<string | null>`${employeeImprests.amount}::text`,
                    categoryId: employeeImprests.categoryId,
                    projectCode: projects.projectCode,
                    dateOfExpense: employeeImprests.dateOfExpense,
                    approvalStatus: employeeImprests.approvalStatus,
                })
                .from(employeeImprestVoucherItems)
                .innerJoin(employeeImprests, eq(employeeImprests.id, employeeImprestVoucherItems.imprestId))
                .leftJoin(projects, eq(projects.id, employeeImprests.projectId))
                .where(inArray(employeeImprestVoucherItems.voucherId, voucherIds))
                .orderBy(asc(employeeImprestVoucherItems.voucherId), asc(employeeImprests.id)),
        ]);

        const employeeNames = new Map(employeeRows.map(row => [row.id, row.name] as const));
        const linesByVoucher = new Map<number, VoucherLineInput[]>();

        for (const row of lineRows) {
            const lines = linesByVoucher.get(row.voucherId) ?? [];

            lines.push({
                imprestId: row.imprestId,
                amount: row.amount,
                categoryId: row.categoryId,
                projectCode: row.projectCode,
                dateOfExpense: row.dateOfExpense,
                approvalStatus: row.approvalStatus,
            });

            linesByVoucher.set(row.voucherId, lines);
        }

        const config = params.config ?? IMPREST_TALLY_CONFIG;

        return vouchers.map(voucher =>
            buildVoucherSnapshot(config, {
                voucherId: voucher.voucherId,
                voucherCode: voucher.voucherCode,
                employeeId: voucher.employeeId,
                employeeName: voucher.employeeId === null ? null : (employeeNames.get(voucher.employeeId) ?? null),
                amount: voucher.amount,
                validFrom: voucher.validFrom,
                validTo: voucher.validTo,
                accountsSignedAt: voucher.accountsSignedAt,
                lines: linesByVoucher.get(voucher.voucherId) ?? [],
            })
        );
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
