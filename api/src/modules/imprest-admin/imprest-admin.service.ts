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

@Injectable()
export class ImprestAdminService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
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
    async getEmployeeSummary(): Promise<EmployeeImprestSummaryDto[]> {
        const rows = await this.db
            .select({
                userId: employeeImprests.userId,
                userName: users.name,

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

                amountReceived: sql<number>`
                    COALESCE(
                        SUM(${employeeImprestTransactions.amount}),
                        0
                    )
                `,
            })
            .from(employeeImprests)
            .innerJoin(users, eq(users.id, employeeImprests.userId))
            .leftJoin(employeeImprestTransactions, eq(employeeImprestTransactions.userId, employeeImprests.userId))
            .groupBy(employeeImprests.userId, users.name)
            .orderBy(users.name);

        // Final mapping + amountLeft calculation
        return rows.map(row => ({
            userId: row.userId!,
            userName: row.userName,

            amountSpent: Number(row.amountSpent),
            amountApproved: Number(row.amountApproved),
            amountReceived: Number(row.amountReceived),

            amountLeft: Number(row.amountApproved) - Number(row.amountReceived),
        }));
    }

    async getByUser(userId: number) {
        return this.db
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
    }

    // Role-based filtering
    // if (user.role !== "admin") {
    //     conditions.push(eq(employee_imprest_vouchers.beneficiaryName, String(user.id)));
    // }

    async listVouchers({ user, page, limit }: { user?: { id: number }; page: number; limit: number }) {
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];

        if (user) {
            conditions.push(eq(employeeImprestVouchers.beneficiaryName, String(user.id)));
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [rows, totalResult] = await Promise.all([
            this.db
                .select({
                    id: employeeImprestVouchers.id,
                    voucherCode: employeeImprestVouchers.voucherCode,
                    beneficiaryName: employeeImprestVouchers.beneficiaryName,
                    amount: employeeImprestVouchers.amount,
                    validFrom: employeeImprestVouchers.validFrom,
                    validTo: employeeImprestVouchers.validTo,
                    createdAt: employeeImprestVouchers.createdAt,
                    adminSignedBy: employeeImprestVouchers.adminSignedBy,
                    accountsSignedBy: employeeImprestVouchers.accountsSignedBy,
                })
                .from(employeeImprestVouchers)
                .where(whereClause)
                .orderBy(desc(employeeImprestVouchers.validFrom))
                .limit(limit)
                .offset(offset),

            this.db
                .select({ count: sql<number>`count(*)` })
                .from(employeeImprestVouchers)
                .where(whereClause),
        ]);

        const data = rows.map(row => ({
            id: row.id,
            voucherCode: row.voucherCode,
            beneficiaryName: row.beneficiaryName,
            amount: row.amount,
            validFrom: row.validFrom,
            validTo: row.validTo,
            createdAt: row.createdAt,
            adminApproval: row.adminSignedBy != null,
            accountantApproval: row.accountsSignedBy != null,
        }));

        return {
            data,
            meta: {
                page,
                limit,
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
       FETCH VOUCHER
    ------------------------------------------ */

        const [voucher] = await this.db
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
                accountsRemark: employeeImprestVouchers.accountsRemark,
                adminRemark: employeeImprestVouchers.adminRemark,
            })
            .from(employeeImprestVouchers)
            .where(eq(employeeImprestVouchers.id, voucherId))
            .limit(1);

        if (!voucher) {
            throw new NotFoundException("Voucher not found");
        }

        /* -----------------------------------------
        ACCESS CHECK
    ------------------------------------------ */

        // if (user.role !== "admin" && voucher.beneficiaryName !== String(user.id)) {
        //     throw new ForbiddenException("You cannot view this voucher");
        // }

        /* -----------------------------------------
        FETCH LINE ITEMS
    ------------------------------------------ */

        const items = await this.db
            .select({
                id: employeeImprests.id,
                categoryId: employeeImprests.categoryId,
                projectName: employeeImprests.projectName,
                remark: employeeImprests.remark,
                amount: employeeImprests.amount,
                invoiceProof: employeeImprests.invoiceProof,
            })
            .from(employeeImprests)
            .where(
                and(
                    eq(employeeImprests.userId, Number(voucher.beneficiaryName)),
                    eq(employeeImprests.approvalStatus, 1),
                    gte(employeeImprests.approvedDate, voucher.validFrom),
                    lte(employeeImprests.approvedDate, voucher.validTo)
                )
            )
            .orderBy(employeeImprests.approvedDate);

        return {
            voucher,
            items,
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
}
