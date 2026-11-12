import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, exists, inArray, or, sql, type SQL } from "drizzle-orm";
import { format } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { StatusCache } from "@/utils/status-cache";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { paymentInstruments, paymentRequests } from "@/db/schemas/tendering/payment-requests.schema";
import { tenderCostingSheets } from "@/db/schemas/tendering/tender-costing-sheets.schema";
import { tenderCostingDetails } from "@/db/schemas/tendering/tender-costing-details.schema";
import { locations } from "@/db/schemas/master/locations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { itemHeadings } from "@/db/schemas/master/item-headings.schema";
import { statuses } from "@/db/schemas/master/statuses.schema";
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

/**
 * Day boundaries in IST, matching the OEM dashboard report so that every
 * tender is scoped by `tender_infos.created_at` within the selected range.
 */
const dateRange = (fromDate: string, toDate: string): { from: Date; to: Date } => ({
    from: new Date(`${fromDate}T00:00:00+05:30`),
    to: new Date(`${toDate}T23:59:59.999+05:30`),
});
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
    CANCELLED: [18],
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
              : (STATUS.CANCELLED as readonly number[]).includes(s)
                ? "Cancelled"
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
            let range: { fromDate: string; toDate: string };
            if (query.fromDate && query.toDate) {
                range = { fromDate: query.fromDate, toDate: query.toDate };
            } else {
                range = yearToDateRange(query.year!);
            }

            const filters: LocationFilters = {
                ...query,
                fromDate: range.fromDate,
                toDate: range.toDate,
            };

            const locationIds = await this.getLocationIdsForFilters(filters);

            const [tenderRows, assignedRows, itemRows, tenderListRows] = await Promise.all([
                this.getTenders(filters, locationIds),
                this.getAssignedTenders(filters, locationIds),
                filters.heading ? this.getItemsUnderHeading(filters.heading) : Promise.resolve([]),
                this.getTenderList(filters, locationIds),
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

    // ─── Location ID resolution from state / region / location ────────────

    private async getLocationIdsForFilters(filters: LocationFilters): Promise<number[] | null> {
        // If only a specific location is given (no state/region), use it directly
        if (filters.location && !filters.state && !filters.region) {
            return [filters.location];
        }

        // If no state/region/location at all, return null (no location filter)
        if (!filters.state && !filters.region && !filters.location) {
            return null;
        }

        // Resolve state/region → location IDs
        const conditions = [eq(locations.status, true)];
        if (filters.state) conditions.push(eq(locations.state, filters.state));
        if (filters.region) conditions.push(eq(locations.region, filters.region));

        const rows = await this.db.select({ id: locations.id }).from(locations).where(and(...conditions));
        return rows.map(r => r.id);
    }

    private buildLocationCondition(locationIds: number[] | null): SQL | undefined {
        if (locationIds === null) return undefined; // no filter
        if (locationIds.length === 0) return sql`false`; // no matching locations → return nothing
        return inArray(tenderInfos.location, locationIds);
    }

    // ─── Query 1: bid submissions ─────────────────────────────────────

    private async getTenders(filters: LocationFilters, locationIds: number[] | null): Promise<TenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationCondition = this.buildLocationCondition(locationIds);
        if (locationCondition) conditions.push(locationCondition);

        if (filters.team) conditions.push(eq(tenderInfos.team, filters.team));
        if (filters.heading) conditions.push(eq(itemHeadings.id, filters.heading));

        if (filters.fromDate && filters.toDate) {
            const { from, to } = dateRange(filters.fromDate, filters.toDate);
            conditions.push(between(tenderInfos.createdAt, from, to));
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
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .where(and(...conditions)) as unknown as TenderRow[];
    }

    // ─── Query 2: assigned / approved ────────────────────────────────

    private async getAssignedTenders(filters: LocationFilters, locationIds: number[] | null): Promise<AssignedTenderRow[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        const locationCondition = this.buildLocationCondition(locationIds);
        if (locationCondition) conditions.push(locationCondition);

        if (filters.team) conditions.push(eq(tenderInfos.team, filters.team));
        if (filters.heading) conditions.push(eq(itemHeadings.id, filters.heading));

        if (filters.fromDate && filters.toDate) {
            const { from, to } = dateRange(filters.fromDate, filters.toDate);
            conditions.push(between(tenderInfos.createdAt, from, to));
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
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(items, eq(items.id, tenderInfos.item))
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

    private async getTenderList(filters: LocationFilters, locationIds: number[] | null): Promise<BusinessTenderRow[]> {
        const { from, to } = dateRange(filters.fromDate, filters.toDate);

        const conditions = [eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, from, to)];
        if (filters.heading) conditions.push(eq(itemHeadings.id, filters.heading));

        const locationCondition = this.buildLocationCondition(locationIds);
        if (locationCondition) conditions.push(locationCondition);

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
                statusName: statuses.name,
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
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(itemHeadings, eq(itemHeadings.id, items.headingId))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(and(...conditions))
            .groupBy(tenderInfos.id, users.name, teams.name, items.name, locations.name, statuses.name, bidSubmissions.status)
            .orderBy(tenderInfos.dueDate)
            .execute()) as unknown as BusinessTenderRow[];
    }

    private buildTenderList(rows: BusinessTenderRow[]): BusinessTenderListItem[] {
        // "Not Bid" mirrors the Tender List's "Did Not Bid" tab: tenders whose
        // status belongs to the `dnb` category in the statuses master table.
        const dnbStatusIds = StatusCache.getIds("dnb");

        return rows.map(row => {
            const s = Number(row.status);
            const categories: string[] = ["tenders_assigned"];

            if ((STATUS.MISSED as readonly number[]).includes(s)) categories.push("tenders_missed");
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) categories.push("tenders_disqualified");
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) categories.push("tender_results_awaited");
            else if ((STATUS.LOST as readonly number[]).includes(s)) categories.push("tenders_lost");
            else if ((STATUS.WON as readonly number[]).includes(s)) categories.push("tenders_won");
            else if ((STATUS.CANCELLED as readonly number[]).includes(s)) categories.push("tenders_cancelled");

            if (row.bidStatus === "Bid Submitted") categories.push("tenders_bid");
            if (dnbStatusIds.includes(s)) categories.push("tenders_not_bid");

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
                status: row.statusName ?? STATUS_LABEL(s),
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
            tenders_cancelled: this.empty(),
        };

        for (const tender of tenders) {
            const s = Number(tender.tenderStatus);

            if ((STATUS.MISSED as readonly number[]).includes(s)) this.add(summary.tenders_missed, tender);
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) this.add(summary.tenders_disqualified, tender);
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) this.add(summary.tender_results_awaited, tender);
            else if ((STATUS.LOST as readonly number[]).includes(s)) this.add(summary.tenders_lost, tender);
            else if ((STATUS.WON as readonly number[]).includes(s)) this.add(summary.tenders_won, tender);
            else if ((STATUS.CANCELLED as readonly number[]).includes(s)) this.add(summary.tenders_cancelled, tender);

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
