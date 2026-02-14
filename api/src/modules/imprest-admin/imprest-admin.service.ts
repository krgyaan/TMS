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

        // Filter by user if provided
        if (userId) {
            conditions.push(eq(employeeImprestVouchers.beneficiaryName, String(userId)));
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [rows, totalResult] = await Promise.all([
            this.db
                .select({
                    id: employeeImprestVouchers.id,
                    voucherCode: employeeImprestVouchers.voucherCode,

                    // NOTE: beneficiaryName stores userId as string
                    beneficiaryId: employeeImprestVouchers.beneficiaryName,
                    beneficiaryName: users.name,

                    amount: employeeImprestVouchers.amount,
                    validFrom: employeeImprestVouchers.validFrom,
                    validTo: employeeImprestVouchers.validTo,
                    createdAt: employeeImprestVouchers.createdAt,
                    adminSignedBy: employeeImprestVouchers.adminSignedBy,
                    accountsSignedBy: employeeImprestVouchers.accountsSignedBy,
                })
                .from(employeeImprestVouchers)
                .leftJoin(users, eq(users.id, sql`${employeeImprestVouchers.beneficiaryName}::int`))
                .where(whereClause)
                .orderBy(desc(employeeImprestVouchers.validFrom)),

            this.db
                .select({ count: sql<number>`count(*)` })
                .from(employeeImprestVouchers)
                .where(whereClause),
        ]);

        return {
            data: rows.map(row => {
                const startDate = new Date(row.validFrom);

                return {
                    id: row.id,
                    voucherCode: row.voucherCode,

                    beneficiaryId: row.beneficiaryId,
                    beneficiaryName: row.beneficiaryName,

                    amount: Number(row.amount),

                    validFrom: row.validFrom,
                    validTo: row.validTo,

                    // Derived fields (for UI)
                    year: startDate.getFullYear(),
                    week: this.getISOWeek(startDate),

                    adminApproval: row.adminSignedBy != null,
                    accountantApproval: row.accountsSignedBy != null,
                };
            }),
            meta: {
                total: Number(totalResult[0].count),
            },
        };
    }

    async createVoucher({ user, userId, validFrom, validTo }: { user: { id: number; role: string }; userId: number; validFrom: string; validTo: string }) {
        // if (user.role !== "admin" && user.id !== userId) {
        //     throw new ForbiddenException("You cannot create voucher for another user");
        // }

        const fromDate = new Date(validFrom);
        const toDate = new Date(validTo);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            throw new BadRequestException("Invalid date format");
        }

        const existing = await this.db
            .select({ id: employeeImprestVouchers.id })
            .from(employeeImprestVouchers)
            .where(and(eq(employeeImprestVouchers.beneficiaryName, String(userId)), eq(employeeImprestVouchers.validFrom, fromDate), eq(employeeImprestVouchers.validTo, toDate)))
            .limit(1);

        if (existing.length > 0) {
            throw new BadRequestException("Voucher already exists for this period");
        }

        const imprests = await this.db
            .select({ amount: employeeImprests.amount })
            .from(employeeImprests)
            .where(
                and(
                    eq(employeeImprests.userId, userId),
                    eq(employeeImprests.approvalStatus, 1),
                    gte(employeeImprests.approvedDate, fromDate),
                    lte(employeeImprests.approvedDate, toDate)
                )
            );

        if (imprests.length === 0) {
            throw new BadRequestException("No approved imprests found for this period");
        }

        const totalAmount = imprests.reduce((sum, r) => sum + Number(r.amount), 0);

        const voucherCode = await this.generateVoucherCode();

        const [voucher] = await this.db
            .insert(employeeImprestVouchers)
            .values({
                voucherCode,
                beneficiaryName: String(userId),
                amount: totalAmount,
                validFrom: fromDate,
                validTo: toDate,
            })
            .returning();

        return voucher;
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
                    gte(employeeImprests.approvedDate, voucher.validFrom),
                    lte(employeeImprests.approvedDate, voucher.validTo)
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

    async accountApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string; sign?: string }; voucherId: number; remark?: string; approve: boolean }) {
        // if (!user.role.startsWith("account")) {
        //     throw new ForbiddenException("Only accounts can approve here");
        // }

        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        if (approve && voucher.accountsSignedBy) {
            throw new BadRequestException("Voucher already approved by accounts");
        }

        await this.db
            .update(employeeImprestVouchers)
            .set({
                accountsRemark: remark ?? voucher.accountsRemark,
                ...(approve && {
                    accountsSignedBy: user.sign ?? String(user.id),
                    accountsSignedAt: new Date(),
                    approvalStatus: 1,
                }),
            })
            .where(eq(employeeImprestVouchers.id, voucherId));

        return {
            success: true,
            message: approve ? "Voucher approved by accounts" : "Remark saved successfully",
        };
    }

    async adminApproveVoucher({ user, voucherId, remark, approve }: { user: { id: number; role: string; sign?: string }; voucherId: number; remark?: string; approve: boolean }) {
        // if (user.role !== "admin") {
        //     throw new ForbiddenException("Only admin can approve here");
        // }

        const [voucher] = await this.db.select().from(employeeImprestVouchers).where(eq(employeeImprestVouchers.id, voucherId)).limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        if (approve && voucher.adminSignedBy) {
            throw new BadRequestException("Voucher already approved by admin");
        }

        await this.db
            .update(employeeImprestVouchers)
            .set({
                adminRemark: remark ?? voucher.adminRemark,
                ...(approve && {
                    adminSignedBy: user.sign ?? String(user.id),
                    adminSignedAt: new Date(),
                    approvalStatus: 1,
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
