import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { tdsReturns } from "@/db/schemas/operations/tds-returns.schema";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";

export interface ChecklistListFilters {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    year?: number;
    month?: number;
}

export interface TdsChecklistRow {
    id: number;
    projectName: string | null;
    poNumber: string | null;
    partyName: string | null;
    sellerName: string | null;
    amount: string | null;
    tdsAmount: string;
    tdsReturnDate: string;
    invoiceDate: string | null;
}

export interface TdsChecklistSummary {
    totalAmount: number;
    totalTdsAmount: number;
}

export type TdsChecklistResult = PaginatedResult<TdsChecklistRow> & {
    summary: TdsChecklistSummary;
};

/**
 * Build [start, end) date bounds for a year (and optional month).
 * Returns null when no year is provided.
 */
export function buildDateRange(year?: number, month?: number): { start: string; end: string } | null {
    if (!year) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (month) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return {
            start: `${year}-${pad(month)}-01`,
            end: `${nextYear}-${pad(nextMonth)}-01`,
        };
    }
    return {
        start: `${year}-01-01`,
        end: `${year + 1}-01-01`,
    };
}

@Injectable()
export class TdsChecklistService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(filters: ChecklistListFilters = {}): Promise<TdsChecklistResult> {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: any[] = [];

        if (filters.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(sql`
                ${projects.projectName} ILIKE ${searchStr} OR
                ${purchaseOrders.poNumber} ILIKE ${searchStr} OR
                ${purchaseOrders.sellerName} ILIKE ${searchStr} OR
                ${vendorWorkOrders.woNumber} ILIKE ${searchStr} OR
                ${vendorWorkOrders.sellerName} ILIKE ${searchStr} OR
                ${paymentRequests.partyName} ILIKE ${searchStr} OR
                ${paymentRequests.amount}::text ILIKE ${searchStr} OR
                ${tdsReturns.tdsAmount}::text ILIKE ${searchStr} OR
                ${tdsReturns.tdsReturnDate}::text ILIKE ${searchStr} OR
                ${tdsReturns.invoiceDate}::text ILIKE ${searchStr}
            `);
        }

        const dateRange = buildDateRange(filters.year, filters.month);
        if (dateRange) {
            conditions.push(sql`${tdsReturns.tdsReturnDate} >= ${dateRange.start} AND ${tdsReturns.tdsReturnDate} < ${dateRange.end}`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [aggregate] = await this.db
            .select({
                count: sql<number>`count(*)`,
                totalAmount: sql<number>`coalesce(sum(${paymentRequests.amount}), 0)`,
                totalTdsAmount: sql<number>`coalesce(sum(${tdsReturns.tdsAmount}), 0)`,
            })
            .from(tdsReturns)
            .leftJoin(projects, eq(projects.id, tdsReturns.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, tdsReturns.poId))
            .leftJoin(vendorWorkOrders, eq(vendorWorkOrders.id, tdsReturns.vwoId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, tdsReturns.prId))
            .where(whereClause);
        const total = Number(aggregate?.count ?? 0);
        const summary: TdsChecklistSummary = {
            totalAmount: Number(aggregate?.totalAmount ?? 0),
            totalTdsAmount: Number(aggregate?.totalTdsAmount ?? 0),
        };

        const sortFn = filters.sortOrder === "desc" ? desc : asc;
        let orderByClause = desc(tdsReturns.id);
        switch (filters.sortBy) {
            case "projectName":
                orderByClause = sortFn(projects.projectName);
                break;
            case "poNumber":
                orderByClause = sortFn(sql`COALESCE(${purchaseOrders.poNumber}, ${vendorWorkOrders.woNumber})`);
                break;
            case "partyName":
                orderByClause = sortFn(paymentRequests.partyName);
                break;
            case "sellerName":
                orderByClause = sortFn(sql`COALESCE(${purchaseOrders.sellerName}, ${vendorWorkOrders.sellerName})`);
                break;
            case "amount":
                orderByClause = sortFn(paymentRequests.amount);
                break;
            case "tdsAmount":
                orderByClause = sortFn(tdsReturns.tdsAmount);
                break;
            case "tdsReturnDate":
                orderByClause = sortFn(tdsReturns.tdsReturnDate);
                break;
            case "invoiceDate":
                orderByClause = sortFn(tdsReturns.invoiceDate);
                break;
        }

        const rows = await this.db
            .select({
                id: tdsReturns.id,
                projectName: projects.projectName,
                poNumber: sql<string | null>`COALESCE(${purchaseOrders.poNumber}, ${vendorWorkOrders.woNumber})`,
                partyName: paymentRequests.partyName,
                sellerName: sql<string | null>`COALESCE(${purchaseOrders.sellerName}, ${vendorWorkOrders.sellerName})`,
                amount: paymentRequests.amount,
                tdsAmount: tdsReturns.tdsAmount,
                tdsReturnDate: tdsReturns.tdsReturnDate,
                invoiceDate: tdsReturns.invoiceDate,
            })
            .from(tdsReturns)
            .leftJoin(projects, eq(projects.id, tdsReturns.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, tdsReturns.poId))
            .leftJoin(vendorWorkOrders, eq(vendorWorkOrders.id, tdsReturns.vwoId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, tdsReturns.prId))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            ...wrapPaginatedResponse(rows as TdsChecklistRow[], total, page, limit),
            summary,
        };
    }
}
