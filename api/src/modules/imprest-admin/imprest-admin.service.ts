import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";

/** A Drizzle db handle or an in-flight transaction handle. */
type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];
export type DbOrTx = DbInstance | Tx;

export interface TallyLedgerInfo {
    id: number;
    name: string;
    parent: string | null;
    isActive: boolean;
}

export type VoucherLedgerReviewProof = string | { url: string; type?: string; name?: string };

export interface VoucherLedgerReviewItem {
    id: number;
    categoryId: number | null;
    category: string | null;
    projectId: number | null;
    projectName: string | null;
    projectCode: string | null;
    projectTeam: string | null;
    remark: string | null;
    invoiceProof: VoucherLedgerReviewProof[];
    amount: number;
    dateOfExpense: Date | null;
    context: CategoryLedgerContext;
    autoLedger: TallyLedgerInfo | null;
    overrideLedger: TallyLedgerInfo | null;
    finalLedger: TallyLedgerInfo | null;
    candidates: TallyLedgerInfo[];
    ledgerSource: "auto" | "manual";
    tallyLedgerId: number | null;
    blocked: boolean;
    problem: "BLOCKED" | "UNMAPPED" | "INACTIVE" | null;
    reviewedBy: number | null;
    reviewedAt: Date | null;
    ledgerNote: string | null;
}

export interface VoucherLedgerReview {
    voucher: {
        id: number;
        voucherCode: string;
        beneficiaryId: number;
        employeeName: string | null;
        teamName: string | null;
        amount: number;
        validFrom: Date;
        validTo: Date;
        accountsSignedBy: string | null;
        accountsSignedAt: Date | null;
        adminSignedBy: string | null;
        adminSignedAt: Date | null;
    };
    items: VoucherLedgerReviewItem[];
    editable: boolean;
    lockReason: string | null;
    summary: {
        total: number;
        auto: number;
        manual: number;
        blocked: number;
        unmapped: number;
        inactive: number;
    };
}

export interface VoucherLedgerSaveEntry {
    imprestId: number;
    ledgerId: number | null;
    note?: string | null;
}

/**
 * Voucher accounting.
 *
 * The `employee_imprest_vouchers` table is the single source of truth for
 * vouchers: every row is one voucher and approval is tracked by the
 * accounts_signed_by / admin_signed_by columns. List and summary queries count
 * the table directly (rather than deriving ISO-week buckets from imprest dates)
 * so historic vouchers — including legacy ones whose valid_from is not a
 * Monday, or which aggregate imprests across several ISO weeks — all remain
 * visible and correctly counted. From 2026-08-01 onwards new vouchers are
 * created with an ISO week Monday boundary via isoWeekBounds().
 */
import { employeeImprestVouchers } from "@/db/schemas/accounts/employee-imprest-voucher";
import { employeeImprestVoucherItems } from "@/db/schemas/accounts/employee-imprest-voucher-item.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { employeeImprestTransactions } from "@/db/schemas/shared/employee-imprest-transaction.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { CreateEmployeeImprestCreditDto } from "./zod/create-employee-imprest-credit.schema";
import type { EmployeeImprestSummaryDto } from "./zod/imprest-admin.dto";
import { imprestCategories, projects, tallyLedgers, tallySyncLedger, teams, userProfiles } from "@/db/schemas";
import { deriveCategoryContext, isBusinessDevelopmentTeam, resolveEntryLedger, type CategoryLedgerContext } from "@/modules/integrations/tally/ledgers/category-ledger-resolver";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class ImprestAdminService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        private readonly config: ConfigService
    ) {}

    /**
     * ADMIN: Employee Imprest Summary
     *
     * Mirrors Laravel logic exactly:
     *  - amountSpent     = SUM(employee_imprests.amount)
     *  - amountReceived  = SUM(employee_imprest_transactions.amount)
     *  - amountApproved  = SUM(employee_imprests.amount WHERE approval_status = 1)
     *  - amountLeft      = amountApproved - amountReceived
     *
     * Only users having at least one imprest entry are returned.
     */

    private formatFinancialYear(startYear: number): string {
        const endYear = (startYear + 1) % 100;
        const formattedEndYear = String(endYear).padStart(2, "0");
        return `${startYear}-${formattedEndYear}`;
    }

    async getEmployeeSummary(): Promise<EmployeeImprestSummaryDto[]> {
        this.logger.info("Fetching employee imprest summary");

        const now = new Date();
        const currentMonth = now.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
        const currentFyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;

        try {
            const rawQuery = sql`
                WITH imprest_agg AS (
                    SELECT
                        user_id,
                        CASE WHEN EXTRACT(MONTH FROM date_of_expense) >= 4 
                             THEN EXTRACT(YEAR FROM date_of_expense) 
                             ELSE EXTRACT(YEAR FROM date_of_expense) - 1 
                        END::int AS fy_start_year,
                        COALESCE(SUM(amount), 0) AS amount_spent,
                        COALESCE(SUM(CASE WHEN approval_status = 1 THEN amount ELSE 0 END), 0) AS amount_approved
                    FROM employee_imprests
                    GROUP BY user_id, fy_start_year
                ),
                txn_agg AS (
                    SELECT
                        user_id,
                        CASE WHEN EXTRACT(MONTH FROM txn_date) >= 4 
                             THEN EXTRACT(YEAR FROM txn_date) 
                             ELSE EXTRACT(YEAR FROM txn_date) - 1 
                        END::int AS fy_start_year,
                        COALESCE(SUM(amount), 0) AS amount_received
                    FROM employee_imprest_transactions
                    GROUP BY user_id, fy_start_year
                ),
                voucher_agg AS (
                    -- Every voucher row is one voucher; approved = the signed
                    -- columns. Counting the table directly (instead of deriving
                    -- ISO-week buckets from imprest dates) keeps the totals
                    -- identical to what listVouchersRaw returns, so the
                    -- consolidated page can never disagree with the voucher list.
                    SELECT
                        u.id AS user_id,
                        CASE WHEN EXTRACT(MONTH FROM v.valid_from) >= 4
                             THEN EXTRACT(YEAR FROM v.valid_from)
                             ELSE EXTRACT(YEAR FROM v.valid_from) - 1
                        END::int AS fy_start_year,
                        COUNT(*) AS total_vouchers,
                        COUNT(*) FILTER (WHERE TRIM(COALESCE(v.accounts_signed_by, '')) <> '') AS accounts_approved,
                        COUNT(*) FILTER (WHERE TRIM(COALESCE(v.admin_signed_by, '')) <> '') AS admin_approved
                    FROM employee_imprest_vouchers v
                    INNER JOIN users u
                        ON u.id = v.beneficiary_name::int
                    GROUP BY u.id, fy_start_year
                ),
                all_user_fy AS (
                    SELECT user_id, fy_start_year FROM imprest_agg
                    UNION
                    SELECT user_id, fy_start_year FROM txn_agg
                    UNION
                    SELECT user_id, fy_start_year FROM voucher_agg
                )
                SELECT
                    u.id AS "userId",
                    u.name AS "userName",
                    f.fy_start_year AS "fyStartYear",
                    COALESCE(i.amount_spent, 0) AS "amountSpent",
                    COALESCE(i.amount_approved, 0) AS "amountApproved",
                    COALESCE(t.amount_received, 0) AS "amountReceived",
                    COALESCE(v.total_vouchers, 0) AS "totalVouchers",
                    COALESCE(v.accounts_approved, 0) AS "accountsApproved",
                    COALESCE(v.admin_approved, 0) AS "adminApproved"
                FROM users u
                INNER JOIN all_user_fy f ON f.user_id = u.id
                LEFT JOIN imprest_agg i ON i.user_id = f.user_id AND i.fy_start_year = f.fy_start_year
                LEFT JOIN txn_agg t ON t.user_id = f.user_id AND t.fy_start_year = f.fy_start_year
                LEFT JOIN voucher_agg v ON v.user_id = f.user_id AND v.fy_start_year = f.fy_start_year
                WHERE EXISTS (
                    SELECT 1 FROM employee_imprests ei WHERE ei.user_id = u.id
                )
                ORDER BY u.name, f.fy_start_year DESC
            `;

            this.logger.debug("Executing final employee summary query");
            const queryResult = await this.db.execute(rawQuery);
            const rows = queryResult.rows;

            this.logger.info("Employee summary query executed", {
                rowsCount: rows.length,
            });

            // Group rows by user
            const userGroups = new Map<
                number,
                {
                    userId: number;
                    userName: string;
                    years: Array<{
                        fyStartYear: number;
                        amountSpent: number;
                        amountApproved: number;
                        amountReceived: number;
                        totalVouchers: number;
                        accountsApproved: number;
                        adminApproved: number;
                    }>;
                }
            >();

            for (const row of rows as any[]) {
                const userId = Number(row.userId);
                if (!userGroups.has(userId)) {
                    userGroups.set(userId, {
                        userId,
                        userName: row.userName,
                        years: [],
                    });
                }
                userGroups.get(userId)!.years.push({
                    fyStartYear: Number(row.fyStartYear),
                    amountSpent: Number(row.amountSpent),
                    amountApproved: Number(row.amountApproved),
                    amountReceived: Number(row.amountReceived),
                    totalVouchers: Number(row.totalVouchers),
                    accountsApproved: Number(row.accountsApproved),
                    adminApproved: Number(row.adminApproved),
                });
            }

            const result: EmployeeImprestSummaryDto[] = [];

            for (const group of userGroups.values()) {
                const currentYearData = group.years.find(y => y.fyStartYear === currentFyStartYear) || {
                    fyStartYear: currentFyStartYear,
                    amountSpent: 0,
                    amountApproved: 0,
                    amountReceived: 0,
                    totalVouchers: 0,
                    accountsApproved: 0,
                    adminApproved: 0,
                };

                const previousYearsData = group.years.filter(y => y.fyStartYear < currentFyStartYear).sort((a, b) => b.fyStartYear - a.fyStartYear);

                const totalSpent = group.years.reduce((sum, y) => sum + y.amountSpent, 0);
                const totalApproved = group.years.reduce((sum, y) => sum + y.amountApproved, 0);
                const totalReceived = group.years.reduce((sum, y) => sum + y.amountReceived, 0);

                const totalVouchers = group.years.reduce((sum, y) => sum + y.totalVouchers, 0);
                const accountsApproved = group.years.reduce((sum, y) => sum + y.accountsApproved, 0);
                const adminApproved = group.years.reduce((sum, y) => sum + y.adminApproved, 0);

                result.push({
                    userId: group.userId,
                    userName: group.userName,

                    amountSpent: totalSpent,
                    amountApproved: totalApproved,
                    amountReceived: totalReceived,
                    amountLeft: totalApproved - totalReceived,

                    voucherInfo: {
                        totalVouchers,
                        accountsApproved,
                        adminApproved,
                    },

                    current: {
                        amountSpent: currentYearData.amountSpent,
                        amountApproved: currentYearData.amountApproved,
                        amountReceived: currentYearData.amountReceived,
                        amountLeft: currentYearData.amountApproved - currentYearData.amountReceived,
                        voucherInfo: {
                            totalVouchers: currentYearData.totalVouchers,
                            accountsApproved: currentYearData.accountsApproved,
                            adminApproved: currentYearData.adminApproved,
                        },
                    },

                    previous: previousYearsData.map(y => ({
                        financialYear: this.formatFinancialYear(y.fyStartYear),
                        fyStartYear: y.fyStartYear,
                        amountSpent: y.amountSpent,
                        amountApproved: y.amountApproved,
                        amountReceived: y.amountReceived,
                        amountLeft: y.amountApproved - y.amountReceived,
                        voucherInfo: {
                            totalVouchers: y.totalVouchers,
                            accountsApproved: y.accountsApproved,
                            adminApproved: y.adminApproved,
                        },
                    })),
                });
            }

            result.sort((a, b) => a.userName.localeCompare(b.userName));

            this.logger.debug("Employee summary mapped successfully");

            return result;
        } catch (error: any) {
            this.logger.error("Failed to fetch employee summary", {
                message: error?.message,
                stack: error?.stack,
            });

            throw error;
        }
    }

    async getPaymentHistory(userId?: number) {
        const whereClause = userId ? eq(employeeImprestTransactions.userId, userId) : undefined;

        const rows = await this.db
            .select({
                id: employeeImprestTransactions.id,
                userId: employeeImprestTransactions.userId,
                teamMemberName: employeeImprestTransactions.teamMemberName,
                date: employeeImprestTransactions.txnDate,
                amount: employeeImprestTransactions.amount,
                projectName: employeeImprestTransactions.projectName,
                createdAt: employeeImprestTransactions.createdAt,
            })
            .from(employeeImprestTransactions)
            .innerJoin(users, eq(users.id, employeeImprestTransactions.userId))
            .where(whereClause)
            .orderBy(desc(employeeImprestTransactions.txnDate));

        return {
            data: rows.map(r => ({
                ...r,
                amount: Number(r.amount),
            })),
        };
    }

    async deletePaymentHistory({ transactionId, deletedBy }: { transactionId: number; deletedBy: number }) {
        // 1️⃣ Check existence
        const [txn] = await this.db
            .select({
                id: employeeImprestTransactions.id,
            })
            .from(employeeImprestTransactions)
            .where(eq(employeeImprestTransactions.id, transactionId))
            .limit(1);

        if (!txn) {
            throw new NotFoundException("Payment transaction not found");
        }

        // 2️⃣ Delete
        await this.db.delete(employeeImprestTransactions).where(eq(employeeImprestTransactions.id, transactionId));

        return {
            success: true,
            message: "Payment history entry deleted successfully",
        };
    }

    async listVouchersRaw(userId?: number, params?: { page?: number; limit?: number; search?: string; fy?: number }) {
        const page = Math.max(1, params?.page ?? 1);
        const limit = Math.max(1, Math.min(params?.limit ?? 50, 100));
        const offset = (page - 1) * limit;
        const search = params?.search?.trim();

        const whereSql = userId ? sql`AND v.beneficiary_name = ${String(userId)}` : sql``;
        const searchCondition = search
            ? sql`
                AND (
                    u.name ILIKE ${`%${search}%`}
                    OR v.voucher_code ILIKE ${`%${search}%`}
                    OR EXTRACT(WEEK FROM v.valid_from)::text ILIKE ${`%${search}%`}
                    OR v.amount::text ILIKE ${`%${search}%`}
                    OR v.accounts_remark ILIKE ${`%${search}%`}
                    OR v.admin_remark ILIKE ${`%${search}%`}
                )
            `
            : sql``;
        const fyCondition = params?.fy ? sql`AND EXTRACT(YEAR FROM v.valid_from::date - INTERVAL '3 months') = ${params.fy}` : sql``;

        const selectSql = sql`
                SELECT
                    v.id AS "id",
                    v.voucher_code AS "voucherCode",

                    u.name AS "beneficiaryName",
                    u.id   AS "beneficiaryId",

                    EXTRACT(ISOYEAR FROM v.valid_from)::int AS year,
                    EXTRACT(WEEK FROM v.valid_from)::int AS week,
                    v.valid_from::date AS "validFrom",
                    v.valid_to::date   AS "validTo",

                    v.amount AS "amount",

                    v.accounts_signed_by,
                    v.admin_signed_by,
                    v.accounts_remark,
                    v.admin_remark
                FROM employee_imprest_vouchers v
                INNER JOIN users u
                    ON u.id = v.beneficiary_name::int
                WHERE 1 = 1
                ${whereSql}
                ${searchCondition}
                ${fyCondition}
                ORDER BY EXTRACT(ISOYEAR FROM v.valid_from) DESC, EXTRACT(WEEK FROM v.valid_from) DESC, v.id DESC
        `;

        const countResult = await this.db.execute(sql`SELECT COUNT(*)::int AS "total" FROM (${selectSql}) t`);
        const total = Number(countResult.rows[0]?.total ?? 0);

        const result = await this.db.execute(sql`${selectSql} LIMIT ${limit} OFFSET ${offset}`);

        const fyOptionsResult = await this.db.execute(
            sql`
                SELECT DISTINCT
                    EXTRACT(YEAR FROM (v.valid_from::date - INTERVAL '3 months'))::int AS "fy"
                FROM employee_imprest_vouchers v
                ${userId ? sql`WHERE v.beneficiary_name = ${String(userId)}` : sql``}
                ORDER BY "fy" DESC
            `
        );

        const data = result.rows.map((r: any) => ({
            id: r.id ?? null,
            voucherCode: r.voucherCode ?? null,

            beneficiaryName: r.beneficiaryName,
            beneficiaryId: r.beneficiaryId,

            year: r.year,
            week: r.week,

            validFrom: r.validFrom, // DATE
            validTo: r.validTo, // DATE

            amount: Number(r.amount),

            accountantApproval: !!(r.accounts_signed_by && r.accounts_signed_by.trim()),
            adminApproval: !!(r.admin_signed_by && r.admin_signed_by.trim()),

            accountsRemark: r.accounts_remark ?? null,
            adminRemark: r.admin_remark ?? null,
        }));

        return {
            ...wrapPaginatedResponse(data, total, page, limit),
            fyOptions: fyOptionsResult.rows.map((r: Record<string, unknown>) => Number(r.fy)),
        };
    }

    async createVoucher({ user, userId, validFrom }: { user: any; userId: number; validFrom: Date; validTo: Date }) {
        // Normalize the requested period to the ISO week (Monday-Sunday) so a
        // mid-week start (e.g. Tuesday) maps to the canonical Monday voucher and
        // cannot create a duplicate overlapping the same ISO week.
        const { monday, sunday } = this.isoWeekBounds(new Date(validFrom));
        // Transaction-wrapped so the advisory lock in buildVoucherIfMissing is
        // held until commit (prevents concurrent duplicate voucher creation).
        return this.db.transaction(tx =>
            this.buildVoucherIfMissing(
                {
                    userId,
                    from: monday,
                    to: sunday,
                    createdBy: String(user.sub),
                },
                tx
            )
        );
    }

    private getFinancialYear() {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return String(year).slice(-2);
    }

    async getVoucherByPeriod({ user, userId, from }: { user: any; userId: number; from: Date; to: Date }) {
        // Normalize the requested period to the ISO week (Monday-Sunday) so a
        // mid-week start maps to the canonical voucher and cannot spawn a
        // duplicate for the same week.
        const { monday, sunday } = this.isoWeekBounds(new Date(from));
        const voucher = await this.db.transaction(tx =>
            this.buildVoucherIfMissing(
                {
                    userId,
                    from: monday,
                    to: sunday,
                    createdBy: String(user.sub),
                },
                tx
            )
        );

        return this.getVoucherById({
            user,
            voucherId: voucher.id,
        });
    }

    async getVoucherById({ user, voucherId }: { user: { id: number; role: string }; voucherId: number }) {
        const [voucher] = await this.db
            .select({
                id: employeeImprestVouchers.id,
                voucherCode: employeeImprestVouchers.voucherCode,

                beneficiaryId: employeeImprestVouchers.beneficiaryName,

                amount: employeeImprestVouchers.amount,
                validFrom: employeeImprestVouchers.validFrom,
                validTo: employeeImprestVouchers.validTo,

                accountsSignedBy: employeeImprestVouchers.accountsSignedBy,
                accountsSignedAt: employeeImprestVouchers.accountsSignedAt,
                accountsRemark: employeeImprestVouchers.accountsRemark,

                adminSignedBy: employeeImprestVouchers.adminSignedBy,
                adminSignedAt: employeeImprestVouchers.adminSignedAt,
                adminRemark: employeeImprestVouchers.adminRemark,

                employeeId: users.id,
                employeeName: users.name,
                teamName: teams.name,
            })
            .from(employeeImprestVouchers)
            .leftJoin(users, eq(users.id, sql`${employeeImprestVouchers.beneficiaryName}::int`))
            .leftJoin(teams, eq(teams.id, users.team))
            .where(eq(employeeImprestVouchers.id, voucherId))
            .limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        if (voucher.employeeId == null) {
            throw new NotFoundException("Voucher beneficiary not found");
        }

        const items = await this.db
            .select({
                id: employeeImprests.id,
                category: imprestCategories.name,
                projectName: employeeImprests.projectName,
                projectCode: sql<string>`
            COALESCE(p.project_code, '-')
        `.as("projectCode"),

                remark: employeeImprests.remark,
                amount: employeeImprests.amount,
                dateOfExpense: employeeImprests.dateOfExpense,
            })
            .from(employeeImprestVoucherItems)
            .innerJoin(employeeImprests, eq(employeeImprestVoucherItems.imprestId, employeeImprests.id))
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .leftJoin(
                sql`
                LATERAL (
                    SELECT project_code
                    FROM projects
                    WHERE projects.project_name = ${employeeImprests.projectName}
                    ORDER BY projects.id
                    LIMIT 1
                ) p
                `,
                sql`TRUE`
            )
            .where(and(eq(employeeImprestVoucherItems.voucherId, voucher.id), eq(employeeImprests.approvalStatus, 1)))
            .orderBy(sql`${employeeImprests.dateOfExpense}, ${employeeImprests.id}`);

        // Amount integrity: stored voucher.amount must equal the sum of the
        // linked approved imprests. Auto-correct unsigned vouchers (with a
        // warning); a signed week cannot be silently rewritten — 409 instead.
        const computedAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
        const storedAmount = Number(voucher.amount);
        const isAccountsSigned = typeof voucher.accountsSignedBy === "string" && voucher.accountsSignedBy.trim() !== "";

        if (Math.abs(computedAmount - storedAmount) > 0.001) {
            if (isAccountsSigned) {
                throw new ConflictException(
                    `Voucher ${voucher.voucherCode} amount mismatch: stored ${storedAmount}, linked ${computedAmount}. ` +
                        "Week is already approved by accounts and cannot be auto-corrected."
                );
            }

            await this.recomputeVoucherAmount(voucher.id);
            voucher.amount = computedAmount;
            this.logger.warn(`Auto-corrected voucher ${voucher.voucherCode} amount ${storedAmount} -> ${computedAmount} (drifted from linked imprests)`, {
                voucherId: voucher.id,
                storedAmount,
                computedAmount,
            });
        }

        return {
            voucher: {
                id: voucher.id,
                voucherCode: voucher.voucherCode,

                beneficiaryId: Number(voucher.beneficiaryId),
                beneficiaryName: voucher.employeeName,
                employeeName: voucher.employeeName,
                teamName: voucher.teamName,

                validFrom: voucher.validFrom,
                validTo: voucher.validTo,

                amount: Number(voucher.amount),

                accountsSignedBy: voucher.accountsSignedBy,
                accountsSignedAt: voucher.accountsSignedAt,
                accountsRemark: voucher.accountsRemark,

                adminSignedBy: voucher.adminSignedBy,
                adminSignedAt: voucher.adminSignedAt,
                adminRemark: voucher.adminRemark,
            },

            items: items.map(item => ({
                ...item,
                amount: Number(item.amount),
            })),
        };
    }

    async buildVoucherIfMissing({ userId, from, to, createdBy }: { userId: number; from: Date; to: Date; createdBy: string }, tx: DbOrTx = this.db) {
        // Serialize concurrent creation for the same (beneficiary, week window).
        // pg_advisory_xact_lock is released when the enclosing transaction
        // commits/rolls back, so two racing approvals cannot create duplicates.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`imprest-voucher|${userId}|${from.getTime()}|${to.getTime()}`})::bigint)`);

        const [existingByWeek] = await tx
            .select()
            .from(employeeImprestVouchers)
            .where(
                and(
                    eq(employeeImprestVouchers.beneficiaryName, String(userId)),
                    sql`
                    EXTRACT(ISOYEAR FROM ${employeeImprestVouchers.validFrom}) = EXTRACT(ISOYEAR FROM CAST(${from} AS TIMESTAMP))
                    AND EXTRACT(WEEK FROM ${employeeImprestVouchers.validFrom}) = EXTRACT(WEEK FROM CAST(${from} AS TIMESTAMP))
                `
                )
            )
            .orderBy(
                sql`CASE WHEN TRIM(COALESCE(${employeeImprestVouchers.accountsSignedBy}, '')) <> '' OR TRIM(COALESCE(${employeeImprestVouchers.adminSignedBy}, '')) <> '' THEN 0 ELSE 1 END`
            )
            .limit(1);

        if (existingByWeek) {
            return existingByWeek;
        }

        const imprests = await tx
            .select({ id: employeeImprests.id, amount: employeeImprests.amount })
            .from(employeeImprests)
            .where(
                and(
                    eq(employeeImprests.userId, userId),
                    eq(employeeImprests.approvalStatus, 1),
                    sql`
                    ${employeeImprests.dateOfExpense}::date
                    BETWEEN ${from}::date AND ${to}::date
                `
                )
            );

        if (imprests.length === 0) {
            throw new BadRequestException("No imprests found for selected period");
        }

        const totalAmount = imprests.reduce((sum, r) => sum + Number(r.amount), 0);

        const [voucher] = await tx
            .insert(employeeImprestVouchers)
            .values({
                voucherCode: await this.generateVoucherCode(tx),
                beneficiaryName: String(userId),
                amount: totalAmount,
                validFrom: from, // time no longer matters
                validTo: to,
                preparedBy: createdBy,
            })
            .returning();

        // Persist the explicit voucher <-> imprest links so no approved entry
        // within the period can ever be missed from this voucher.
        if (imprests.length > 0) {
            await this.linkImprestsToVoucher(
                voucher.id,
                imprests.map(r => r.id),
                tx
            );
        }

        return voucher;
    }

    /* ----------------------- VOUCHER <-> IMPREST LINKS ------------------------ */

    private isoWeekBounds(date: Date): { monday: Date; sunday: Date } {
        // Derive the ISO week boundary from the Asia/Kolkata (IST) wall-clock,
        // not the server's local timezone. IST is a fixed +05:30 offset (no DST),
        // so shifting the instant by +5.5h makes the UTC components represent the
        // IST calendar date. This ensures an expense made near IST midnight on a
        // Monday never lands in the previous ISO week.
        const istMs = date.getTime() + 5.5 * 3600 * 1000;
        const ist = new Date(istMs);
        const y = ist.getUTCFullYear();
        const m = ist.getUTCMonth();
        const d = ist.getUTCDate();
        const weekday = ist.getUTCDay(); // 0=Sun ... 6=Sat
        const day = (weekday + 6) % 7; // Monday = 0 ... Sunday = 6

        // Monday 00:00 IST expressed as a UTC instant.
        const monday = new Date(Date.UTC(y, m, d - day, 0, 0, 0) - 5.5 * 3600 * 1000);
        const sunday = new Date(monday.getTime() + 6 * 24 * 3600 * 1000);
        return { monday, sunday };
    }

    private async linkImprestsToVoucher(voucherId: number, imprestIds: number[], tx: DbOrTx = this.db) {
        if (imprestIds.length === 0) return;
        await tx
            .insert(employeeImprestVoucherItems)
            .values(imprestIds.map(imprestId => ({ voucherId, imprestId })))
            .onConflictDoNothing();
    }

    private async recomputeVoucherAmount(voucherId: number, tx: DbOrTx = this.db) {
        await tx.execute(sql`
            UPDATE employee_imprest_vouchers v
            SET amount = COALESCE(
                    (
                        SELECT SUM(ei.amount)
                        FROM employee_imprest_voucher_items vi
                        JOIN employee_imprests ei ON ei.id = vi.imprest_id
                        WHERE vi.voucher_id = ${voucherId}
                    ),
                    0
                ),
                updated_at = now()
            WHERE v.id = ${voucherId}
        `);
    }

    private async deleteVoucherIfEmpty(voucherId: number, tx: DbOrTx = this.db) {
        // A voucher is only auto-removable when it holds no linked imprests AND
        // has not been approved by accounts or admin (signed weeks are retained
        // even if all items later leave).
        await tx.execute(sql`
            DELETE FROM employee_imprest_vouchers v
            WHERE v.id = ${voucherId}
              AND TRIM(COALESCE(v.accounts_signed_by, '')) = ''
              AND TRIM(COALESCE(v.admin_signed_by, '')) = ''
              AND NOT EXISTS (
                  SELECT 1 FROM employee_imprest_voucher_items vi WHERE vi.voucher_id = ${voucherId}
              )
        `);
    }

    /**
     * Ensures an approved imprest is linked to (and, if needed, creates) the
     * voucher whose valid_from..valid_to window covers its expense date.
     */
    async ensureVoucherForImprest(
        { imprestId, userId, effectiveDate, createdBy }: { imprestId: number; userId: number; effectiveDate: Date; createdBy: string },
        tx: DbOrTx = this.db
    ) {
        if (!userId) {
            return null;
        }

        if (!effectiveDate) {
            throw new BadRequestException("Imprest has no date of expense — cannot assign to a voucher.");
        }

        const { monday, sunday } = this.isoWeekBounds(effectiveDate);

        const voucher = await this.buildVoucherIfMissing(
            {
                userId,
                from: monday,
                to: sunday,
                createdBy,
            },
            tx
        );

        const isVoucherSigned = voucher.accountsSignedBy && voucher.accountsSignedBy.trim() !== "";

        // Already linked? Nothing to do.
        const [existingLink] = await tx
            .select({ id: employeeImprestVoucherItems.imprestId })
            .from(employeeImprestVoucherItems)
            .where(and(eq(employeeImprestVoucherItems.voucherId, voucher.id), eq(employeeImprestVoucherItems.imprestId, imprestId)))
            .limit(1);

        if (!existingLink) {
            // Mutating a signed voucher is not allowed. Approving into an
            // accounts-signed week is a week-lock violation — fail fast rather
            // than leave the imprest approved but excluded from its voucher.
            if (isVoucherSigned) {
                throw new ForbiddenException(`Cannot link imprest to voucher ${voucher.voucherCode} — expense week is already approved by accounts.`);
            }

            await this.linkImprestsToVoucher(voucher.id, [imprestId], tx);
            await this.recomputeVoucherAmount(voucher.id, tx);
        }

        return voucher;
    }

    /**
     * Removes an imprest from any voucher it is linked to, recomputes the
     * voucher amount, and drops the voucher if it became empty (and unsigned).
     * Throws if the imprest is part of an accounts-signed voucher.
     */
    async removeImprestFromVoucher(imprestId: number, tx: DbOrTx = this.db) {
        const links = await tx
            .select({ voucherId: employeeImprestVoucherItems.voucherId })
            .from(employeeImprestVoucherItems)
            .where(eq(employeeImprestVoucherItems.imprestId, imprestId));

        for (const link of links) {
            const [voucher] = await tx
                .select({ id: employeeImprestVouchers.id, accountsSignedBy: employeeImprestVouchers.accountsSignedBy })
                .from(employeeImprestVouchers)
                .where(eq(employeeImprestVouchers.id, link.voucherId))
                .limit(1);

            if (voucher && voucher.accountsSignedBy && voucher.accountsSignedBy.trim() !== "") {
                throw new BadRequestException("This imprest is part of a voucher already approved by accounts and cannot be modified.");
            }

            await tx
                .delete(employeeImprestVoucherItems)
                .where(and(eq(employeeImprestVoucherItems.voucherId, link.voucherId), eq(employeeImprestVoucherItems.imprestId, imprestId)));

            if (voucher) {
                await this.recomputeVoucherAmount(voucher.id, tx);
                await this.deleteVoucherIfEmpty(voucher.id, tx);
            }
        }
    }

    private async generateVoucherCode(tx: DbOrTx = this.db) {
        const year = this.getFinancialYear();

        // Serialize code allocation for the FY across concurrent creators.
        // Must run inside a transaction (advisory lock releases at commit).
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`imprest-voucher-code|${year}`})::bigint)`);

        const result = await tx.execute<{
            max: number | null;
        }>(sql`
        SELECT
            MAX(
                CAST(
                    REGEXP_REPLACE(voucher_code, '^.*/V', '', 'g')
                    AS INTEGER
                )
            ) AS max
        FROM employee_imprest_vouchers
        WHERE voucher_code LIKE ${`VE/${year}/V%`}
    `);

        const max = result.rows[0]?.max ?? 0;
        const next = max + 1;

        return `VE/${year}/V${String(next).padStart(3, "0")}`;
    }

    async accountApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string }; voucherId: number; remark?: string; approve: boolean }) {
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        if (approve && voucher.accountsSignedBy) {
            throw new BadRequestException("Voucher already approved by accounts");
        }

        if (approve && this.isTallyIntegrationEnabled()) {
            await this.assertVoucherLedgersResolved(voucherId);
        }

        const [profile] = await this.db.select({ signature: userProfiles.signature }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        console.log("profile", profile);

        await this.db.transaction(async tx => {
            // Amount must reflect the linked imprests before the week gets
            // locked by this signature.
            await this.recomputeVoucherAmount(voucherId, tx);

            await tx
                .update(employeeImprestVouchers)
                .set({
                    accountsRemark: remark ?? voucher.accountsRemark,

                    ...(approve && {
                        accountsSignedBy: profile?.signature ?? "kailash.jpg",
                        accountsSignedAt: new Date(),
                    }),
                })
                .where(eq(employeeImprestVouchers.id, voucherId));
        });

        return {
            success: true,
            message: approve ? "Voucher approved by accounts" : "Remark saved successfully",
        };
    }

    async adminApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string }; voucherId: number; remark?: string; approve: boolean }) {
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        if (approve && voucher.adminSignedBy) {
            throw new BadRequestException("Voucher already approved by admin");
        }

        //check for ceo approval w/o accounts approval
        if (approve && !voucher.accountsSignedBy) {
            throw new BadRequestException("Admin Approval can only be done once the Account Approval has been submitted");
        }

        if (approve && this.isTallyIntegrationEnabled()) {
            await this.assertVoucherLedgersResolved(voucherId);
        }

        const [profile] = await this.db.select({ signature: userProfiles.signature }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

        await this.db.transaction(async tx => {
            await this.recomputeVoucherAmount(voucherId, tx);

            await tx
                .update(employeeImprestVouchers)
                .set({
                    adminRemark: remark ?? voucher.adminRemark,

                    ...(approve && {
                        adminSignedBy: profile?.signature ?? "piyush.jpeg",
                        adminSignedAt: new Date(),
                    }),
                })
                .where(eq(employeeImprestVouchers.id, voucherId));
        });

        return {
            success: true,
            message: approve ? "Voucher approved by admin" : "Remark saved successfully",
        };
    }

    async delete(id: number) {
        const existing = await this.db
            .select()
            .from(employeeImprestTransactions)
            .where(eq(employeeImprestTransactions.id, id))
            .limit(1)
            .then(r => r[0] ?? null);

        if (!existing) {
            throw new NotFoundException("Transaction not found");
        }

        await this.db.delete(employeeImprestTransactions).where(eq(employeeImprestTransactions.id, id));

        return { success: true };
    }

    async creditImprest(data: CreateEmployeeImprestCreditDto, adminUserId: number) {
        const note = data.projectName ?? `Transferred to ${data.userId}`;

        const [created] = await this.db
            .insert(employeeImprestTransactions)
            .values({
                userId: data.userId,
                txnDate: data.txnDate,
                teamMemberName: data.teamMemberName,
                amount: data.amount,
                projectName: note,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return created;
    }

    async getUserAmts(userId: number) {
        const [imprestAgg] = await this.db
            .select({
                amountSpent: sql<number>`
        COALESCE(SUM(${employeeImprests.amount}), 0)
      `,
                amountApproved: sql<number>`
        COALESCE(
          SUM(
            CASE 
              WHEN ${employeeImprests.approvalStatus} = 1 
              THEN ${employeeImprests.amount} 
              ELSE 0 
            END
          ),
          0
        )
      `,
            })
            .from(employeeImprests)
            .where(eq(employeeImprests.userId, userId));

        const [txnAgg] = await this.db
            .select({
                amountReceived: sql<number>`
        COALESCE(SUM(${employeeImprestTransactions.amount}), 0)
      `,
            })
            .from(employeeImprestTransactions)
            .where(eq(employeeImprestTransactions.userId, userId));

        const amountSpent = Number(imprestAgg.amountSpent);
        const amountApproved = Number(imprestAgg.amountApproved);
        const amountReceived = Number(txnAgg.amountReceived);

        return {
            amountSpent,
            amountApproved,
            amountReceived,
            amountLeft: amountApproved - amountReceived,
        };
    }

    async getVoucherLedgerReview(voucherId: number): Promise<VoucherLedgerReview> {
        return this.loadVoucherLedgerReview(voucherId);
    }

    async saveVoucherLedgers(voucherId: number, user: { sub: number }, entries: VoucherLedgerSaveEntry[]): Promise<VoucherLedgerReview> {
        const review = await this.loadVoucherLedgerReview(voucherId);

        if (!review.editable) {
            throw new ForbiddenException(review.lockReason ?? "Voucher ledgers are locked");
        }

        const itemIds = new Set(review.items.map(item => item.id));

        for (const entry of entries) {
            if (!itemIds.has(entry.imprestId)) {
                throw new BadRequestException(`Imprest ${entry.imprestId} is not part of voucher ${voucherId}`);
            }
        }

        const ledgerIds = [...new Set(entries.map(entry => entry.ledgerId).filter((id): id is number => id !== null))];

        if (ledgerIds.length > 0) {
            const company = this.requireTallyCompany();
            const ledgers = await this.db
                .select({ id: tallyLedgers.id, isActive: tallyLedgers.isActive })
                .from(tallyLedgers)
                .where(and(eq(tallyLedgers.company, company), inArray(tallyLedgers.id, ledgerIds)));

            const found = new Map(ledgers.map(ledger => [ledger.id, ledger.isActive] as const));

            for (const ledgerId of ledgerIds) {
                if (!found.has(ledgerId)) {
                    throw new BadRequestException(`Tally ledger ${ledgerId} does not exist for this company`);
                }

                if (!found.get(ledgerId)) {
                    throw new BadRequestException(`Tally ledger ${ledgerId} is inactive`);
                }
            }
        }

        const reviewedAt = new Date();

        await this.db.transaction(async tx => {
            for (const entry of entries) {
                await tx
                    .update(employeeImprests)
                    .set({
                        tallyLedgerId: entry.ledgerId,
                        tallyLedgerSource: entry.ledgerId === null ? "auto" : "manual",
                        tallyLedgerReviewedBy: user.sub,
                        tallyLedgerReviewedAt: reviewedAt,
                        tallyLedgerNote: entry.note ?? null,
                        updatedAt: reviewedAt,
                    })
                    .where(eq(employeeImprests.id, entry.imprestId));
            }
        });

        return this.loadVoucherLedgerReview(voucherId);
    }

    async searchLedgerOptions(params: { q?: string; page?: number; limit?: number } = {}): Promise<{
        data: Array<{ id: number; name: string; parent: string | null }>;
        total: number;
        page: number;
        limit: number;
    }> {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(200, Math.max(1, params.limit ?? 50));
        const company = this.getTallySettings().company;

        if (!company) {
            return { data: [], total: 0, page, limit };
        }

        const search = params.q?.trim();
        const where = search
            ? and(eq(tallyLedgers.company, company), eq(tallyLedgers.isActive, true), ilike(tallyLedgers.name, `%${search}%`))
            : and(eq(tallyLedgers.company, company), eq(tallyLedgers.isActive, true));

        const [data, totalRows] = await Promise.all([
            this.db
                .select({ id: tallyLedgers.id, name: tallyLedgers.name, parent: tallyLedgers.parent })
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

        return { data, total: Number(totalRows[0]?.total ?? 0), page, limit };
    }

    private async assertVoucherLedgersResolved(voucherId: number): Promise<void> {
        if (!this.isTallyIntegrationEnabled()) {
            return;
        }

        const review = await this.loadVoucherLedgerReview(voucherId);
        const problems = review.items.filter(item => item.problem !== null);

        if (problems.length > 0) {
            const detail = problems.map(item => `imprest #${item.id} (${item.problem})`).join(", ");
            throw new BadRequestException(`Voucher ${review.voucher.voucherCode} has unresolved Tally ledger(s): ${detail}`);
        }
    }

    private async loadVoucherLedgerReview(voucherId: number, tx: DbOrTx = this.db): Promise<VoucherLedgerReview> {
        const [voucher] = await tx
            .select({
                id: employeeImprestVouchers.id,
                voucherCode: employeeImprestVouchers.voucherCode,
                beneficiaryName: employeeImprestVouchers.beneficiaryName,
                amount: employeeImprestVouchers.amount,
                validFrom: employeeImprestVouchers.validFrom,
                validTo: employeeImprestVouchers.validTo,
                accountsSignedBy: employeeImprestVouchers.accountsSignedBy,
                accountsSignedAt: employeeImprestVouchers.accountsSignedAt,
                adminSignedBy: employeeImprestVouchers.adminSignedBy,
                adminSignedAt: employeeImprestVouchers.adminSignedAt,
            })
            .from(employeeImprestVouchers)
            .where(eq(employeeImprestVouchers.id, voucherId))
            .limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        const beneficiaryId = Number(voucher.beneficiaryName);

        if (!Number.isInteger(beneficiaryId) || beneficiaryId <= 0) {
            throw new NotFoundException("Voucher beneficiary not found");
        }

        const [beneficiary] = await tx
            .select({ id: users.id, name: users.name, team: users.team, primaryTeamId: users.primaryTeamId })
            .from(users)
            .where(eq(users.id, beneficiaryId))
            .limit(1);

        const teamIds = beneficiary ? [beneficiary.team, beneficiary.primaryTeamId].filter((id): id is number => id !== null) : [];
        const teamRows = teamIds.length > 0 ? await tx.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
        const teamNames = new Map(teamRows.map(team => [team.id, team.name] as const));
        const employeeIsBusinessDevelopment = teamIds.some(id => isBusinessDevelopmentTeam(teamNames.get(id)));
        const employeeTeamName = teamIds.length > 0 ? (teamNames.get(teamIds[0]) ?? null) : null;

        const rows = await tx
            .select({
                id: employeeImprests.id,
                categoryId: employeeImprests.categoryId,
                category: imprestCategories.name,
                categoryBlocked: imprestCategories.tallyBlocked,
                categoryDefaultLedgerId: imprestCategories.tallyLedgerId,
                categoryProjectLedgerId: imprestCategories.projectLedgerId,
                categoryBdLedgerId: imprestCategories.businessDevelopmentLedgerId,
                projectId: employeeImprests.projectId,
                projectName: employeeImprests.projectName,
                projectCode: projects.projectCode,
                projectTeam: projects.teamName,
                remark: employeeImprests.remark,
                invoiceProof: employeeImprests.invoiceProof,
                amount: employeeImprests.amount,
                dateOfExpense: employeeImprests.dateOfExpense,
                overrideLedgerId: employeeImprests.tallyLedgerId,
                reviewedBy: employeeImprests.tallyLedgerReviewedBy,
                reviewedAt: employeeImprests.tallyLedgerReviewedAt,
                ledgerNote: employeeImprests.tallyLedgerNote,
            })
            .from(employeeImprestVoucherItems)
            .innerJoin(employeeImprests, eq(employeeImprestVoucherItems.imprestId, employeeImprests.id))
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .leftJoin(projects, eq(projects.id, employeeImprests.projectId))
            .where(and(eq(employeeImprestVoucherItems.voucherId, voucherId), eq(employeeImprests.approvalStatus, 1)))
            .orderBy(asc(employeeImprests.dateOfExpense), asc(employeeImprests.id));

        const ledgerIds = new Set<number>();

        for (const row of rows) {
            for (const id of [row.overrideLedgerId, row.categoryDefaultLedgerId, row.categoryProjectLedgerId, row.categoryBdLedgerId]) {
                if (id !== null) {
                    ledgerIds.add(id);
                }
            }
        }

        const ledgerRows =
            ledgerIds.size > 0
                ? await tx
                      .select({ id: tallyLedgers.id, name: tallyLedgers.name, parent: tallyLedgers.parent, isActive: tallyLedgers.isActive })
                      .from(tallyLedgers)
                      .where(inArray(tallyLedgers.id, [...ledgerIds]))
                : [];

        const ledgersById = new Map(ledgerRows.map(ledger => [ledger.id, ledger] as const));
        const toInfo = (id: number | null): TallyLedgerInfo | null => {
            if (id === null) {
                return null;
            }

            const ledger = ledgersById.get(id);

            return ledger ? { id: ledger.id, name: ledger.name, parent: ledger.parent, isActive: ledger.isActive } : null;
        };

        const items: VoucherLedgerReviewItem[] = rows.map(row => {
            const context = deriveCategoryContext({
                projectId: row.projectId,
                projectTeamName: row.projectTeam,
                employeeIsBusinessDevelopment,
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

            const autoLedger = toInfo(resolution.autoLedgerId);
            const overrideLedger = toInfo(row.overrideLedgerId);
            const finalLedger = toInfo(resolution.finalLedgerId);
            const problem: VoucherLedgerReviewItem["problem"] = resolution.blocked
                ? "BLOCKED"
                : resolution.finalLedgerId === null
                  ? "UNMAPPED"
                  : !finalLedger || !finalLedger.isActive
                    ? "INACTIVE"
                    : null;

            const candidates = [autoLedger, toInfo(row.categoryDefaultLedgerId), toInfo(row.categoryProjectLedgerId), toInfo(row.categoryBdLedgerId), overrideLedger, finalLedger]
                .filter((ledger): ledger is TallyLedgerInfo => ledger !== null)
                .filter((ledger, index, all) => all.findIndex(candidate => candidate.id === ledger.id) === index);

            return {
                id: row.id,
                categoryId: row.categoryId,
                category: row.category,
                projectId: row.projectId,
                projectName: row.projectName,
                projectCode: row.projectCode,
                projectTeam: row.projectTeam,
                remark: row.remark,
                invoiceProof: Array.isArray(row.invoiceProof) ? (row.invoiceProof as VoucherLedgerReviewProof[]) : [],
                amount: Number(row.amount),
                dateOfExpense: row.dateOfExpense,
                context,
                autoLedger,
                overrideLedger,
                finalLedger,
                candidates,
                ledgerSource: resolution.source,
                tallyLedgerId: row.overrideLedgerId,
                blocked: resolution.blocked,
                problem,
                reviewedBy: row.reviewedBy,
                reviewedAt: row.reviewedAt,
                ledgerNote: row.ledgerNote,
            };
        });

        const [posted] = await tx
            .select({ id: tallySyncLedger.id })
            .from(tallySyncLedger)
            .where(and(eq(tallySyncLedger.entityType, "imprest_voucher"), eq(tallySyncLedger.entityId, String(voucherId)), eq(tallySyncLedger.status, "posted")))
            .limit(1);

        const lockReason = voucher.accountsSignedAt !== null ? "Voucher is already signed by accounts" : posted ? "Voucher is already posted to Tally" : null;

        return {
            voucher: {
                id: voucher.id,
                voucherCode: voucher.voucherCode,
                beneficiaryId,
                employeeName: beneficiary?.name ?? null,
                teamName: employeeTeamName,
                amount: Number(voucher.amount),
                validFrom: voucher.validFrom,
                validTo: voucher.validTo,
                accountsSignedBy: voucher.accountsSignedBy,
                accountsSignedAt: voucher.accountsSignedAt,
                adminSignedBy: voucher.adminSignedBy,
                adminSignedAt: voucher.adminSignedAt,
            },
            items,
            editable: lockReason === null,
            lockReason,
            summary: {
                total: items.length,
                auto: items.filter(item => item.ledgerSource === "auto").length,
                manual: items.filter(item => item.ledgerSource === "manual").length,
                blocked: items.filter(item => item.problem === "BLOCKED").length,
                unmapped: items.filter(item => item.problem === "UNMAPPED").length,
                inactive: items.filter(item => item.problem === "INACTIVE").length,
            },
        };
    }

    private getTallySettings(): { enabled: boolean; company: string | null } {
        return this.config.get<{ enabled: boolean; company: string | null }>("tally") ?? { enabled: false, company: null };
    }

    private isTallyIntegrationEnabled(): boolean {
        return this.getTallySettings().enabled;
    }

    private requireTallyCompany(): string {
        const company = this.getTallySettings().company;

        if (!company) {
            throw new BadRequestException("TALLY_COMPANY is not configured");
        }

        return company;
    }
}
