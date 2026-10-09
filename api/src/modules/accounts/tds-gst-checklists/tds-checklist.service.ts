import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { tdsReturns } from "@/db/schemas/operations/tds-returns.schema";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";

export interface ChecklistListFilters {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
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

@Injectable()
export class TdsChecklistService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(filters: ChecklistListFilters = {}): Promise<PaginatedResult<TdsChecklistRow>> {
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
                ${paymentRequests.partyName} ILIKE ${searchStr} OR
                ${paymentRequests.amount}::text ILIKE ${searchStr} OR
                ${tdsReturns.tdsAmount}::text ILIKE ${searchStr} OR
                ${tdsReturns.tdsReturnDate}::text ILIKE ${searchStr} OR
                ${tdsReturns.invoiceDate}::text ILIKE ${searchStr}
            `);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tdsReturns)
            .leftJoin(projects, eq(projects.id, tdsReturns.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, tdsReturns.poId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, tdsReturns.prId))
            .where(whereClause);
        const total = Number(countResult?.count ?? 0);

        const sortFn = filters.sortOrder === "desc" ? desc : asc;
        let orderByClause = desc(tdsReturns.id);
        switch (filters.sortBy) {
            case "projectName":
                orderByClause = sortFn(projects.projectName);
                break;
            case "poNumber":
                orderByClause = sortFn(purchaseOrders.poNumber);
                break;
            case "partyName":
                orderByClause = sortFn(paymentRequests.partyName);
                break;
            case "sellerName":
                orderByClause = sortFn(purchaseOrders.sellerName);
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
                poNumber: purchaseOrders.poNumber,
                partyName: paymentRequests.partyName,
                sellerName: purchaseOrders.sellerName,
                amount: paymentRequests.amount,
                tdsAmount: tdsReturns.tdsAmount,
                tdsReturnDate: tdsReturns.tdsReturnDate,
                invoiceDate: tdsReturns.invoiceDate,
            })
            .from(tdsReturns)
            .leftJoin(projects, eq(projects.id, tdsReturns.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, tdsReturns.poId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, tdsReturns.prId))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return wrapPaginatedResponse(rows as TdsChecklistRow[], total, page, limit);
    }
}
