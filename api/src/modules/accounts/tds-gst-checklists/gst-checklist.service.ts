import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { gst2bReco } from "@/db/schemas/operations/gst2b-reco.schema";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import { buildDateRange } from "./tds-checklist.service";
import type { ChecklistListFilters } from "./tds-checklist.service";

export interface GstChecklistRow {
    id: number;
    projectName: string | null;
    poNumber: string | null;
    invoiceNo: string | null;
    partyName: string | null;
    category: string | null;
    invoiceValue: string | null;
    gstAmount: string;
    invoiceDate: string;
}

export interface GstChecklistSummary {
    totalInvoiceValue: number;
    totalGstAmount: number;
}

export type GstChecklistResult = PaginatedResult<GstChecklistRow> & {
    summary: GstChecklistSummary;
};

@Injectable()
export class GstChecklistService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(filters: ChecklistListFilters = {}): Promise<GstChecklistResult> {
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
                ${purchaseInvoices.invoiceNo} ILIKE ${searchStr} OR
                ${purchaseInvoices.partyName} ILIKE ${searchStr} OR
                ${purchaseInvoices.category} ILIKE ${searchStr} OR
                ${purchaseInvoices.valuePreGst}::text ILIKE ${searchStr} OR
                ${gst2bReco.gstAmount}::text ILIKE ${searchStr} OR
                ${gst2bReco.invoiceDate}::text ILIKE ${searchStr}
            `);
        }

        const dateRange = buildDateRange(filters.year, filters.month);
        if (dateRange) {
            conditions.push(sql`${gst2bReco.invoiceDate} >= ${dateRange.start} AND ${gst2bReco.invoiceDate} < ${dateRange.end}`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [aggregate] = await this.db
            .select({
                count: sql<number>`count(*)`,
                totalInvoiceValue: sql<number>`coalesce(sum(${purchaseInvoices.valuePreGst}), 0)`,
                totalGstAmount: sql<number>`coalesce(sum(${gst2bReco.gstAmount}), 0)`,
            })
            .from(gst2bReco)
            .leftJoin(projects, eq(projects.id, gst2bReco.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, gst2bReco.poId))
            .leftJoin(purchaseInvoices, eq(purchaseInvoices.id, gst2bReco.invoiceId))
            .where(whereClause);
        const total = Number(aggregate?.count ?? 0);
        const summary: GstChecklistSummary = {
            totalInvoiceValue: Number(aggregate?.totalInvoiceValue ?? 0),
            totalGstAmount: Number(aggregate?.totalGstAmount ?? 0),
        };

        const sortFn = filters.sortOrder === "desc" ? desc : asc;
        let orderByClause = desc(gst2bReco.id);
        switch (filters.sortBy) {
            case "projectName":
                orderByClause = sortFn(projects.projectName);
                break;
            case "poNumber":
                orderByClause = sortFn(purchaseOrders.poNumber);
                break;
            case "invoiceNo":
                orderByClause = sortFn(purchaseInvoices.invoiceNo);
                break;
            case "partyName":
                orderByClause = sortFn(purchaseInvoices.partyName);
                break;
            case "category":
                orderByClause = sortFn(purchaseInvoices.category);
                break;
            case "invoiceValue":
                orderByClause = sortFn(purchaseInvoices.valuePreGst);
                break;
            case "gstAmount":
                orderByClause = sortFn(gst2bReco.gstAmount);
                break;
            case "invoiceDate":
                orderByClause = sortFn(gst2bReco.invoiceDate);
                break;
        }

        const rows = await this.db
            .select({
                id: gst2bReco.id,
                projectName: projects.projectName,
                poNumber: purchaseOrders.poNumber,
                invoiceNo: purchaseInvoices.invoiceNo,
                partyName: purchaseInvoices.partyName,
                category: purchaseInvoices.category,
                invoiceValue: purchaseInvoices.valuePreGst,
                gstAmount: gst2bReco.gstAmount,
                invoiceDate: gst2bReco.invoiceDate,
            })
            .from(gst2bReco)
            .leftJoin(projects, eq(projects.id, gst2bReco.projectId))
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, gst2bReco.poId))
            .leftJoin(purchaseInvoices, eq(purchaseInvoices.id, gst2bReco.invoiceId))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            ...wrapPaginatedResponse(rows as GstChecklistRow[], total, page, limit),
            summary,
        };
    }
}
