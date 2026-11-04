import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { users } from "@db/schemas/auth";
import { fixedExpenses, type NewFixedExpense } from "@db/schemas/accounts/fixed-expense.schema";
import { paymentCategory } from "@db/schemas/master/payment-category.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type {
    CreateFixedExpenseDto,
    FixedExpenseAmountType,
    FixedExpenseFrequency,
    FixedExpensePaymentMode,
    FixedExpenseQuery,
    FixedExpenseResponse,
    FixedExpenseStatus,
    UpdateFixedExpenseDto,
} from "./dto/fixed-expenses.dto";

const creatorUser = alias(users, "fixed_expense_creator");
const makerUser = alias(users, "fixed_expense_maker");

const fixedExpenseSelection = {
    id: fixedExpenses.id,
    partyName: fixedExpenses.partyName,
    amountType: fixedExpenses.amountType,
    amount: fixedExpenses.amount,
    paymentMode: fixedExpenses.paymentMode,
    accountName: fixedExpenses.accountName,
    accountNumber: fixedExpenses.accountNumber,
    ifscCode: fixedExpenses.ifscCode,
    type: fixedExpenses.type,
    categoryId: fixedExpenses.categoryId,
    subCategory: fixedExpenses.subCategory,
    dueDate: fixedExpenses.dueDate,
    paymentFrequency: fixedExpenses.paymentFrequency,
    status: fixedExpenses.status,
    deleteStatus: fixedExpenses.deleteStatus,
    makerId: fixedExpenses.makerId,
    makerName: makerUser.name,
    createdBy: fixedExpenses.createdBy,
    createdByName: creatorUser.name,
    createdAt: fixedExpenses.createdAt,
    updatedAt: fixedExpenses.updatedAt,
};

type FixedExpenseRow = {
    id: number;
    partyName: string;
    amountType: string;
    amount: string;
    paymentMode: string;
    accountName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    type: string;
    categoryId: number | null;
    subCategory: string | null;
    dueDate: string;
    paymentFrequency: string;
    status: string;
    deleteStatus: boolean;
    makerId: number | null;
    makerName: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class FixedExpensesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    // ===================== HELPERS =====================

    private mapToResponse(row: FixedExpenseRow): FixedExpenseResponse {
        return {
            id: row.id,
            partyName: row.partyName,
            amountType: row.amountType as FixedExpenseAmountType,
            amount: row.amount,
            paymentMode: row.paymentMode as FixedExpensePaymentMode,
            accountName: row.accountName ?? null,
            accountNumber: row.accountNumber ?? null,
            ifscCode: row.ifscCode ?? null,
            type: row.type,
            categoryId: row.categoryId ?? null,
            subCategory: row.subCategory ?? null,
            dueDate: row.dueDate ?? "",
            paymentFrequency: row.paymentFrequency as FixedExpenseFrequency,
            status: row.status as FixedExpenseStatus,
            deleteStatus: row.deleteStatus,
            makerId: row.makerId ?? null,
            makerName: row.makerName ?? null,
            createdBy: row.createdBy,
            createdByName: row.createdByName ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    /**
     * Bank account details are mandatory when the payment mode is bank transfer.
     */
    private assertBankDetails(
        paymentMode: string | null | undefined,
        accountName: string | null | undefined,
        accountNumber: string | null | undefined,
        ifscCode: string | null | undefined
    ): void {
        if (paymentMode !== "bank_transfer") return;

        const missing: string[] = [];
        if (!accountName?.trim()) missing.push("Account name");
        if (!accountNumber?.trim()) missing.push("Account number");
        if (!ifscCode?.trim()) missing.push("IFSC code");

        if (missing.length > 0) {
            throw new BadRequestException(`${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required for bank transfer`);
        }
    }

    /**
     * Resolve the display `type` and `subCategory` from a payment_category row.
     * The row must exist, belong to the fixed-expense purpose and be active.
     * Falls back to a legacy client-supplied `type` when no category is given.
     */
    private async resolveCategory(categoryId: number | null | undefined, fallbackType?: string): Promise<{ type: string; subCategory: string | null }> {
        if (!categoryId) {
            if (fallbackType) return { type: fallbackType, subCategory: null };
            throw new BadRequestException("Category is required");
        }

        const [row] = await this.db
            .select({
                category: paymentCategory.category,
                subCategory: paymentCategory.subCategory,
                purpose: paymentCategory.purpose,
                status: paymentCategory.status,
            })
            .from(paymentCategory)
            .where(eq(paymentCategory.id, categoryId))
            .limit(1);

        if (!row) {
            throw new BadRequestException(`Payment category with ID ${categoryId} not found`);
        }

        if (row.purpose !== "fixed") {
            throw new BadRequestException("Selected category does not belong to fixed expenses");
        }

        if (row.status !== "active") {
            throw new BadRequestException("Selected category is inactive");
        }

        return { type: row.category, subCategory: row.subCategory ?? null };
    }

    private buildWhereClause(filters?: FixedExpenseQuery): SQL<unknown> | undefined {
        const conditions: (SQL<unknown> | undefined)[] = [];
        const search = filters?.search?.trim();

        if (search) {
            // Match the search term against every column visible in a row, so typing
            // anything shown on the list (type, status, amount, date, etc.) finds it.
            const term = `%${search}%`;
            // Enum-like columns are stored as slugs ("auto_debit"), so also try a
            // slugified term to make "auto debit" match.
            const slugTerm = `%${search.replace(/\s+/g, "_")}%`;
            // Amounts are displayed with currency formatting, so also match a
            // numeric-only term (e.g. "5,000" / "₹5000" -> 5000).
            const numeric = search.replace(/[^\d.]/g, "");
            const numericTerm = numeric ? `%${numeric}%` : undefined;

            conditions.push(
                or(
                    ilike(fixedExpenses.partyName, term),
                    ilike(fixedExpenses.type, term),
                    ilike(fixedExpenses.subCategory, term),
                    ilike(fixedExpenses.status, term),
                    ilike(fixedExpenses.amountType, term),
                    ilike(fixedExpenses.amountType, slugTerm),
                    ilike(fixedExpenses.paymentMode, term),
                    ilike(fixedExpenses.paymentMode, slugTerm),
                    ilike(fixedExpenses.paymentFrequency, term),
                    ilike(fixedExpenses.paymentFrequency, slugTerm),
                    ilike(fixedExpenses.accountName, term),
                    ilike(fixedExpenses.accountNumber, term),
                    ilike(fixedExpenses.ifscCode, term),
                    sql`${fixedExpenses.amount}::text ilike ${term}`,
                    numericTerm ? sql`${fixedExpenses.amount}::text ilike ${numericTerm}` : undefined,
                    sql`${fixedExpenses.id}::text ilike ${term}`,
                    sql`${fixedExpenses.dueDate}::text ilike ${term}`,
                    ilike(creatorUser.name, term)
                )
            );
        }

        if (filters?.type) {
            conditions.push(eq(fixedExpenses.type, filters.type));
        }

        if (filters?.paymentFrequency) {
            conditions.push(eq(fixedExpenses.paymentFrequency, filters.paymentFrequency));
        }

        if (filters?.paymentMode) {
            conditions.push(eq(fixedExpenses.paymentMode, filters.paymentMode));
        }

        if (filters?.amountType) {
            conditions.push(eq(fixedExpenses.amountType, filters.amountType));
        }

        if (filters?.status) {
            // Existing rows created before the Pending/Done flow were stored as
            // "New"; treat those as Pending so nothing disappears from the list.
            conditions.push(filters.status === "Pending" ? inArray(fixedExpenses.status, ["Pending", "New"]) : eq(fixedExpenses.status, filters.status));
        }

        // Archived rows are hidden unless explicitly requested
        conditions.push(eq(fixedExpenses.deleteStatus, filters?.deleteStatus ?? false));

        return conditions.length > 0 ? and(...conditions.filter(Boolean)) : undefined;
    }

    // ===================== CRUD =====================

    async findAll(filters?: FixedExpenseQuery) {
        const page = filters?.page ?? 1;
        const limit = Math.min(Math.max(filters?.limit ?? 10, 1), 100);
        const offset = (page - 1) * limit;
        const sortOrder = filters?.sortOrder ?? "desc";
        const sortBy = filters?.sortBy ?? "createdAt";

        const whereClause = this.buildWhereClause(filters);

        const sortColumnMap: Record<string, AnyColumn> = {
            partyName: fixedExpenses.partyName,
            amount: fixedExpenses.amount,
            type: fixedExpenses.type,
            dueDate: fixedExpenses.dueDate,
            createdAt: fixedExpenses.createdAt,
        };

        const orderColumn = sortColumnMap[sortBy] ?? fixedExpenses.createdAt;
        const orderFn = sortOrder === "asc" ? asc : desc;

        const [countResult, rows] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(fixedExpenses)
                .leftJoin(creatorUser, eq(creatorUser.id, fixedExpenses.createdBy))
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select(fixedExpenseSelection)
                .from(fixedExpenses)
                .leftJoin(creatorUser, eq(creatorUser.id, fixedExpenses.createdBy))
                .leftJoin(makerUser, eq(makerUser.id, fixedExpenses.makerId))
                .where(whereClause)
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset(offset),
        ]);

        const data = rows.map(row => this.mapToResponse(row));

        return wrapPaginatedResponse(data, countResult, page, limit);
    }

    async findById(id: number): Promise<FixedExpenseResponse> {
        const [row] = await this.db
            .select(fixedExpenseSelection)
            .from(fixedExpenses)
            .leftJoin(creatorUser, eq(creatorUser.id, fixedExpenses.createdBy))
            .leftJoin(makerUser, eq(makerUser.id, fixedExpenses.makerId))
            .where(eq(fixedExpenses.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Fixed expense with ID ${id} not found`);
        }

        return this.mapToResponse(row);
    }

    async create(data: CreateFixedExpenseDto, createdBy: number): Promise<FixedExpenseResponse> {
        this.assertBankDetails(data.paymentMode, data.accountName, data.accountNumber, data.ifscCode);

        const { type, subCategory } = await this.resolveCategory(data.categoryId, data.type);
        const now = new Date();

        const [inserted] = await this.db
            .insert(fixedExpenses)
            .values({
                partyName: data.partyName,
                amountType: data.amountType,
                amount: data.amount,
                paymentMode: data.paymentMode,
                accountName: data.accountName ?? null,
                accountNumber: data.accountNumber ?? null,
                ifscCode: data.ifscCode ?? null,
                type,
                subCategory,
                categoryId: data.categoryId ?? null,
                dueDate: data.dueDate,
                paymentFrequency: data.paymentFrequency,
                status: "Pending",
                deleteStatus: false,
                makerId: data.makerId ?? null,
                createdBy,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: fixedExpenses.id });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateFixedExpenseDto): Promise<FixedExpenseResponse> {
        const existing = await this.findById(id);

        const paymentMode = data.paymentMode ?? existing.paymentMode;
        this.assertBankDetails(
            paymentMode,
            data.accountName !== undefined ? data.accountName : existing.accountName,
            data.accountNumber !== undefined ? data.accountNumber : existing.accountNumber,
            data.ifscCode !== undefined ? data.ifscCode : existing.ifscCode
        );

        const updateData: Partial<NewFixedExpense> = { updatedAt: new Date() };

        if (data.partyName !== undefined) updateData.partyName = data.partyName;
        if (data.amountType !== undefined) updateData.amountType = data.amountType;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;
        if (data.accountName !== undefined) updateData.accountName = data.accountName;
        if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber;
        if (data.ifscCode !== undefined) updateData.ifscCode = data.ifscCode;
        if (data.categoryId) {
            const resolved = await this.resolveCategory(data.categoryId);
            updateData.categoryId = data.categoryId;
            updateData.type = resolved.type;
            updateData.subCategory = resolved.subCategory;
        } else if (data.type !== undefined) {
            updateData.type = data.type;
        }
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.paymentFrequency !== undefined) updateData.paymentFrequency = data.paymentFrequency;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.makerId !== undefined) updateData.makerId = data.makerId;
        if (data.deleteStatus !== undefined) updateData.deleteStatus = data.deleteStatus;

        await this.db.update(fixedExpenses).set(updateData).where(eq(fixedExpenses.id, id));

        return this.findById(id);
    }

    async setArchiveStatus(id: number, deleteStatus: boolean): Promise<FixedExpenseResponse> {
        await this.findById(id);

        await this.db.update(fixedExpenses).set({ deleteStatus, updatedAt: new Date() }).where(eq(fixedExpenses.id, id));

        return this.findById(id);
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);

        await this.db.delete(fixedExpenses).where(eq(fixedExpenses.id, id));
    }
}
