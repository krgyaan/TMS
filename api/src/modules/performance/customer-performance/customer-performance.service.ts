import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { organizations } from "@/db/schemas/master/organizations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";

import type { CustomerPerformanceQuery } from "./zod/customer-performance.dto";
import type { CustomerMetrics, CustomerPerformanceResponse, CustomerSummary, MetricEntry, SummaryItem, TenderRow } from "./zod/customer-performance.types";

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
            const tenderRows = await this.getTenders(query);
            const summary = this.calculateSummary(tenderRows);
            const metrics = this.getMetrics(tenderRows);

            this.logger.info("Customer performance computed", {
                rowCount: tenderRows.length,
            });

            return { summary, metrics };
        } catch (error: any) {
            this.logger.error("Failed to fetch customer performance", {
                message: error?.message,
                stack: error?.stack,
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
        if (filters.teamId) {
            conditions.push(eq(tenderInfos.team, filters.teamId));
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
            })
            .from(bidSubmissions)
            .innerJoin(tenderInfos, eq(tenderInfos.id, bidSubmissions.tenderId))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(...conditions)) as unknown as TenderRow[];
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

    private empty(): SummaryItem {
        return { count: 0, value: 0, tender: [] };
    }

    private add(item: SummaryItem, row: Pick<TenderRow, "tenderName" | "gstValues">): void {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tender.push(row.tenderName);
    }
}
