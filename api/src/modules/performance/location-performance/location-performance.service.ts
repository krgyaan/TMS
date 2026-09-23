import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, exists, inArray, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { paymentInstruments, paymentRequests } from "@/db/schemas/tendering/payment-requests.schema";
import { tenderCostingSheets } from "@/db/schemas/tendering/tender-costing-sheets.schema";
import { tenderCostingDetails } from "@/db/schemas/tendering/tender-costing-details.schema";
import { locations } from "@/db/schemas/master/locations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";
import { teams } from "@/db/schemas/master/teams.schema";
import { users } from "@/db/schemas/auth/users.schema";

import type { LocationPerformanceQuery } from "./zod/location-performance.dto";

interface LocationFilters extends LocationPerformanceQuery {
    fromDate: string;
    toDate: string;
}

const yearToDateRange = (year: string): { fromDate: string; toDate: string } => {
    const match = /^(\d{4})-(\d{2})$/.exec(year);
    if (!match) throw new Error(`Invalid financial year: ${year}`);
    const startYear = Number(match[1]);
    const endYear = 2000 + Number(match[2]);
    return { fromDate: `${startYear}-04-01`, toDate: `${endYear}-03-31` };
};
import type {
    AssignedTenderRow,
    BusinessTenderListItem,
    BusinessTenderRow,
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
            const range = yearToDateRange(query.year!);
            const filters: LocationFilters = {
                ...query,
                fromDate: range.fromDate,
                toDate: range.toDate,
            };

            const [tenderRows, assignedRows, itemRows, tenderListRows] = await Promise.all([
                this.getTenders(filters),
                this.getAssignedTenders(filters),
                filters.heading ? this.getItemsUnderHeading(filters.heading) : Promise.resolve([]),
                this.getTenderList(filters),
            ]);

            const assignedApproved = this.buildAssignedApprovedSummary(assignedRows);
            const bidSummary = this.calculateSummary(tenderRows);
            const summary = { ...assignedApproved, ...bidSummary };
            const metrics = this.getMetrics(tenderRows);
            const tenderList = this.buildTenderList(tenderListRows);

            const margins = tenderListRows.map(row => Number(row.avgGrossMargin)).filter(v => Number.isFinite(v));
            const avgGrossMargin = margins.length > 0 ? margins.reduce((acc, v) => acc + v, 0) / margins.length : null;

            this.logger.info("Location performance computed", {
                tenderRows: tenderRows.length,
                assignedRows: assignedRows.length,
            });

            return { items: itemRows, summary, metrics, tenderList, avgGrossMargin };
        } catch (error: any) {
            this.logger.error("Failed to fetch location performance", {
                message: error?.message,
                stack: error?.stack,
            });
            throw error;
        }
    }

    // ─── Query 1: bid submissions ─────────────────────────────────────

    private async getTenders(filters: LocationFilters): Promise<TenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationConditions: ReturnType<typeof eq>[] = [];
        if (filters.location) locationConditions.push(eq(locations.id, filters.location));
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

    // ─── Query 2: assigned / approved ────────────────────────────────

    private async getAssignedTenders(filters: LocationFilters): Promise<AssignedTenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationConditions: ReturnType<typeof eq>[] = [];
        if (filters.location) locationConditions.push(eq(locations.id, filters.location));
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

    // ─── Query 3: items under heading ─────────────────────────────────

    async getItemsUnderHeading(headingId: number): Promise<ItemRow[]> {
        return this.db.select({ id: items.id, name: items.name }).from(items).where(eq(items.headingId, headingId)) as unknown as ItemRow[];
    }

    // ─── EMD subqueries ──────────────────────────────────────────────

    private emdPaidSubquery() {
        return exists(
            this.db
                .select({ one: sql`1` })
                .from(paymentRequests)
                .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
                .where(
                    and(
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
                    )
                )
        );
    }

    private emdReturnedSubquery() {
        return exists(
            this.db
                .select({ one: sql`1` })
                .from(paymentRequests)
                .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
                .where(
                    and(
                        eq(paymentRequests.tenderId, tenderInfos.id),
                        eq(paymentRequests.purpose, "EMD"),
                        eq(paymentInstruments.isActive, true),
                        or(
                            and(inArray(paymentInstruments.instrumentType, ["Bank Transfer", "Portal Payment", "DD", "FDR"]), inArray(paymentInstruments.action, [3, 4])),
                            and(eq(paymentInstruments.instrumentType, "BG"), eq(paymentInstruments.action, 6))
                        )
                    )
                )
        );
    }

    // ─── Query 4: flat tender list (for category tables) ─────────────

    private async getTenderList(filters: LocationFilters): Promise<BusinessTenderRow[]> {
        const heading = filters.heading!;
        const from = new Date(filters.fromDate);
        const to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);

        const conditions = [eq(tenderInfos.deleteStatus, 0), eq(itemHeadings.id, heading), between(tenderInfos.dueDate, from, to)];
        if (filters.location) conditions.push(eq(locations.id, filters.location));
        if (filters.team) conditions.push(eq(tenderInfos.team, filters.team));

        return (await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                gstValues: tenderInfos.gstValues,
                member: users.name,
                team: teams.name,
                itemName: items.name,
                state: locations.name,
                status: tenderInfos.status,
                tlStatus: tenderInfos.tlStatus,
                bidStatus: bidSubmissions.status,
                hasEmdPaid: this.emdPaidSubquery(),
                hasEmdReturned: this.emdReturnedSubquery(),
                avgGrossMargin: sql<number | null>`
                    (SELECT AVG(${tenderCostingDetails.grossMargin})::float8
                     FROM ${tenderCostingSheets}
                     INNER JOIN ${tenderCostingDetails} ON ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                     WHERE ${tenderCostingSheets.tenderId} = ${tenderInfos.id}
                       AND ${tenderCostingDetails.grossMargin} IS NOT NULL)
                `,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(and(...conditions))
            .groupBy(tenderInfos.id, users.name, teams.name, items.name, locations.name, bidSubmissions.status)
            .orderBy(tenderInfos.dueDate)
            .execute()) as unknown as BusinessTenderRow[];
    }

    private buildTenderList(rows: BusinessTenderRow[]): BusinessTenderListItem[] {
        return rows.map(row => {
            const s = Number(row.status);
            const categories: string[] = ["tenders_assigned"];

            if ((STATUS.MISSED as readonly number[]).includes(s)) categories.push("tenders_missed");
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) categories.push("tenders_disqualified");
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) categories.push("tender_results_awaited");
            else if ((STATUS.LOST as readonly number[]).includes(s)) categories.push("tenders_lost");
            else if ((STATUS.WON as readonly number[]).includes(s)) categories.push("tenders_won");

            if (row.bidStatus === "Bid Submitted") categories.push("tenders_bid");
            else categories.push("tenders_not_bid");

            if (row.tlStatus === 1) categories.push("tenders_approved");

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
                state: row.state ?? "—",
                status: STATUS_LABEL(s),
                bidStatus: row.bidStatus ?? "—",
                avgGrossMargin: row.avgGrossMargin !== null && row.avgGrossMargin !== undefined ? row.avgGrossMargin.toFixed(2) : null,
                category: categories,
            };
        });
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

    private getMetrics(tenders: TenderRow[]): LocationMetrics {
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

    // ─── Utilities ────────────────────────────────────────────────────

    private empty(): SummaryItem {
        return { count: 0, value: 0, tender: [] };
    }

    private add(item: SummaryItem, row: Pick<TenderRow, "tenderName" | "gstValues">): void {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tender.push(row.tenderName);
    }
}
