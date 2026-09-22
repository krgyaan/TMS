import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, exists, inArray, or, sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { paymentInstruments, paymentRequests } from "@/db/schemas/tendering/payment-requests.schema";
import { locations } from "@/db/schemas/master/locations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";
import { teams } from "@/db/schemas/master/teams.schema";

import type { BusinessPerformanceQuery } from "./zod/business-performance.dto";
import type {
    AssignedTenderRow,
    BusinessMetrics,
    BusinessPerformanceResponse,
    BusinessSummary,
    EmdTenderRow,
    ItemHeadingRow,
    ItemHeadingsResponse,
    ItemRow,
    MetricEntry,
    SummaryItem,
    TenderRow,
} from "./zod/business-performance.types";

const STATUS = {
    MISSED: [8, 16],
    DISQUALIFIED: [21, 22],
    RESULTS_AWAITED: [17],
    LOST: [24],
    WON: [25, 26, 27, 28],
} as const;

@Injectable()
export class BusinessPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    // ─── GET /performance/business/headings ───────────────────────────────────
    // status is boolean (not varchar '1')
    // teamId is a FK — join teams to resolve name for the dropdown label

    async getItemHeadings(): Promise<ItemHeadingsResponse> {
        const headings = (await this.db
            .select({
                id: itemHeadings.id,
                name: itemHeadings.name,
                team: teams.name, // resolved name, not teamId
            })
            .from(itemHeadings)
            .leftJoin(teams, eq(teams.id, itemHeadings.teamId))
            .where(eq(itemHeadings.status, true))) as ItemHeadingRow[];

        return { headings };
    }

    // ─── Main entry point ─────────────────────────────────────────────────────

    async getBusinessPerformance(query: BusinessPerformanceQuery): Promise<BusinessPerformanceResponse> {
        const { heading, fromDate, toDate } = query;

        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);

        this.logger.info("Fetching business performance", { heading, fromDate, toDate });

        try {
            const [tenderRows, assignedRows, itemRows, emdRows] = await Promise.all([
                this.getTenders(heading, from, to),
                this.getAssignedTenders(heading, from, to),
                this.getItemsUnderHeading(heading),
                this.getEmdTenders(heading, from, to),
            ]);

            const assignedApproved = this.buildAssignedApprovedSummary(assignedRows);
            const bidSummary = this.calculateSummary(tenderRows);
            const emdSummary = this.buildEmdSummary(emdRows);
            const metrics = this.getMetrics(tenderRows);

            // Tenders assigned but never bid on (no bid submission row exists)
            const bidTenderIds = new Set(tenderRows.map(t => t.tenderId));
            const tenders_not_bid = this.buildNotBidSummary(assignedRows, bidTenderIds);

            const summary: BusinessSummary = {
                ...assignedApproved,
                ...bidSummary,
                ...emdSummary,
                tenders_not_bid,
            };

            this.logger.info("Business performance computed", { heading });

            return { items: itemRows, summary, metrics };
        } catch (error: any) {
            this.logger.error("Failed to fetch business performance", {
                message: error?.message,
                stack: error?.stack,
            });
            throw error;
        }
    }

    // ─── Query 1: bid submissions ─────────────────────────────────────────────
    // items.headingId is a FK bigint — simple eq() replaces the old name+team join

    private async getTenders(heading: number, from: Date, to: Date): Promise<TenderRow[]> {
        return this.db
            .select({
                id: bidSubmissions.id,
                tenderId: bidSubmissions.tenderId,
                team: tenderInfos.team,
                location: tenderInfos.location,
                item: tenderInfos.item,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                bidStatus: bidSubmissions.status,
                tenderStatus: tenderInfos.status,
                state: locations.state,
                region: locations.region,
                itemName: items.name,
            })
            .from(bidSubmissions)
            .innerJoin(tenderInfos, eq(tenderInfos.id, bidSubmissions.tenderId))
            .innerJoin(locations, eq(locations.id, tenderInfos.location))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(eq(itemHeadings.id, heading), between(bidSubmissions.submissionDatetime, from, to))) as unknown as TenderRow[];
    }

    // ─── Query 2: all tenders (assigned / approved) ───────────────────────────

    private async getAssignedTenders(heading: number, from: Date, to: Date): Promise<AssignedTenderRow[]> {
        return this.db
            .select({
                id: tenderInfos.id,
                team: tenderInfos.team,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                tlStatus: tenderInfos.tlStatus,
                tenderStatus: tenderInfos.status,
                state: locations.state,
                region: locations.region,
                itemName: items.name,
            })
            .from(tenderInfos)
            .innerJoin(locations, eq(locations.id, tenderInfos.location))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(eq(tenderInfos.deleteStatus, 0), eq(itemHeadings.id, heading), between(tenderInfos.dueDate, from, to))) as unknown as AssignedTenderRow[];
    }

    // ─── Query 3: EMD paid / returned ────────────────────────────────────────
    // Uses correlated EXISTS against payment_requests (purpose = 'EMD') +
    // payment_instruments (action/status stages) — same logic as the customer dashboard.

    private async getEmdTenders(heading: number, from: Date, to: Date): Promise<EmdTenderRow[]> {
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

        return this.db
            .select({
                id: tenderInfos.id,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                hasEmdPaid,
                hasEmdReturned,
            })
            .from(tenderInfos)
            .innerJoin(locations, eq(locations.id, tenderInfos.location))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(eq(tenderInfos.deleteStatus, 0), eq(itemHeadings.id, heading), between(tenderInfos.dueDate, from, to))) as unknown as EmdTenderRow[];
    }

    // ─── Query 4: items under heading ─────────────────────────────────────────

    async getItemsUnderHeading(headingId: number): Promise<ItemRow[]> {
        return this.db
            .select({
                id: items.id,
                name: items.name,
            })
            .from(items)
            .where(eq(items.headingId, headingId)) as unknown as ItemRow[];
    }

    // ─── Builders (unchanged from original) ───────────────────────────────────

    private buildAssignedApprovedSummary(rows: AssignedTenderRow[]): Pick<BusinessSummary, "tenders_assigned" | "tenders_approved"> {
        const approved = rows.filter(r => r.tlStatus === 1);

        return {
            tenders_assigned: {
                count: rows.length,
                value: rows.reduce((acc, r) => acc + parseFloat(r.gstValues || "0"), 0),
                tender: rows.map(r => r.tenderName),
            },
            tenders_approved: {
                count: approved.length,
                value: approved.reduce((acc, r) => acc + parseFloat(r.gstValues || "0"), 0),
                tender: approved.map(r => r.tenderName),
            },
        };
    }

    // ─── Builders (EMD paid / returned) ───────────────────────────────────────

    private buildEmdSummary(rows: EmdTenderRow[]): Pick<BusinessSummary, "emd_paid" | "emd_returned"> {
        const emd_paid = this.emptySummaryItem();
        const emd_returned = this.emptySummaryItem();

        for (const row of rows) {
            if (row.hasEmdPaid) this.add(emd_paid, row);
            if (row.hasEmdReturned) this.add(emd_returned, row);
        }

        return { emd_paid, emd_returned };
    }

    // ─── Builders (did not bid) ───────────────────────────────────────────────
    // Assigned tenders (by due date) that have no bid submission row.

    private buildNotBidSummary(assignedRows: AssignedTenderRow[], bidTenderIds: Set<number>): SummaryItem {
        const notBid = this.emptySummaryItem();

        for (const row of assignedRows) {
            if (!bidTenderIds.has(row.id)) {
                this.add(notBid, row);
            }
        }

        return notBid;
    }

    private calculateSummary(
        tenders: TenderRow[]
    ): Pick<BusinessSummary, "tenders_bid" | "tenders_missed" | "tenders_disqualified" | "tender_results_awaited" | "tenders_won" | "tenders_lost"> {
        const summary = {
            tenders_bid: this.emptySummaryItem(),
            tenders_missed: this.emptySummaryItem(),
            tenders_disqualified: this.emptySummaryItem(),
            tender_results_awaited: this.emptySummaryItem(),
            tenders_won: this.emptySummaryItem(),
            tenders_lost: this.emptySummaryItem(),
        };

        for (const tender of tenders) {
            const s = Number(tender.tenderStatus);

            if ((STATUS.MISSED as readonly number[]).includes(s)) this.add(summary.tenders_missed, tender);
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) this.add(summary.tenders_disqualified, tender);
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) this.add(summary.tender_results_awaited, tender);
            else if ((STATUS.LOST as readonly number[]).includes(s)) this.add(summary.tenders_lost, tender);
            else if ((STATUS.WON as readonly number[]).includes(s)) this.add(summary.tenders_won, tender);

            if (tender.bidStatus === "Bid Submitted") this.add(summary.tenders_bid, tender);
        }

        return summary;
    }

    private getMetrics(tenders: TenderRow[]): BusinessMetrics {
        const by_region: Record<string, MetricEntry> = {};
        const by_state: Record<string, MetricEntry> = {};
        const by_item: Record<string, MetricEntry> = {};
        let total_count = 0;
        let total_value = 0;

        for (const tender of tenders) {
            const value = parseFloat(tender.gstValues || "0");

            const region = tender.region ?? "Unknown";
            by_region[region] = { count: (by_region[region]?.count ?? 0) + 1, value: (by_region[region]?.value ?? 0) + value };

            const state = tender.state ?? "Unknown";
            by_state[state] = { count: (by_state[state]?.count ?? 0) + 1, value: (by_state[state]?.value ?? 0) + value };

            const item = tender.itemName ?? "Unknown";
            by_item[item] = { count: (by_item[item]?.count ?? 0) + 1, value: (by_item[item]?.value ?? 0) + value };

            total_count++;
            total_value += value;
        }

        return { by_region, by_state, by_item, total_count, total_value };
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private emptySummaryItem(): SummaryItem {
        return { count: 0, value: 0, tender: [] };
    }

    private add(item: SummaryItem, row: Pick<TenderRow, "tenderName" | "gstValues">): void {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tender.push(row.tenderName);
    }
}
