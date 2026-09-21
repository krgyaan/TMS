import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, exists, inArray, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { rfqs } from "@/db/schemas/tendering/rfqs.schema";
import { tenderCostingSheets } from "@/db/schemas/tendering/tender-costing-sheets.schema";
import { tenderCostingDetails } from "@/db/schemas/tendering/tender-costing-details.schema";
import { organizations } from "@/db/schemas/master/organizations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";
import { teams } from "@/db/schemas/master/teams.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { paymentInstruments, paymentRequests } from "@/db/schemas/tendering/payment-requests.schema";

import type { CustomerPerformanceQuery } from "./zod/customer-performance.dto";
import type {
    CustomerMetrics,
    CustomerPerformanceResponse,
    CustomerSummary,
    CustomerTenderRow,
    MetricEntry,
    SummaryItem,
    TenderListItem,
    TenderRow,
} from "./zod/customer-performance.types";

// ─── Status buckets ───────────────────────────────────────────────────────────
const STATUS = {
    MISSED: [8, 16],
    DISQUALIFIED: [21, 22],
    RESULTS_AWAITED: [17],
    LOST: [24],
    WON: [25, 26, 27, 28],
    // tenders_approved in this module = reached a result stage
    APPROVED: [17, 24, 25, 26, 27, 28],
} as const;

const DATE_FORMAT = "dd-MM-yyyy hh:mm a";

const STATUS_LABEL = (s: number): string =>
    (STATUS.WON as readonly number[]).includes(s)
        ? "Won"
        : (STATUS.MISSED as readonly number[]).includes(s)
          ? "Missed"
          : (STATUS.LOST as readonly number[]).includes(s)
            ? "Lost"
            : (STATUS.DISQUALIFIED as readonly number[]).includes(s)
              ? "Disqualified"
              : (STATUS.RESULTS_AWAITED as readonly number[]).includes(s)
                ? "Results Awaited"
                : "Assigned";

@Injectable()
export class CustomerPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    async getCustomerPerformance(query: CustomerPerformanceQuery): Promise<CustomerPerformanceResponse> {
        this.logger.info("Fetching customer performance", { query });

        try {
            const [tenderRows, tenderListResult] = await Promise.all([this.getTenders(query), this.getTenderList(query)]);
            const summary = this.calculateSummary(tenderRows);
            const metrics = this.getMetrics(tenderRows);

            this.logger.info("Customer performance computed", {
                rowCount: tenderRows.length,
                tenderListCount: tenderListResult.tenderList.length,
            });

            return { summary, metrics, tenderList: tenderListResult.tenderList, avgGrossMargin: tenderListResult.avgGrossMargin };
        } catch (error) {
            const e = error as Error;
            this.logger.error("Failed to fetch customer performance", {
                message: e?.message,
                stack: e?.stack,
            });
            throw error;
        }
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    private async getTenders(filters: CustomerPerformanceQuery): Promise<TenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (filters.org) {
            conditions.push(eq(tenderInfos.organization, filters.org));
        }
        if (filters.teamCategory) {
            conditions.push(eq(teams.name, filters.teamCategory));
        }
        if (filters.itemHeading) {
            conditions.push(eq(itemHeadings.id, filters.itemHeading));
        }
        if (filters.fromDate && filters.toDate) {
            const from = new Date(filters.fromDate);
            const to = new Date(filters.toDate);
            to.setHours(23, 59, 59, 999);
            conditions.push(between(bidSubmissions.submissionDatetime, from, to));
        }

        return this.db
            .select({
                id: bidSubmissions.id,
                tenderId: bidSubmissions.tenderId,
                team: tenderInfos.team,
                item: tenderInfos.item,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                bidStatus: bidSubmissions.status,
                tenderStatus: tenderInfos.status,
                orgId: organizations.id,
                orgName: organizations.name,
                itemHeadingName: itemHeadings.name,
                avgGrossMargin: this.avgGrossMarginSubquery(),
            })
            .from(bidSubmissions)
            .innerJoin(tenderInfos, eq(tenderInfos.id, bidSubmissions.tenderId))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .where(and(...conditions));
    }

    private async getTenderList(filters: CustomerPerformanceQuery): Promise<{ tenderList: TenderListItem[]; avgGrossMargin: number | null }> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (filters.org) {
            conditions.push(eq(tenderInfos.organization, filters.org));
        }
        if (filters.teamCategory) {
            conditions.push(eq(teams.name, filters.teamCategory));
        }
        if (filters.itemHeading) {
            conditions.push(eq(itemHeadings.id, filters.itemHeading));
        }
        if (filters.fromDate && filters.toDate) {
            const from = new Date(filters.fromDate);
            const to = new Date(filters.toDate);
            to.setHours(23, 59, 59, 999);
            conditions.push(between(tenderInfos.dueDate, from, to));
        }

        const emdPaidFilter = and(
            eq(paymentRequests.tenderId, tenderInfos.id),
            eq(paymentRequests.purpose, "EMD"),
            sql`CAST(${paymentRequests.amountRequired} AS DECIMAL) > 0`,
            eq(paymentInstruments.isActive, true),
            or(
                and(eq(paymentInstruments.action, 1), eq(paymentInstruments.status, "ACCOUNTS_FORM_ACCEPTED")),
                and(
                    eq(paymentInstruments.action, 2),
                    eq(paymentInstruments.status, "FOLLOWUP_INITIATED"),
                    inArray(paymentInstruments.instrumentType, ["DD", "FDR", "Cheque", "Bank Transfer", "Portal Payment"])
                ),
                and(eq(paymentInstruments.action, 4), eq(paymentInstruments.status, "FOLLOWUP_INITIATED"), eq(paymentInstruments.instrumentType, "BG"))
            )
        );

        const emdReturnedFilter = and(
            eq(paymentRequests.tenderId, tenderInfos.id),
            eq(paymentRequests.purpose, "EMD"),
            eq(paymentInstruments.isActive, true),
            or(
                and(inArray(paymentInstruments.instrumentType, ["Bank Transfer", "Portal Payment", "DD", "FDR"]), inArray(paymentInstruments.action, [3, 4])),
                and(eq(paymentInstruments.instrumentType, "BG"), eq(paymentInstruments.action, 6))
            )
        );

        const hasEmdPaid = exists(
            this.db
                .select({ one: sql`1` })
                .from(paymentRequests)
                .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
                .where(emdPaidFilter)
        );

        const hasEmdReturned = exists(
            this.db
                .select({ one: sql`1` })
                .from(paymentRequests)
                .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
                .where(emdReturnedFilter)
        );

        const rows = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                gstValues: tenderInfos.gstValues,
                member: users.name,
                team: teams.name,
                itemName: items.name,
                status: tenderInfos.status,
                rfqSentOn: sql<Date | null>`MIN(${rfqs.createdAt})`,
                bidStatus: bidSubmissions.status,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                hasEmdPaid,
                hasEmdReturned,
                avgGrossMargin: this.avgGrossMarginSubquery(),
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(and(...conditions))
            .groupBy(tenderInfos.id, users.name, teams.name, items.name, bidSubmissions.status)
            .orderBy(tenderInfos.dueDate)
            .execute();

        const rawRows = rows as unknown as CustomerTenderRow[];

        const margins = rawRows.map(row => Number(row.avgGrossMargin)).filter(v => Number.isFinite(v));
        const avgGrossMargin = margins.length > 0 ? margins.reduce((acc, v) => acc + v, 0) / margins.length : null;

        const tenderList = rawRows.map(row => {
            const s = Number(row.status);

            // Mirror calculateSummary() bucket logic — status buckets are mutually exclusive,
            // then the additive buckets (bid, approved) plus the base assigned bucket apply.
            const categories: string[] = ["assigned"];

            if ((STATUS.MISSED as readonly number[]).includes(s)) categories.push("missed");
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) categories.push("disqualified");
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) categories.push("results_awaited");
            else if ((STATUS.LOST as readonly number[]).includes(s)) categories.push("lost");
            else if ((STATUS.WON as readonly number[]).includes(s)) categories.push("won");

            if (row.bidStatus === "Bid Submitted") categories.push("bid");
            if (row.bidStatus !== "Bid Submitted") categories.push("did_not_bid");
            if ((STATUS.APPROVED as readonly number[]).includes(s)) categories.push("approved");

            if (row.hasEmdPaid) categories.push("emd_paid");
            if (row.hasEmdReturned) categories.push("emd_returned");

            return {
                id: row.id,
                tenderNo: row.tenderNo,
                tenderName: row.tenderName,
                dueDate: format(row.dueDate, DATE_FORMAT),
                gstValues: row.gstValues,
                member: row.member ?? "—",
                team: row.team ?? "—",
                item: row.itemName ?? "—",
                createdAt: row.rfqSentOn ? format(new Date(row.rfqSentOn), DATE_FORMAT) : "—",
                status: STATUS_LABEL(s),
                bidStatus: row.bidStatus ?? "—",
                category: categories,
                emd: row.emd,
                emdMode: row.emdMode,
            };
        });

        return { tenderList, avgGrossMargin };
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    //
    // Mirrors Laravel's calculateSummary exactly:
    //   - tenders_assigned = all rows (every bid_submission counts)
    //   - tenders_approved = status in [17, 24, 25, 26, 27, 28]

    private calculateSummary(tenders: TenderRow[]): CustomerSummary {
        const summary: CustomerSummary = {
            tenders_assigned: this.empty(),
            tenders_approved: this.empty(),
            tenders_missed: this.empty(),
            tenders_bid: this.empty(),
            tender_results_awaited: this.empty(),
            tenders_disqualified: this.empty(),
            tenders_won: this.empty(),
            tenders_lost: this.empty(),
        };

        for (const tender of tenders) {
            const s = Number(tender.tenderStatus);

            // Every row is assigned
            this.add(summary.tenders_assigned, tender);

            // Status buckets
            if ((STATUS.MISSED as readonly number[]).includes(s)) this.add(summary.tenders_missed, tender);
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) this.add(summary.tenders_disqualified, tender);
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) this.add(summary.tender_results_awaited, tender);
            else if ((STATUS.LOST as readonly number[]).includes(s)) this.add(summary.tenders_lost, tender);
            else if ((STATUS.WON as readonly number[]).includes(s)) this.add(summary.tenders_won, tender);

            if (tender.bidStatus === "Bid Submitted") this.add(summary.tenders_bid, tender);
            if ((STATUS.APPROVED as readonly number[]).includes(s)) this.add(summary.tenders_approved, tender);
        }

        return summary;
    }

    // ─── Metrics ──────────────────────────────────────────────────────────────
    //
    // by_region / by_state are omitted — locations table is not joined in this
    // module (Laravel had the same gap). Add a locations join if needed later.

    private getMetrics(tenders: TenderRow[]): CustomerMetrics {
        const by_item: Record<string, MetricEntry> = {};
        let total_count = 0;
        let total_value = 0;

        for (const tender of tenders) {
            const value = parseFloat(tender.gstValues || "0");
            const item = tender.itemHeadingName ?? "Unknown";

            by_item[item] = {
                count: (by_item[item]?.count ?? 0) + 1,
                value: (by_item[item]?.value ?? 0) + value,
            };

            total_count++;
            total_value += value;
        }

        return { total_value, total_count, by_item };
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    
    private avgGrossMarginSubquery() {
        return sql<number | null>`
            (SELECT AVG(${tenderCostingDetails.grossMargin})::float8
             FROM ${tenderCostingSheets}
             INNER JOIN ${tenderCostingDetails} ON ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
             WHERE ${tenderCostingSheets.tenderId} = ${tenderInfos.id}
               AND ${tenderCostingDetails.grossMargin} IS NOT NULL)
        `;
    }

    private empty(): SummaryItem {
        return { count: 0, value: 0, tender: [] };
    }

    private add(item: SummaryItem, row: Pick<TenderRow, "tenderName" | "gstValues">): void {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tender.push(row.tenderName);
    }
}
