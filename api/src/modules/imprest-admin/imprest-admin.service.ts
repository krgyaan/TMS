import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { sql, eq, desc, SQL, and, gte, lte } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { users } from "@/db/schemas/auth/users.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { employeeImprestTransactions } from "@/db/schemas/shared/employee-imprest-transaction.schema";
import { employeeImprestVouchers } from "@/db/schemas/accounts/employee-imprest-voucher";

import type { EmployeeImprestSummaryDto } from "./zod/imprest-admin.dto";
import { admin } from "googleapis/build/src/apis/admin";
import { CreateEmployeeImprestCreditDto } from "./zod/create-employee-imprest-credit.schema";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { imprestCategories, teams, userProfiles } from "@/db/schemas";
import { projects } from "@/db/schemas/operations/projects.schema";

@Injectable()
export class ImprestAdminService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
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

    /**
     * Returns ISO-8601 week number for a given date
     * Week starts on Monday
     */
    private getISOWeek(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

        // Thursday determines the year
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

        return weekNo;
    }

    async getEmployeeSummary(): Promise<EmployeeImprestSummaryDto[]> {
        this.logger.info("Fetching employee imprest summary");

        const now = new Date();
        const currentMonth = now.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
        const fyStartYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStartDate = `${fyStartYear}-04-01`;

        try {
            const rawQuery = sql`
                WITH imprest_agg AS (
                    SELECT
                        user_id,
                        COALESCE(SUM(CASE WHEN COALESCE(approved_date, created_at) >= ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_spent_current,
                        COALESCE(SUM(CASE WHEN COALESCE(approved_date, created_at) < ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_spent_previous,
                        COALESCE(SUM(CASE WHEN approval_status = 1 AND COALESCE(approved_date, created_at) >= ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_approved_current,
                        COALESCE(SUM(CASE WHEN approval_status = 1 AND COALESCE(approved_date, created_at) < ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_approved_previous
                    FROM employee_imprests
                    GROUP BY user_id
                ),
                txn_agg AS (
                    SELECT
                        user_id,
                        COALESCE(SUM(CASE WHEN txn_date >= ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_received_current,
                        COALESCE(SUM(CASE WHEN txn_date < ${fyStartDate}::date THEN amount ELSE 0 END), 0) AS amount_received_previous
                    FROM employee_imprest_transactions
                    GROUP BY user_id
                ),
                voucher_base AS (
                    SELECT
                        user_id,
                        COALESCE(approved_date, created_at)::date AS effective_date
                    FROM employee_imprests
                    WHERE approval_status = 1
                ),
                voucher_amounts AS (
                    SELECT
                        user_id,
                        EXTRACT(YEAR FROM effective_date)::int AS year,
                        EXTRACT(WEEK FROM effective_date)::int AS week,
                        MIN(effective_date) AS start_date,
                        (
                            MIN(effective_date)
                            + (
                                (6 - ((EXTRACT(DOW FROM MIN(effective_date)) + 6) % 7))
                                * INTERVAL '1 day'
                            )
                        )::date AS end_date,
                        MAX(effective_date) AS max_effective_date
                    FROM voucher_base
                    GROUP BY user_id, year, week
                ),
                voucher_agg AS (
                    SELECT
                        a.user_id,
                        COUNT(CASE WHEN a.max_effective_date >= ${fyStartDate}::date THEN a.year END) AS total_vouchers_current,
                        COUNT(CASE WHEN a.max_effective_date < ${fyStartDate}::date THEN a.year END) AS total_vouchers_previous,
                        SUM(CASE WHEN v.accounts_signed_by IS NOT NULL AND a.max_effective_date >= ${fyStartDate}::date THEN 1 ELSE 0 END) AS accounts_approved_current,
                        SUM(CASE WHEN v.accounts_signed_by IS NOT NULL AND a.max_effective_date < ${fyStartDate}::date THEN 1 ELSE 0 END) AS accounts_approved_previous,
                        SUM(CASE WHEN v.admin_signed_by IS NOT NULL AND a.max_effective_date >= ${fyStartDate}::date THEN 1 ELSE 0 END) AS admin_approved_current,
                        SUM(CASE WHEN v.admin_signed_by IS NOT NULL AND a.max_effective_date < ${fyStartDate}::date THEN 1 ELSE 0 END) AS admin_approved_previous
                    FROM voucher_amounts a
                    LEFT JOIN employee_imprest_vouchers v
                        ON v.beneficiary_name = a.user_id::text
                        AND v.valid_from::date = a.start_date
                        AND v.valid_to::date   = a.end_date
                    GROUP BY a.user_id
                )
                SELECT
                    u.id AS "userId",
                    u.name AS "userName",
                    
                    COALESCE(i.amount_spent_current, 0) AS "amountSpentCurrent",
                    COALESCE(i.amount_spent_previous, 0) AS "amountSpentPrevious",
                    
                    COALESCE(i.amount_approved_current, 0) AS "amountApprovedCurrent",
                    COALESCE(i.amount_approved_previous, 0) AS "amountApprovedPrevious",
                    
                    COALESCE(t.amount_received_current, 0) AS "amountReceivedCurrent",
                    COALESCE(t.amount_received_previous, 0) AS "amountReceivedPrevious",
                    
                    COALESCE(v.total_vouchers_current, 0) AS "totalVouchersCurrent",
                    COALESCE(v.total_vouchers_previous, 0) AS "totalVouchersPrevious",
                    
                    COALESCE(v.accounts_approved_current, 0) AS "accountsApprovedCurrent",
                    COALESCE(v.accounts_approved_previous, 0) AS "accountsApprovedPrevious",
                    
                    COALESCE(v.admin_approved_current, 0) AS "adminApprovedCurrent",
                    COALESCE(v.admin_approved_previous, 0) AS "adminApprovedPrevious"
                FROM users u
                INNER JOIN imprest_agg i ON i.user_id = u.id
                LEFT JOIN txn_agg t ON t.user_id = u.id
                LEFT JOIN voucher_agg v ON v.user_id = u.id
                ORDER BY u.name
            `;

            this.logger.debug("Executing final employee summary query");
            const queryResult = await this.db.execute(rawQuery);
            const rows = queryResult.rows;

            this.logger.info("Employee summary query executed", {
                rowsCount: rows.length,
            });

            // ==============================
            // 5️⃣ Map Result
            // ==============================
            const result = rows.map((row: any) => {
                const currentApproved = Number(row.amountApprovedCurrent);
                const currentReceived = Number(row.amountReceivedCurrent);
                const previousApproved = Number(row.amountApprovedPrevious);
                const previousReceived = Number(row.amountReceivedPrevious);

                return {
                    userId: row.userId!,
                    userName: row.userName,

                    // Total for table
                    amountSpent: Number(row.amountSpentCurrent) + Number(row.amountSpentPrevious),
                    amountApproved: currentApproved + previousApproved,
                    amountReceived: currentReceived + previousReceived,
                    amountLeft: (currentApproved + previousApproved) - (currentReceived + previousReceived),

                    voucherInfo: {
                        totalVouchers: Number(row.totalVouchersCurrent) + Number(row.totalVouchersPrevious),
                        accountsApproved: Number(row.accountsApprovedCurrent) + Number(row.accountsApprovedPrevious),
                        adminApproved: Number(row.adminApprovedCurrent) + Number(row.adminApprovedPrevious),
                    },
                    
                    // Segregated for summary cards
                    current: {
                        amountSpent: Number(row.amountSpentCurrent),
                        amountApproved: currentApproved,
                        amountReceived: currentReceived,
                        amountLeft: currentApproved - currentReceived,
                        voucherInfo: {
                            totalVouchers: Number(row.totalVouchersCurrent),
                            accountsApproved: Number(row.accountsApprovedCurrent),
                            adminApproved: Number(row.adminApprovedCurrent),
                        }
                    },
                    previous: {
                        amountSpent: Number(row.amountSpentPrevious),
                        amountApproved: previousApproved,
                        amountReceived: previousReceived,
                        amountLeft: previousApproved - previousReceived,
                        voucherInfo: {
                            totalVouchers: Number(row.totalVouchersPrevious),
                            accountsApproved: Number(row.accountsApprovedPrevious),
                            adminApproved: Number(row.adminApprovedPrevious),
                        }
                    }
                };
            });

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

    // Role-based filtering
    // if (user.role !== "admin") {
    //     conditions.push(eq(employee_imprest_vouchers.beneficiaryName, String(user.id)));
    // }

    async listVouchersRaw(userId?: number) {
        const whereSql = userId ? sql`AND ei.user_id = ${userId}` : sql``;

        const result = await this.db.execute(
            sql`
                /* -------------------------------------------------
                BASE: APPROVED IMPRESTS (DATE ONLY)
                -------------------------------------------------- */
                WITH base AS (
                    SELECT
                        ei.id AS imprest_id,
                        ei.user_id,

                        /* Laravel: COALESCE(approved_date, created_at) */
                        COALESCE(ei.approved_date, ei.created_at)::date AS effective_date,

                        ei.amount,
                        ei.invoice_proof
                    FROM employee_imprests ei
                    WHERE ei.approval_status = 1
                    ${whereSql}
                ),

                /* -------------------------------------------------
                AMOUNTS: GROUP EXACTLY LIKE LARAVEL
                -------------------------------------------------- */
                    amounts AS (
                        SELECT
                            user_id,

                            EXTRACT(YEAR FROM effective_date)::int AS year,
                            EXTRACT(WEEK FROM effective_date)::int AS week,

                            MIN(effective_date) AS start_date,

                            (
                                MIN(effective_date)
                                + (
                                    (6 - ((EXTRACT(DOW FROM MIN(effective_date)) + 6) % 7))
                                    * INTERVAL '1 day'
                                )
                            )::date AS end_date,

                            SUM(amount)::numeric AS total_amount
                        FROM base
                        GROUP BY user_id, year, week
                    ),

                /* -------------------------------------------------
                PROOFS: COLLECT SEPARATELY (NO EFFECT ON SUM)
                -------------------------------------------------- */
                proofs AS (
                    SELECT
                        user_id,
                        EXTRACT(YEAR FROM effective_date)::int AS year,
                        EXTRACT(WEEK FROM effective_date)::int AS week,
                        array_agg(DISTINCT proof)
                            FILTER (WHERE proof IS NOT NULL) AS all_invoice_proofs
                    FROM (
                        SELECT
                            user_id,
                            effective_date,
                            jsonb_array_elements_text(
                                CASE
                                    WHEN jsonb_typeof(invoice_proof) = 'array'
                                    THEN invoice_proof
                                    ELSE '[]'::jsonb
                                END
                            ) AS proof
                        FROM base
                    ) p
                    GROUP BY user_id, year, week
                )

                /* -------------------------------------------------
                FINAL RESULT (DATE MATCH, NOT TIMESTAMP)
                -------------------------------------------------- */
                SELECT
                    v.id AS "id",
                    v.voucher_code AS "voucherCode",

                    u.name AS "beneficiaryName",
                    u.id   AS "beneficiaryId",

                    a.year,
                    a.week,
                    a.start_date AS "validFrom",
                    a.end_date   AS "validTo",

                    a.total_amount AS "amount",
                    p.all_invoice_proofs AS "allInvoiceProofs",

                    v.accounts_signed_by,
                    v.admin_signed_by,
                    v.accounts_remark,
                    v.admin_remark
                FROM amounts a
                INNER JOIN users u
                    ON u.id = a.user_id
                LEFT JOIN proofs p
                    ON p.user_id = a.user_id
                AND p.year = a.year
                AND p.week = a.week
                LEFT JOIN employee_imprest_vouchers v
                    ON v.beneficiary_name = a.user_id::text
                AND v.valid_from::date = a.start_date
                AND v.valid_to::date   = a.end_date
                ORDER BY a.year DESC, a.week DESC
                        `
        );

        return result.rows.map((r: any) => ({
            id: r.id ?? null,
            voucherCode: r.voucherCode ?? null,

            beneficiaryName: r.beneficiaryName,
            beneficiaryId: r.beneficiaryId,

            year: r.year,
            week: r.week,

            validFrom: r.validFrom, // DATE
            validTo: r.validTo, // DATE

            amount: Number(r.amount),

            proofs: (r.allInvoiceProofs ?? []).map((file: string, index: number) => {
                const ext = file.split(".").pop()?.toLowerCase() ?? "";
                return {
                    id: index + 1,
                    file,
                    ext,
                    type: ext === "pdf" ? "pdf" : "image",
                    url: `/uploads/employeeimprest/${file}`,
                };
            }),

            accountantApproval: !!(r.accounts_signed_by && r.accounts_signed_by.trim()),
            adminApproval: !!(r.admin_signed_by && r.admin_signed_by.trim()),

            accountsRemark: r.accounts_remark ?? null,
            adminRemark: r.admin_remark ?? null,
        }));
    }

    async createVoucher({ user, userId, validFrom, validTo }: { user: any; userId: number; validFrom: Date; validTo: Date }) {
        // ✅ THIS is where buildVoucherIfMissing is used
        return this.buildVoucherIfMissing({
            userId,
            from: new Date(validFrom),
            to: new Date(validTo),
            createdBy: String(user.sub),
        });
    }

    async getVoucherProofs({ user, userId, year, week }: { user: any; userId: number; year: number; week: number }) {
        const rows = await this.db.execute(sql`
        SELECT invoice_proof
        FROM employee_imprests
        WHERE user_id = ${userId}
          AND EXTRACT(YEAR FROM COALESCE(approved_date, created_at)) = ${year}
          AND EXTRACT(WEEK FROM COALESCE(approved_date, created_at)) = ${week}
    `);

        const files = rows.rows.flatMap(r => (Array.isArray(r.invoice_proof) ? r.invoice_proof : [])).filter(Boolean);

        const proofs = files.map((file: string, index: number) => {
            const ext = file.split(".").pop()?.toLowerCase() ?? "";
            return {
                id: index + 1,
                file,
                ext,
                type: ext === "pdf" ? "pdf" : "image",
                url: `/uploads/employeeimprest/${file}`,
            };
        });

        return { proofs };
    }
    /* -----------------------------------------
     VOUCHER CODE GENERATOR
  ------------------------------------------ */

    private getFinancialYear() {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return String(year).slice(-2);
    }

    async getVoucherByPeriod({ user, userId, from, to }: { user: any; userId: number; from: Date; to: Date }) {
        const voucher = await this.buildVoucherIfMissing({
            userId,
            from,
            to,
            createdBy: String(user.sub),
        });

        return this.getVoucherById({
            user,
            voucherId: voucher.id,
        });
    }

    async getVoucherById({ user, voucherId }: { user: { id: number; role: string }; voucherId: number }) {
        /* -----------------------------------------
       FETCH VOUCHER + EMPLOYEE (Laravel: $voucher + $abc)
    ------------------------------------------ */

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

                // 👇 Laravel: User::where('id', name_id)
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

        /* -----------------------------------------
       FETCH LINE ITEMS (Laravel: $vo)
       EXACT PARITY WITH:
       whereDate(approved_date)
       where buttonstatus = 1
    ------------------------------------------ */

        const items = await this.db
            .select({
                id: employeeImprests.id,

                category: imprestCategories.name,

                projectName: employeeImprests.projectName,

                // 👇 derived safely (never duplicates)
                projectCode: sql<string>`
            COALESCE(p.project_code, '-')
        `.as("projectCode"),

                remark: employeeImprests.remark,
                amount: employeeImprests.amount,
            })
            .from(employeeImprests)
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            // 👇 SAFE project lookup (NO DUPLICATES)
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
            .where(
                and(
                    eq(employeeImprests.userId, voucher.employeeId),
                    eq(employeeImprests.approvalStatus, 1),
                    sql`
                ${employeeImprests.approvedDate}::date
                BETWEEN ${voucher.validFrom}::date
                AND ${voucher.validTo}::date
            `
                )
            )
            .orderBy(employeeImprests.approvedDate);

        /* -----------------------------------------
       RETURN STRUCTURE (Laravel-equivalent)
    ------------------------------------------ */

        return {
            voucher: {
                id: voucher.id,
                voucherCode: voucher.voucherCode,

                beneficiaryId: Number(voucher.beneficiaryId),
                beneficiaryName: voucher.employeeName,
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

    async buildVoucherIfMissing({ userId, from, to, createdBy }: { userId: number; from: Date; to: Date; createdBy: string }) {
        // 1️⃣ DATE-ONLY lookup (Laravel parity)
        const [existing] = await this.db
            .select()
            .from(employeeImprestVouchers)
            .where(
                and(
                    eq(employeeImprestVouchers.beneficiaryName, String(userId)),
                    sql`${employeeImprestVouchers.validFrom}::date = ${from}::date`,
                    sql`${employeeImprestVouchers.validTo}::date = ${to}::date`
                )
            )
            .limit(1);

        if (existing) {
            return existing;
        }

        // 2️⃣ Fetch imprests (DATE-based, approved only)
        const imprests = await this.db
            .select({ amount: employeeImprests.amount })
            .from(employeeImprests)
            .where(
                and(
                    eq(employeeImprests.userId, userId),
                    eq(employeeImprests.approvalStatus, 1),
                    sql`
                    ${employeeImprests.approvedDate}::date
                    BETWEEN ${from}::date AND ${to}::date
                `
                )
            );

        if (imprests.length === 0) {
            throw new BadRequestException("No imprests found for selected period");
        }

        const totalAmount = imprests.reduce((sum, r) => sum + Number(r.amount), 0);

        // 3️⃣ Create voucher (timestamps irrelevant now)
        const [voucher] = await this.db
            .insert(employeeImprestVouchers)
            .values({
                voucherCode: await this.generateVoucherCode(),
                beneficiaryName: String(userId),
                amount: totalAmount,
                validFrom: from, // time no longer matters
                validTo: to,
                preparedBy: createdBy,
            })
            .returning();

        return voucher;
    }

    private async generateVoucherCode() {
        const year = this.getFinancialYear();

        const result = await this.db.execute<{
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
        // 1️⃣ Fetch voucher
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        // 2️⃣ Check already signed
        if (approve && voucher.accountsSignedBy) {
            throw new BadRequestException("Voucher already approved by accounts");
        }

        // 3️⃣ Fetch user signature (Laravel: $user->sign)
        const [profile] = await this.db.select({ signature: userProfiles.signature }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
        console.log("profile", profile);

        // 4️⃣ Update voucher
        await this.db
            .update(employeeImprestVouchers)
            .set({
                // Always update remark (Laravel parity)
                accountsRemark: remark ?? voucher.accountsRemark,

                ...(approve && {
                    accountsSignedBy: profile?.signature ?? "kailash.jpg",
                    accountsSignedAt: new Date(),
                }),
            })
            .where(eq(employeeImprestVouchers.id, voucherId));

        return {
            success: true,
            message: approve ? "Voucher approved by accounts" : "Remark saved successfully",
        };
    }

    async adminApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string }; voucherId: number; remark?: string; approve: boolean }) {
        // 1️⃣ Fetch voucher
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        // 2️⃣ Check already signed
        if (approve && voucher.adminSignedBy) {
            throw new BadRequestException("Voucher already approved by admin");
        }
        
        //check for ceo approval w/o accounts approval
        if(approve && !voucher.accountsSignedBy){
            throw new BadRequestException("Admin Approval can only be done once the Account Approval has been submitted");
        }

        // 3️⃣ Fetch user signature
        const [profile] = await this.db.select({ signature: userProfiles.signature }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

        // 4️⃣ Update voucher
        await this.db
            .update(employeeImprestVouchers)
            .set({
                // Always update remark
                adminRemark: remark ?? voucher.adminRemark,

                ...(approve && {
                    adminSignedBy: profile?.signature ?? "piyush.jpeg",
                    adminSignedAt: new Date(),
                }),
            })
            .where(eq(employeeImprestVouchers.id, voucherId));

        return {
            success: true,
            message: approve ? "Voucher approved by admin" : "Remark saved successfully",
        };
    }

    // ========================
    // DELETE PAYMENT
    // ========================
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
        // -------- Imprest totals (spent + approved) --------
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

        // -------- Transaction total (received) --------
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
}
