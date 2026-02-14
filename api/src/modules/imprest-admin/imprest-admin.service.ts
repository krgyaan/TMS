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
import { imprestCategories, teams } from "@/db/schemas";
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

        try {
            // ==============================
            // 1️⃣ Aggregate Imprests
            // ==============================
            const imprestAgg = this.db
                .select({
                    userId: employeeImprests.userId,

                    amountSpent: sql<number>`
          COALESCE(SUM(${employeeImprests.amount}), 0)
        `.as("amountSpent"),

                    amountApproved: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN ${employeeImprests.approvalStatus} = 1
                THEN ${employeeImprests.amount}
                ELSE 0
              END
            ),
          0)
        `.as("amountApproved"),
                })
                .from(employeeImprests)
                .groupBy(employeeImprests.userId)
                .as("imprest_agg");

            this.logger.debug("Imprest aggregation prepared");

            // ==============================
            // 2️⃣ Aggregate Transactions
            // ==============================
            const txnAgg = this.db
                .select({
                    userId: employeeImprestTransactions.userId,

                    amountReceived: sql<number>`
          COALESCE(SUM(${employeeImprestTransactions.amount}), 0)
        `.as("amountReceived"),
                })
                .from(employeeImprestTransactions)
                .groupBy(employeeImprestTransactions.userId)
                .as("txn_agg");

            this.logger.debug("Transaction aggregation prepared");

            // ==============================
            // 3️⃣ Aggregate Vouchers
            // ==============================
            const voucherAgg = this.db
                .select({
                    userId: employeeImprestVouchers.beneficiaryName,

                    totalVouchers: sql<number>`
          COUNT(${employeeImprestVouchers.id})
        `.as("totalVouchers"),

                    accountsApproved: sql<number>`
          SUM(
            CASE 
              WHEN ${employeeImprestVouchers.accountsSignedBy} IS NOT NULL 
              THEN 1 ELSE 0
            END
          )
        `.as("accountsApproved"),

                    adminApproved: sql<number>`
          SUM(
            CASE 
              WHEN ${employeeImprestVouchers.adminSignedBy} IS NOT NULL 
              THEN 1 ELSE 0
            END
          )
        `.as("adminApproved"),
                })
                .from(employeeImprestVouchers)
                .groupBy(employeeImprestVouchers.beneficiaryName)
                .as("voucher_agg");

            this.logger.debug("Voucher aggregation prepared");

            // ==============================
            // 4️⃣ Final Join
            // ==============================
            this.logger.debug("Executing final employee summary query");

            const rows = await this.db
                .select({
                    userId: users.id,
                    userName: users.name,

                    amountSpent: sql<number>`
          COALESCE(${imprestAgg.amountSpent}, 0)
        `,

                    amountApproved: sql<number>`
          COALESCE(${imprestAgg.amountApproved}, 0)
        `,

                    amountReceived: sql<number>`
          COALESCE(${txnAgg.amountReceived}, 0)
        `,

                    totalVouchers: sql<number>`
          COALESCE(${voucherAgg.totalVouchers}, 0)
        `,

                    accountsApproved: sql<number>`
          COALESCE(${voucherAgg.accountsApproved}, 0)
        `,

                    adminApproved: sql<number>`
          COALESCE(${voucherAgg.adminApproved}, 0)
        `,
                })
                .from(users)
                .innerJoin(imprestAgg, eq(imprestAgg.userId, users.id)) // ensures user has imprests
                .leftJoin(txnAgg, eq(txnAgg.userId, users.id))
                .leftJoin(voucherAgg, eq(voucherAgg.userId, sql`${users.id}::text`))
                .orderBy(users.name);

            this.logger.info("Employee summary query executed", {
                rowsCount: rows.length,
            });

            // ==============================
            // 5️⃣ Map Result
            // ==============================
            const result = rows.map(row => ({
                userId: row.userId!,
                userName: row.userName,

                amountSpent: Number(row.amountSpent),
                amountApproved: Number(row.amountApproved),
                amountReceived: Number(row.amountReceived),

                // Laravel logic: approved - received
                amountLeft: Number(row.amountApproved) - Number(row.amountReceived),

                voucherInfo: {
                    totalVouchers: Number(row.totalVouchers),
                    accountsApproved: Number(row.accountsApproved),
                    adminApproved: Number(row.adminApproved),
                },
            }));

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

    async getByUser(userId: number) {
        let amt = await this.getUserAmts(userId);
        let rows = await this.db
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
            .where(eq(employeeImprestTransactions.userId, userId))
            .orderBy(desc(employeeImprestTransactions.txnDate));

        return {
            summary: {
                amountSpent: amt.amountSpent,
                amountApproved: amt.amountApproved,
                amountReceived: amt.amountReceived,
                amountLeft: amt.amountLeft,
            },
            data: rows.map(r => ({
                ...r,
                amount: Number(r.amount), // IMPORTANT for Drizzle numeric
            })),
        };
    }
    // Role-based filtering
    // if (user.role !== "admin") {
    //     conditions.push(eq(employee_imprest_vouchers.beneficiaryName, String(user.id)));
    // }

    async listAllVouchers() {
        return this.listVouchers({});
    }

    async listUserVouchers(userId: number) {
        return this.listVouchers({ userId });
    }

    async listVouchers({ userId }: { userId?: number }) {
        const conditions: SQL[] = [];

        if (userId) {
            conditions.push(eq(employeeImprests.userId, userId));
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        /* -------------------------------------------------
       1️⃣ Aggregate EXACTLY like Laravel
    -------------------------------------------------- */
        const voucherAgg = this.db
            .select({
                userId: employeeImprests.userId,

                beneficiaryName: sql<string>`
                ${users.name}
            `.as("beneficiaryName"),

                year: sql<number>`
                EXTRACT(YEAR FROM COALESCE(
                    ${employeeImprests.approvedDate},
                    ${employeeImprests.createdAt}
                ))
            `.as("year"),

                week: sql<number>`
                EXTRACT(WEEK FROM COALESCE(
                    ${employeeImprests.approvedDate},
                    ${employeeImprests.createdAt}
                ))
            `.as("week"),

                validFrom: sql<Date>`
                MIN(COALESCE(
                    ${employeeImprests.approvedDate},
                    ${employeeImprests.createdAt}
                ))
            `.as("validFrom"),

                validTo: sql<Date>`
                MIN(COALESCE(
                    ${employeeImprests.approvedDate},
                    ${employeeImprests.createdAt}
                )) + INTERVAL '6 days'
            `.as("validTo"),

                amount: sql<number>`
                SUM(${employeeImprests.amount})
            `.as("amount"),
            })
            .from(employeeImprests)
            .innerJoin(users, eq(users.id, employeeImprests.userId))
            .where(whereClause)
            .groupBy(employeeImprests.userId, users.name, sql`year`, sql`week`)
            .as("voucher_agg");

        /* -------------------------------------------------
       2️⃣ OUTER SELECT — ONLY use voucherAgg.*
    -------------------------------------------------- */
        const rows = await this.db
            .select({
                id: employeeImprestVouchers.id,
                voucherCode: employeeImprestVouchers.voucherCode,

                beneficiaryName: sql<string>`${voucherAgg.beneficiaryName}`,
                year: sql<number>`${voucherAgg.year}`,
                week: sql<number>`${voucherAgg.week}`,

                validFrom: sql<Date>`${voucherAgg.validFrom}`,
                validTo: sql<Date>`${voucherAgg.validTo}`,

                amount: sql<number>`${voucherAgg.amount}`,

                adminSignedBy: employeeImprestVouchers.adminSignedBy,
                accountsSignedBy: employeeImprestVouchers.accountsSignedBy,

                adminRemark: employeeImprestVouchers.adminRemark,
                accountsRemark: employeeImprestVouchers.accountsRemark,
            })
            .from(voucherAgg)
            .leftJoin(
                employeeImprestVouchers,
                and(
                    eq(employeeImprestVouchers.beneficiaryName, sql`${voucherAgg.userId}::text`),
                    eq(employeeImprestVouchers.validFrom, voucherAgg.validFrom),
                    eq(employeeImprestVouchers.validTo, voucherAgg.validTo)
                )
            )
            .orderBy(desc(sql`${voucherAgg.year}`), desc(sql`${voucherAgg.week}`));
        /* -------------------------------------------------
       3️⃣ Map for UI
    -------------------------------------------------- */
        return {
            data: rows.map(r => ({
                id: r.id,
                voucherCode: r.voucherCode,

                beneficiaryName: r.beneficiaryName,

                year: Number(r.year),
                week: Number(r.week),

                validFrom: r.validFrom,
                validTo: r.validTo,

                amount: Number(r.amount),

                accountantApproval: !!r.accountsSignedBy && r.accountsSignedBy.trim() !== "",

                adminApproval: !!r.adminSignedBy && r.adminSignedBy.trim() !== "",

                accountsRemark: r.accountsRemark ?? null,
                adminRemark: r.adminRemark ?? null,
            })),
        };
    }

    async listVouchersRaw(userId?: number) {
        const whereSql = userId ? sql`WHERE ei.user_id = ${userId}` : sql``;

        const result = await this.db.execute(
            sql`
        SELECT
            v.id AS "id",
            v.voucher_code AS "voucherCode",

            u.name AS "beneficiaryName",

            u.id AS "beneficiaryId",

            agg.year,
            agg.week,
            agg.valid_from AS "validFrom",
            agg.valid_to   AS "validTo",
            agg.total_amount AS "amount",

            v.accounts_signed_by,
            v.admin_signed_by,
            v.accounts_remark,
            v.admin_remark

        FROM (
            SELECT
                ei.user_id,
                EXTRACT(YEAR FROM COALESCE(ei.approved_date, ei.created_at))::int AS year,
                EXTRACT(WEEK FROM COALESCE(ei.approved_date, ei.created_at))::int AS week,

                MIN(COALESCE(ei.approved_date, ei.created_at)) AS valid_from,
                MIN(COALESCE(ei.approved_date, ei.created_at)) + INTERVAL '6 days' AS valid_to,

                SUM(ei.amount)::numeric AS total_amount

            FROM employee_imprests ei
            ${whereSql}
            GROUP BY ei.user_id, year, week
        ) agg

        INNER JOIN users u
            ON u.id = agg.user_id

        LEFT JOIN employee_imprest_vouchers v
            ON v.beneficiary_name = agg.user_id::text
           AND EXTRACT(YEAR FROM v.valid_from) = agg.year
           AND EXTRACT(WEEK FROM v.valid_from) = agg.week

        ORDER BY agg.year DESC, agg.week DESC
        `
        );

        return result.rows.map((r: any) => ({
            id: r.id ?? null,
            voucherCode: r.voucherCode ?? null,

            beneficiaryName: r.beneficiaryName,
            beneficiaryId: r.beneficiaryId,

            year: r.year,
            week: r.week,
            validFrom: r.validFrom,
            validTo: r.validTo,

            amount: Number(r.amount),

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

    async buildVoucherIfMissing({ userId, from, to, createdBy }: { userId: number; from: Date; to: Date; createdBy: string }) {
        // 1️⃣ Find existing voucher (RANGE MATCH — CRITICAL)
        const [existing] = await this.db
            .select()
            .from(employeeImprestVouchers)
            .where(
                and(
                    eq(employeeImprestVouchers.beneficiaryName, String(userId)),
                    sql`${employeeImprestVouchers.validFrom} <= ${to}`,
                    sql`${employeeImprestVouchers.validTo} >= ${from}`
                )
            )
            .limit(1);

        if (existing) {
            return existing;
        }

        // 2️⃣ Fetch imprests in range
        const imprests = await this.db
            .select({ amount: employeeImprests.amount })
            .from(employeeImprests)
            .where(
                and(
                    eq(employeeImprests.userId, userId),
                    sql`
          COALESCE(
            ${employeeImprests.approvedDate},
            ${employeeImprests.createdAt}
          ) BETWEEN ${from} AND ${to}
        `
                )
            );

        if (imprests.length === 0) {
            throw new BadRequestException("No imprests found for selected period");
        }

        // 3️⃣ Aggregate
        const totalAmount = imprests.reduce((sum, r) => sum + Number(r.amount), 0);

        // 4️⃣ Create voucher
        const [voucher] = await this.db
            .insert(employeeImprestVouchers)
            .values({
                voucherCode: await this.generateVoucherCode(),
                beneficiaryName: String(userId),
                amount: totalAmount,
                validFrom: from,
                validTo: to,
                preparedBy: createdBy,
            })
            .returning();

        return voucher;
    }

    async getVoucherProofs({ user, userId, from, to }: { user: any; userId: number; from: Date; to: Date }) {
        // 1️⃣ Recalculate period EXACTLY like Laravel
        const periodResult = await this.db.execute(sql`
    SELECT
      MIN(COALESCE(approved_date, created_at)) AS "startDate",
      (
        MIN(COALESCE(approved_date, created_at))
        + INTERVAL '6 days'
      ) AS "endDate"
    FROM employee_imprests
    WHERE user_id = ${userId}
  `);

        const startDate = periodResult.rows[0]?.startDate;
        const endDate = periodResult.rows[0]?.endDate;

        if (!startDate || !endDate) {
            return { proofs: [] };
        }

        // 2️⃣ Fetch proofs within that window
        const proofRows = await this.db.execute(sql`
    SELECT invoice_proof
    FROM employee_imprests
    WHERE user_id = ${userId}
      AND DATE(COALESCE(approved_date, created_at))
          BETWEEN DATE(${startDate}) AND DATE(${endDate})
  `);

        // 3️⃣ Flatten JSONB arrays
        const files = proofRows.rows.flatMap(r => (Array.isArray(r.invoice_proof) ? r.invoice_proof : [])).filter(Boolean);

        // 4️⃣ Normalize
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

        console.log(proofs);

        return { proofs };
    }
    /* -----------------------------------------
     VOUCHER CODE GENERATOR
  ------------------------------------------ */

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

    private getFinancialYear() {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        return String(year).slice(-2);
    }

    async getVoucherById({ user, voucherId }: { user: { id: number; role: string }; voucherId: number }) {
        /* -----------------------------------------
       FETCH VOUCHER + EMPLOYEE
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

                // 👇 EMPLOYEE DETAILS (Laravel $abc)
                employeeId: users.id,
                employeeName: users.name,
                teamName: teams.name, // make sure column exists
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
       FETCH LINE ITEMS (FULL DETAILS)
    ------------------------------------------ */

        const items = await this.db
            .select({
                id: employeeImprests.id,

                category: imprestCategories.name, // ✔ category name

                projectCode: projects.projectCode, // ✔ project code
                projectName: employeeImprests.projectName,

                remark: employeeImprests.remark,
                amount: employeeImprests.amount,
            })
            .from(employeeImprests)
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .leftJoin(projects, eq(projects.projectName, employeeImprests.projectName))
            .where(
                and(
                    eq(employeeImprests.userId, voucher.employeeId),
                    eq(employeeImprests.approvalStatus, 1),
                    sql`
                COALESCE(
                    ${employeeImprests.approvedDate},
                    ${employeeImprests.createdAt}
                )
                BETWEEN ${voucher.validFrom} AND ${voucher.validTo}
                `
                )
            )
            .orderBy(employeeImprests.approvedDate);

        return {
            voucher: {
                ...voucher,
                amount: Number(voucher.amount),
            },
            items: items.map(i => ({
                ...i,
                amount: Number(i.amount),
            })),
        };
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

    async accountApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string; sign?: string }; voucherId: number; remark?: string; approve: boolean }) {
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        const isSigned = (v?: string | null) => v && v.trim().length > 0;

        if (approve && isSigned(voucher.accountsSignedBy)) {
            throw new BadRequestException("Voucher already approved by accounts");
        }

        await this.db
            .update(employeeImprestVouchers)
            .set({
                accountsRemark: remark ?? voucher.accountsRemark,
                ...(approve && {
                    accountsSignedBy: user.sign ?? String(user.id),
                    accountsSignedAt: new Date(),
                }),
            })
            .where(eq(employeeImprestVouchers.id, voucherId));

        return {
            success: true,
            message: approve ? "Voucher approved by accounts" : "Remark saved successfully",
        };
    }

    async adminApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string; sign?: string }; voucherId: number; remark?: string; approve: boolean }) {
        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        const isSigned = (v?: string | null) => v && v.trim().length > 0;

        if (approve && isSigned(voucher.adminSignedBy)) {
            throw new BadRequestException("Voucher already approved by admin");
        }

        await this.db
            .update(employeeImprestVouchers)
            .set({
                adminRemark: remark ?? voucher.adminRemark,
                ...(approve && {
                    adminSignedBy: user.sign ?? String(user.id),
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
