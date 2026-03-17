import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { rfqs, rfqResponses } from "@/db/schemas/tendering/rfqs.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { teams } from "@/db/schemas";
import { organizations } from "@/db/schemas/master/organizations.schema"; // ⚠️ verify path

import type { OemPerformanceQuery } from "./zod/oem-performance.dto";
import {
    TENDER_REASON_MAP,
    type BidTenderRow,
    type NotAllowedTenderRow,
    type OemPerformanceResponse,
    type OemSummary,
    type RfqSentToOemRow,
    type SummaryItem,
    type TenderRow,
} from "./zod/oem-performance.types";

const STATUS = {
    MISSED: [8, 16],
    DISQUALIFIED: [21, 22],
    RESULTS_AWAITED: [17],
    LOST: [24],
    WON: [25, 26, 27, 28],
} as const;

@Injectable()
export class OemPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    async getOemPerformance(query: OemPerformanceQuery): Promise<OemPerformanceResponse> {
        const { oem, fromDate, toDate } = query;

        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);

        this.logger.info("Fetching OEM performance", { oem, fromDate, toDate });

        try {
            const [tenderRows, bidRows] = await Promise.all([this.fetchTendersWithRfqs(from, to), this.fetchBidTenders(oem, from, to)]);

            const notAllowedTenders = this.buildNotAllowedTenders(tenderRows, oem);
            const rfqsSentToOem = this.buildRfqsSentToOem(tenderRows, oem);
            const summary = this.buildSummary(tenderRows, bidRows, oem);

            this.logger.info("OEM performance computed", { oem });

            return { summary, notAllowedTenders, rfqsSentToOem };
        } catch (error: any) {
            this.logger.error("Failed to fetch OEM performance", {
                message: error?.message,
                stack: error?.stack,
            });
            throw error;
        }
    }

    // ─── Query 1: tenders in date range ──────────────────────────────────────
    // Added: teams + organizations LEFT JOINs to resolve name strings.
    // rfq_responses joined without vendor filter — mirrors old hasOne behaviour.

    private async fetchTendersWithRfqs(from: Date, to: Date): Promise<TenderRow[]> {
        return this.db
            .select({
                id: tenderInfos.id,
                team: tenderInfos.team,
                teamName: teams.name,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                gstValues: tenderInfos.gstValues,
                organizationName: organizations.name,
                rfqTo: tenderInfos.rfqTo,
                oemNotAllowed: tenderInfos.oemNotAllowed,
                tlStatus: tenderInfos.tlStatus,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                rfqId: rfqs.id,
                rfqCreatedAt: rfqs.createdAt,
                rfqResponseReceiptDatetime: rfqResponses.receiptDatetime,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(rfqs, eq(rfqs.tenderId, tenderInfos.id))
            .leftJoin(rfqResponses, eq(rfqResponses.rfqId, rfqs.id))
            .where(and(between(tenderInfos.dueDate, from, to), eq(tenderInfos.deleteStatus, 0))) as unknown as TenderRow[];
    }

    // ─── Query 2: bid submissions for this OEM ────────────────────────────────
    // FIND_IN_SET(oem, rfq_to) → oem::text = ANY(string_to_array(rfq_to, ','))
    // ⚠️  rfqTo is varchar(15) — flag for migration to text.

    private async fetchBidTenders(oem: number, from: Date, to: Date): Promise<BidTenderRow[]> {
        return this.db
            .select({
                tenderId: bidSubmissions.tenderId,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                bidStatus: bidSubmissions.status,
                tenderStatus: tenderInfos.status,
                submissionDatetime: bidSubmissions.submissionDatetime,
            })
            .from(bidSubmissions)
            .innerJoin(tenderInfos, eq(tenderInfos.id, bidSubmissions.tenderId))
            .where(
                and(sql`${oem.toString()} = ANY(string_to_array(${tenderInfos.rfqTo}, ','))`, between(bidSubmissions.submissionDatetime, from, to), eq(tenderInfos.deleteStatus, 0))
            ) as unknown as BidTenderRow[];
    }

    // ─── Builders ─────────────────────────────────────────────────────────────

    private buildNotAllowedTenders(tenders: TenderRow[], oem: number): NotAllowedTenderRow[] {
        return tenders
            .filter(t => this.fieldContainsOem(t.oemNotAllowed, oem))
            .map(t => ({
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                dueDate: format(t.dueDate, "dd-MM-yyyy hh:mm a"),
                gstValues: t.gstValues,
                member: t.teamMemberName ?? "—",
                team: t.teamName ?? "—",
                // ← new: derived from status code, no extra query
                reason: TENDER_REASON_MAP[Number(t.status)] ?? "Not allowed by OEM",
            }));
    }

    private buildRfqsSentToOem(tenders: TenderRow[], oem: number): RfqSentToOemRow[] {
        return tenders
            .filter(t => this.fieldContainsOem(t.rfqTo, oem))
            .map(t => ({
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                dueDate: format(t.dueDate, "dd-MM-yyyy hh:mm a"),
                gstValues: t.gstValues,
                member: t.teamMemberName ?? "—",
                team: t.teamName ?? "—",
                rfqSentOn: t.rfqCreatedAt ? format(t.rfqCreatedAt, "dd-MM-yyyy hh:mm a") : "—",
                // ← changed: null instead of "Not Yet" — frontend decides how to render
                rfqResponseOn: t.rfqResponseReceiptDatetime ? format(t.rfqResponseReceiptDatetime, "dd-MM-yyyy hh:mm a") : null,
            }));
    }

    private buildSummary(tenders: TenderRow[], bidRows: BidTenderRow[], oem: number): OemSummary {
        const assigned = tenders.filter(t => this.fieldContainsOem(t.rfqTo, oem));
        const approved = assigned.filter(t => t.tlStatus === 1);

        const summary: OemSummary = {
            tendersAssigned: this.makeSummaryItem(assigned),
            tendersApproved: this.makeSummaryItem(approved),
            tendersBid: this.emptySummaryItem(),
            tendersMissed: this.emptySummaryItem(),
            tendersDisqualified: this.emptySummaryItem(),
            tenderResultsAwaited: this.emptySummaryItem(),
            tendersWon: this.emptySummaryItem(),
            tendersLost: this.emptySummaryItem(),
        };

        for (const row of bidRows) {
            const s = Number(row.tenderStatus);

            if ((STATUS.MISSED as readonly number[]).includes(s)) this.add(summary.tendersMissed, row);
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) this.add(summary.tendersDisqualified, row);
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) this.add(summary.tenderResultsAwaited, row);
            else if ((STATUS.LOST as readonly number[]).includes(s)) this.add(summary.tendersLost, row);
            else if ((STATUS.WON as readonly number[]).includes(s)) this.add(summary.tendersWon, row);

            if (row.bidStatus === "Bid Submitted") this.add(summary.tendersBid, row);
        }

        return summary;
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private fieldContainsOem(field: string | null, oem: number): boolean {
        if (!field) return false;
        return field
            .split(",")
            .map(v => v.trim())
            .includes(oem.toString());
    }

    private makeSummaryItem(rows: Array<{ tenderName: string; gstValues: string }>): SummaryItem {
        return {
            count: rows.length,
            value: rows.reduce((acc, r) => acc + parseFloat(r.gstValues || "0"), 0),
            tenders: rows.map(r => r.tenderName),
        };
    }

    private emptySummaryItem(): SummaryItem {
        return { count: 0, value: 0, tenders: [] };
    }

    private add(item: SummaryItem, row: Pick<BidTenderRow, "tenderName" | "gstValues">): void {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tenders.push(row.tenderName);
    }

    // ---------------------------------------------------

    async getTendersByOem(filters: { oem?: string; from?: string; to?: string }) {
        const { oem, from, to } = filters;

        const query = this.db.execute(sql`
      SELECT
        bs.id,
        bs.tender_id,
        bs.status as bid_status,
        ti.tender_name,
        ti.gst_values,
        ti.status as tender_status,
        ti.rfq_to
      FROM bid_submissions bs
      JOIN tender_infos ti ON bs.tender_id = ti.id
    `);

        const result: any[] = (await query) as any[];

        let filtered = result;

        if (oem) {
            filtered = filtered.filter(t =>
                t.rfq_to
                    ?.split(",")
                    .map(v => v.trim())
                    .includes(oem)
            );
        }

        if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);

            filtered = filtered.filter(t => new Date(t.bid_submissions_date) >= fromDate && new Date(t.bid_submissions_date) <= toDate);
        }

        return filtered;
    }

    // ---------------------------------------------------

    calculateSummary(tenders: any[]) {
        const summary = {
            tenders_bid: { tender: [], count: 0, value: 0 },
            tenders_missed: { tender: [], count: 0, value: 0 },
            tenders_disqualified: { tender: [], count: 0, value: 0 },
            tender_results_awaited: { tender: [], count: 0, value: 0 },
            tenders_won: { tender: [], count: 0, value: 0 },
            tenders_lost: { tender: [], count: 0, value: 0 },
        };

        for (const tender of tenders) {
            switch (tender.tender_status) {
                case 8:
                case 16:
                    this.add(summary.tenders_missed, tender);
                    break;

                case 21:
                case 22:
                    this.add(summary.tenders_disqualified, tender);
                    break;

                case 17:
                    this.add(summary.tender_results_awaited, tender);
                    break;

                case 24:
                    this.add(summary.tenders_lost, tender);
                    break;

                case 25:
                case 26:
                case 27:
                case 28:
                    this.add(summary.tenders_won, tender);
                    break;
            }

            if (tender.bid_status === "Bid Submitted") {
                this.add(summary.tenders_bid, tender);
            }
        }

        return summary;
    }

    private add(summaryItem: any, tender: any) {
        summaryItem.count++;
        summaryItem.value += Number(tender.gst_values);
        summaryItem.tender.push(tender.tender_name);
    }
}
