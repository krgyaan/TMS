import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { users } from "@db/schemas/auth";
import { fixedExpenses, type NewFixedExpense } from "@db/schemas/accounts/fixed-expense.schema";
import { fixedExpensesHistory, type NewFixedExpenseHistory } from "@db/schemas/accounts/fixed-expense-history.schema";
import { paymentRequests } from "@db/schemas/operations/payment-requests.schema";
import { paymentCategory } from "@db/schemas/master/payment-category.schema";
import { MakerRequestService } from "@/modules/operations/maker-requests/maker-request.service";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type {
    CreateFixedExpenseDto,
    FixedExpenseAmountType,
    FixedExpenseFrequency,
    FixedExpensePaymentMode,
    FixedExpenseQuery,
    FixedExpenseResponse,
    UpdateFixedExpenseDto,
} from "./dto/fixed-expenses.dto";

const creatorUser = alias(users, "fixed_expense_creator");
const fixedExpenseMakerRequest = alias(paymentRequests, "fixed_expense_maker_request");

/**
 * Keeps only the current (latest) workflow row per expense. History now holds
 * one row per payment cycle, so list/view/update must look at the newest one.
 */
const currentHistoryJoin = sql`${fixedExpensesHistory.id} = (
    SELECT max(h2.id) FROM fixed_expenses_history h2 WHERE h2.expense_id = ${fixedExpenses.id}
)`;

/** Same as `currentHistoryJoin`, but for a single expense id (update path). */
const currentHistoryForExpense = (expenseId: number) =>
    sql`${fixedExpensesHistory.id} = (
        SELECT max(h2.id) FROM fixed_expenses_history h2 WHERE h2.expense_id = ${expenseId}
    )`;

/** Months added per payment frequency when rolling a paid cycle forward. */
const FREQUENCY_MONTHS: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    half_yearly: 6,
    annual: 12,
};

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
    deleteStatus: fixedExpenses.deleteStatus,
    makerId: fixedExpenses.makerId,
    status: fixedExpensesHistory.status,
    makerRequestNo: fixedExpenseMakerRequest.requestNo,
    makerRequestStatus: fixedExpenseMakerRequest.status,
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
    deleteStatus: boolean;
    makerId: number | null;
    status: string | null;
    makerRequestNo: string | null;
    makerRequestStatus: string | null;
    createdBy: number;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class FixedExpensesService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly makerRequests: MakerRequestService
    ) {}

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
            deleteStatus: row.deleteStatus,
            makerId: row.makerId ?? null,
            status: row.status ?? null,
            makerRequestNo: row.makerRequestNo ?? null,
            makerRequestStatus: row.makerRequestStatus ?? null,
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
                    ilike(fixedExpenseMakerRequest.requestNo, term),
                    ilike(fixedExpensesHistory.status, term),
                    ilike(fixedExpensesHistory.status, slugTerm),
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
            // Driven by the fixed expense workflow row. Rows created before the
            // history table existed have no workflow row yet (status NULL) and
            // stay in Pending so they don't disappear from the list.
            conditions.push(
                filters.status === "Pending"
                    ? or(isNull(fixedExpensesHistory.status), inArray(fixedExpensesHistory.status, ["Awaited Maker", "Maker Created", "Maker Done", "Maker Rejected"]))
                    : eq(fixedExpensesHistory.status, "Payment Done")
            );
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
                .leftJoin(fixedExpensesHistory, currentHistoryJoin)
                .leftJoin(fixedExpenseMakerRequest, eq(fixedExpenseMakerRequest.id, fixedExpensesHistory.makerId))
                .where(whereClause)
                .then(([r]) => Number(r?.count ?? 0)),
            this.db
                .select(fixedExpenseSelection)
                .from(fixedExpenses)
                .leftJoin(creatorUser, eq(creatorUser.id, fixedExpenses.createdBy))
                .leftJoin(fixedExpensesHistory, currentHistoryJoin)
                .leftJoin(fixedExpenseMakerRequest, eq(fixedExpenseMakerRequest.id, fixedExpensesHistory.makerId))
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
            .leftJoin(fixedExpensesHistory, currentHistoryJoin)
            .leftJoin(fixedExpenseMakerRequest, eq(fixedExpenseMakerRequest.id, fixedExpensesHistory.makerId))
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

        const snapshot = {
            partyName: data.partyName,
            amountType: data.amountType,
            amount: data.amount,
            paymentMode: data.paymentMode,
            accountName: data.accountName ?? null,
            accountNumber: data.accountNumber ?? null,
            ifscCode: data.ifscCode ?? null,
            categoryId: data.categoryId ?? null,
            dueDate: data.dueDate,
            paymentFrequency: data.paymentFrequency,
            deleteStatus: false,
            makerId: data.makerId ?? null,
        };

        // The expense and its workflow row are created together.
        const inserted = await this.db.transaction(async tx => {
            const [expense] = await tx
                .insert(fixedExpenses)
                .values({
                    ...snapshot,
                    type,
                    subCategory,
                    createdBy,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning({ id: fixedExpenses.id });

            await tx.insert(fixedExpensesHistory).values({
                expenseId: expense.id,
                partyName: snapshot.partyName,
                amountType: snapshot.amountType,
                amount: snapshot.amount,
                paymentMode: snapshot.paymentMode,
                accountName: snapshot.accountName,
                accountNumber: snapshot.accountNumber,
                ifscCode: snapshot.ifscCode,
                categoryId: snapshot.categoryId,
                dueDate: snapshot.dueDate,
                paymentFrequency: snapshot.paymentFrequency,
                makerId: snapshot.makerId,
                status: "Awaited Maker",
                // Left NULL at creation; set only when someone edits/changes status.
                updatedBy: null,
                createdAt: now,
                updatedAt: now,
            });

            return expense;
        });

        return this.findById(inserted.id);
    }

    async update(id: number, data: UpdateFixedExpenseDto, updatedBy?: number): Promise<FixedExpenseResponse> {
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
        if (data.makerId !== undefined) updateData.makerId = data.makerId;
        if (data.deleteStatus !== undefined) updateData.deleteStatus = data.deleteStatus;

        await this.db.update(fixedExpenses).set(updateData).where(eq(fixedExpenses.id, id));

        // Keep the workflow row's snapshot in step with the expense. The history
        // row only stores category_id (type/sub_category are derived from it).
        const historyUpdate: Partial<NewFixedExpenseHistory> = { updatedAt: updateData.updatedAt, updatedBy: updatedBy ?? null };
        if (data.partyName !== undefined) historyUpdate.partyName = data.partyName;
        if (data.amountType !== undefined) historyUpdate.amountType = data.amountType;
        if (data.amount !== undefined) historyUpdate.amount = data.amount;
        if (data.paymentMode !== undefined) historyUpdate.paymentMode = data.paymentMode;
        if (data.accountName !== undefined) historyUpdate.accountName = data.accountName;
        if (data.accountNumber !== undefined) historyUpdate.accountNumber = data.accountNumber;
        if (data.ifscCode !== undefined) historyUpdate.ifscCode = data.ifscCode;
        if (data.categoryId) historyUpdate.categoryId = data.categoryId;
        if (data.dueDate !== undefined) historyUpdate.dueDate = data.dueDate;
        if (data.paymentFrequency !== undefined) historyUpdate.paymentFrequency = data.paymentFrequency;
        if (data.makerId !== undefined) historyUpdate.makerId = data.makerId;

        // Only the current cycle's row is refreshed; completed cycles keep their
        // historical snapshot.
        await this.db
            .update(fixedExpensesHistory)
            .set(historyUpdate)
            .where(and(eq(fixedExpensesHistory.expenseId, id), currentHistoryForExpense(id)));

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

    // ===================== MAKER REQUEST CRON =====================

    /** "Printing & Stationary" -> "printing_stationary" (matches maker-request category slugs). */
    private slugifyCategory(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    /**
     * Daily cron: for every fixed expense whose workflow status is "Awaited
     * Maker" and whose workflow row (`fixed_expenses_history`) is due within the
     * next 3 days (including today), create a maker request and store its id in
     * fixed_expenses.maker_id / fixed_expenses_history.maker_id. The history
     * status and maker id act as idempotency keys, so re-running the job never
     * duplicates requests.
     *
     * The due date, status and maker link are read from the history snapshot,
     * which is refreshed whenever the expense is edited.
     *
     * Concurrency is handled by the scheduler, which holds a Postgres advisory
     * lock for the duration of the run.
     */
    async createMakerRequestsForUpcomingDueDates(): Promise<{
        created: string[];
        failed: Array<{ id: number; error: string }>;
    }> {
        const candidates = await this.db
            .select({
                id: fixedExpenses.id,
                partyName: fixedExpenses.partyName,
                amount: fixedExpenses.amount,
                accountNumber: fixedExpenses.accountNumber,
                ifscCode: fixedExpenses.ifscCode,
                type: fixedExpenses.type,
                dueDate: fixedExpensesHistory.dueDate,
                createdBy: fixedExpenses.createdBy,
            })
            .from(fixedExpenses)
            .innerJoin(fixedExpensesHistory, eq(fixedExpensesHistory.expenseId, fixedExpenses.id))
            .where(
                and(
                    eq(fixedExpensesHistory.status, "Awaited Maker"),
                    eq(fixedExpenses.deleteStatus, false),
                    isNull(fixedExpensesHistory.makerId),
                    currentHistoryJoin,
                    sql`${fixedExpensesHistory.dueDate} BETWEEN CURRENT_DATE AND CURRENT_DATE + 3`
                )
            )
            .orderBy(asc(fixedExpensesHistory.dueDate));

        const created: string[] = [];
        const failed: Array<{ id: number; error: string }> = [];

        for (const expense of candidates) {
            try {
                const makerRequest = await this.makerRequests.create(
                    {
                        partyName: expense.partyName,
                        accountNumber: expense.accountNumber ?? undefined,
                        ifsc: expense.ifscCode ?? undefined,
                        amount: expense.amount,
                        category: this.slugifyCategory(expense.type),
                        paymentMode: "BANK_TRANSFER",
                        remark: `Auto-created from fixed expense #${expense.id}, due ${expense.dueDate}`,
                    },
                    expense.createdBy
                );

                // Link the request back to the expense; this is the idempotency
                // key that stops the next cron run from creating a duplicate.
                await this.db.update(fixedExpenses).set({ makerId: makerRequest.id, updatedAt: new Date() }).where(eq(fixedExpenses.id, expense.id));
                await this.db
                    .update(fixedExpensesHistory)
                    .set({ status: "Maker Created", makerId: makerRequest.id, updatedBy: null, updatedAt: new Date() })
                    .where(and(eq(fixedExpensesHistory.expenseId, expense.id), currentHistoryForExpense(expense.id)));

                created.push(makerRequest.requestNo ?? `#${makerRequest.id}`);
            } catch (error) {
                failed.push({
                    id: expense.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return { created, failed };
    }

    // ===================== PAYMENT DONE ROLLOVER CRON =====================

    /** Adds `months` to an ISO date, clipping to the last day of the month. */
    private addMonths(isoDate: string, months: number): string {
        const [year, month, day] = isoDate.split("-").map(Number);
        const target = new Date(Date.UTC(year, month - 1 + months, 1));
        const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
        target.setUTCDate(Math.min(day, lastDay));
        return target.toISOString().slice(0, 10);
    }

    /** Next due date at or after today for the given payment frequency. */
    private nextDueDate(from: string, frequency: string): string {
        const months = FREQUENCY_MONTHS[frequency] ?? FREQUENCY_MONTHS.monthly;
        const today = new Date().toISOString().slice(0, 10);
        let next = this.addMonths(from, months);
        // If the paid cycle was overdue, keep stepping so the new cycle is never
        // created with a due date in the past.
        for (let i = 0; next < today && i < 120; i += 1) {
            next = this.addMonths(next, months);
        }
        return next;
    }

    /**
     * Daily cron: for every expense whose current workflow row is "Payment
     * Done", start the next cycle by inserting a new history row with the same
     * snapshot, the next due date derived from payment_frequency, and status
     * "Awaited Maker". The maker-request cron then picks the new row up and
     * creates its request.
     *
     * Idempotent: after the insert the latest row is "Awaited Maker", so the
     * next run no longer sees the paid row as current.
     */
    async rolloverPaidFixedExpenses(): Promise<{
        rolled: number[];
        failed: Array<{ id: number; error: string }>;
    }> {
        const paidRows = await this.db
            .select({
                expenseId: fixedExpensesHistory.expenseId,
                partyName: fixedExpensesHistory.partyName,
                amountType: fixedExpensesHistory.amountType,
                amount: fixedExpensesHistory.amount,
                paymentMode: fixedExpensesHistory.paymentMode,
                accountName: fixedExpensesHistory.accountName,
                accountNumber: fixedExpensesHistory.accountNumber,
                ifscCode: fixedExpensesHistory.ifscCode,
                categoryId: fixedExpensesHistory.categoryId,
                dueDate: fixedExpensesHistory.dueDate,
                paymentFrequency: fixedExpensesHistory.paymentFrequency,
            })
            .from(fixedExpensesHistory)
            .innerJoin(fixedExpenses, eq(fixedExpenses.id, fixedExpensesHistory.expenseId))
            .where(and(eq(fixedExpensesHistory.status, "Payment Done"), eq(fixedExpenses.deleteStatus, false), currentHistoryJoin));

        const rolled: number[] = [];
        const failed: Array<{ id: number; error: string }> = [];

        for (const row of paidRows) {
            try {
                const dueDate = this.nextDueDate(row.dueDate, row.paymentFrequency);
                const now = new Date();

                await this.db.transaction(async tx => {
                    await tx.insert(fixedExpensesHistory).values({
                        expenseId: row.expenseId,
                        partyName: row.partyName,
                        amountType: row.amountType,
                        amount: row.amount,
                        paymentMode: row.paymentMode,
                        accountName: row.accountName,
                        accountNumber: row.accountNumber,
                        ifscCode: row.ifscCode,
                        categoryId: row.categoryId,
                        dueDate,
                        paymentFrequency: row.paymentFrequency,
                        status: "Awaited Maker",
                        makerId: null,
                        updatedBy: null,
                        createdAt: now,
                        updatedAt: now,
                    });

                    // Keep the expense's own due date in step with the new cycle.
                    // maker_id keeps pointing at the completed request so payment
                    // history links stay intact until the next request is created.
                    await tx.update(fixedExpenses).set({ dueDate, updatedAt: now }).where(eq(fixedExpenses.id, row.expenseId));
                });

                rolled.push(row.expenseId);
            } catch (error) {
                failed.push({
                    id: row.expenseId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return { rolled, failed };
    }
}
