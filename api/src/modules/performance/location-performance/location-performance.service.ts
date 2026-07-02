import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, or } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { locations } from "@/db/schemas/master/locations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";

import type { LocationPerformanceQuery } from "./zod/location-performance.dto";
import type {
    AssignedTenderRow,
    ItemRow,
    LocationMetrics,
    LocationPerformanceResponse,
    LocationSummary,
    MetricEntry,
    SummaryItem,
    TenderRow,
} from "./zod/location-performance.types";

const STATUS = {
    MISSED: [8, 16],
    DISQUALIFIED: [21, 22],
    RESULTS_AWAITED: [17],
    LOST: [24],
    WON: [25, 26, 27, 28],
} as const;

@Injectable()
export class LocationPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    async getLocationPerformance(query: LocationPerformanceQuery): Promise<LocationPerformanceResponse> {
        this.logger.info("Fetching location performance", { query });

        try {
            const [tenderRows, assignedRows, itemRows] = await Promise.all([
                this.getTenders(query),
                this.getAssignedTenders(query),
                query.heading ? this.getItemsUnderHeading(query.heading) : Promise.resolve([]),
            ]);

            const assignedApproved = this.buildAssignedApprovedSummary(assignedRows);
            const bidSummary = this.calculateSummary(tenderRows);
            const summary = { ...assignedApproved, ...bidSummary };
            const metrics = this.getMetrics(tenderRows);

            this.logger.info("Location performance computed", {
                tenderRows: tenderRows.length,
                assignedRows: assignedRows.length,
            });

            return { items: itemRows, summary, metrics };
        } catch (error: any) {
            this.logger.error("Failed to fetch location performance", {
                message: error?.message,
                stack: error?.stack,
            });
            throw error;
        }
    }

    // ─── Query 1: bid submissions ─────────────────────────────────────────────

    private async getTenders(filters: LocationPerformanceQuery): Promise<TenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationConditions: ReturnType<typeof eq>[] = [];
        if (filters.location) locationConditions.push(eq(locations.id, filters.location));
        if (filters.area) locationConditions.push(eq(locations.region, filters.area));
        if (locationConditions.length === 1) conditions.push(locationConditions[0]);
        if (locationConditions.length === 2) conditions.push(or(...locationConditions)!);

        if (filters.team) conditions.push(eq(tenderInfos.team, filters.team));
        if (filters.heading) conditions.push(eq(itemHeadings.id, filters.heading));

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
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(...conditions)) as unknown as TenderRow[];
    }

    // ─── Query 2: assigned / approved ────────────────────────────────────────

    private async getAssignedTenders(filters: LocationPerformanceQuery): Promise<AssignedTenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationConditions: ReturnType<typeof eq>[] = [];
        if (filters.location) locationConditions.push(eq(locations.id, filters.location));
        if (filters.area) locationConditions.push(eq(locations.region, filters.area));
        if (locationConditions.length === 1) conditions.push(locationConditions[0]);
        if (locationConditions.length === 2) conditions.push(or(...locationConditions)!);

        if (filters.team) conditions.push(eq(tenderInfos.team, filters.team));
        if (filters.heading) conditions.push(eq(itemHeadings.id, filters.heading));

        if (filters.fromDate && filters.toDate) {
            const from = new Date(filters.fromDate);
            const to = new Date(filters.toDate);
            to.setHours(23, 59, 59, 999);
            conditions.push(between(tenderInfos.dueDate, from, to));
        }

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
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(...conditions)) as unknown as AssignedTenderRow[];
    }

    // ─── Query 3: items under heading ─────────────────────────────────────────

    async getItemsUnderHeading(headingId: number): Promise<ItemRow[]> {
        return this.db.select({ id: items.id, name: items.name }).from(items).where(eq(items.headingId, headingId)) as unknown as ItemRow[];
    }

    // ─── Builders ─────────────────────────────────────────────────────────────

    private buildAssignedApprovedSummary(rows: AssignedTenderRow[]): Pick<LocationSummary, "tenders_assigned" | "tenders_approved"> {
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

    private calculateSummary(tenders: TenderRow[]): Omit<LocationSummary, "tenders_assigned" | "tenders_approved"> {
        const summary = {
            tenders_bid: this.empty(),
            tenders_missed: this.empty(),
            tenders_disqualified: this.empty(),
            tender_results_awaited: this.empty(),
            tenders_won: this.empty(),
            tenders_lost: this.empty(),
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

    // total_count / total_value removed — not in LocationMetrics type
    private getMetrics(tenders: TenderRow[]): LocationMetrics {
        const by_region: Record<string, MetricEntry> = {};
        const by_state: Record<string, MetricEntry> = {};
        const by_item: Record<string, MetricEntry> = {};

        for (const tender of tenders) {
            const value = parseFloat(tender.gstValues || "0");
            const region = tender.region ?? "Unknown";
            const state = tender.state ?? "Unknown";
            const item = tender.itemName ?? "Unknown";

            by_region[region] = { count: (by_region[region]?.count ?? 0) + 1, value: (by_region[region]?.value ?? 0) + value };
            by_state[state] = { count: (by_state[state]?.count ?? 0) + 1, value: (by_state[state]?.value ?? 0) + value };
            by_item[item] = { count: (by_item[item]?.count ?? 0) + 1, value: (by_item[item]?.value ?? 0) + value };
        }

        return { by_region, by_state, by_item };
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
