import { Injectable, Inject } from "@nestjs/common";
import { and, between, eq, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { format } from "date-fns";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { teams } from "@/db/schemas";

import type { OemPerformanceQuery } from "./zod/oem-performance.dto";
import {
    TENDER_REASON_MAP,
    type BidTenderRow,
    type MissedTenderRow,
    type MonthlyTrendPoint,
    type NotAllowedTenderRow,
    type OemPerformanceResponse,
    type OemSummary,
    type RfqInfoRow,
    type RfqSentToOemRow,
    type SummarizableTender,
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

const DATE_FORMAT = "dd-MM-yyyy hh:mm a";


const containsOem = (column: PgColumn, oem: number) => sql<boolean>`${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(${column}::text, '')), '\\s*,\\s*'))`;

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

        // Business operates in IST — pin the window to +05:30 instead of
        // depending on the server's local timezone.
        const from = new Date(`${fromDate}T00:00:00+05:30`);
        const to = new Date(`${toDate}T23:59:59.999+05:30`);

        this.logger.info("Fetching OEM performance", { oem, fromDate, toDate });

        try {
            const [tenderRows, bidRows, rfqInfoRows] = await Promise.all([
                this.fetchOemTenders(oem, from, to),
                this.fetchBidTenders(oem, from, to),
                this.fetchRfqInfo(oem, from, to),
            ]);

            const rfqInfoByTender = new Map(rfqInfoRows.map(r => [Number(r.tenderId), r]));

            const notAllowedTenders = this.buildNotAllowedTenders(tenderRows);
            const rfqsSentToOem = this.buildRfqsSentToOem(tenderRows, rfqInfoByTender);
            const missedTenders = this.buildMissedTenders(tenderRows, rfqInfoByTender);
            const summary = this.buildSummary(tenderRows, bidRows);
            const monthlyTrend = this.buildMonthlyTrend(bidRows);

            this.logger.info("OEM performance computed", { oem });

            return { summary, notAllowedTenders, rfqsSentToOem, missedTenders, monthlyTrend };
        } catch (error) {
            const e = error as Error;
            this.logger.error("Failed to fetch OEM performance", {
                message: e?.message,
                stack: e?.stack,
            });
            throw error;
        }
    }

   
    private async fetchOemTenders(oem: number, from: Date, to: Date): Promise<TenderRow[]> {
        return this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                gstValues: tenderInfos.gstValues,
                teamName: teams.name,
                teamMemberName: users.name,
                tlStatus: tenderInfos.tlStatus,
                status: tenderInfos.status,
                sentToOem: containsOem(tenderInfos.rfqTo, oem),
                notAllowedForOem: containsOem(tenderInfos.oemNotAllowed, oem),
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .where(
                and(between(tenderInfos.dueDate, from, to), eq(tenderInfos.deleteStatus, 0), or(containsOem(tenderInfos.rfqTo, oem), containsOem(tenderInfos.oemNotAllowed, oem)))
            )
            .orderBy(tenderInfos.dueDate);
    }

    
    private async fetchBidTenders(oem: number, from: Date, to: Date): Promise<BidTenderRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT bs.tender_id           AS "tenderId",
                   t.tender_no            AS "tenderNo",
                   t.tender_name          AS "tenderName",
                   t.gst_values           AS "gstValues",
                   bs.status              AS "bidStatus",
                   t.status               AS "tenderStatus",
                   COALESCE(bs.submission_datetime, bs.created_at) AS "submissionDatetime"
            FROM bid_submissions bs
            INNER JOIN tender_infos t ON t.id = bs.tender_id
            WHERE t.delete_status = 0
              AND COALESCE(bs.submission_datetime, bs.created_at) BETWEEN ${from} AND ${to}
              AND (
                    EXISTS (
                        SELECT 1
                        FROM tender_costing_sheets cs
                        WHERE cs.tender_id = t.id
                          AND cs.oem_vendor_ids @> to_jsonb(${oem}::int)
                    )
                 OR (
                        NOT EXISTS (
                            SELECT 1
                            FROM tender_costing_sheets cs
                            WHERE cs.tender_id = t.id
                              AND cs.oem_vendor_ids IS NOT NULL
                              AND jsonb_array_length(cs.oem_vendor_ids) > 0
                        )
                        AND ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(t.rfq_to::text, '')), '\\s*,\\s*'))
                 )
              )
        `);
        return rows as unknown as BidTenderRow[];
    }

   
    private async fetchRfqInfo(oem: number, from: Date, to: Date): Promise<RfqInfoRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT t.id                     AS "tenderId",
                   MIN(r.created_at)        AS "rfqSentOn",
                   MAX(rr.receipt_datetime) AS "responseOn"
            FROM tender_infos t
            LEFT JOIN rfqs r ON r.tender_id = t.id
            LEFT JOIN rfq_responses rr
                   ON rr.rfq_id = r.id
                  AND (   rr.vendor_id IN (SELECT v.id FROM vendors v WHERE v.org_id = ${oem})
                       OR (COALESCE(rr.vendor_id, 0) = 0 AND ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_organization::text, '')), '\\s*,\\s*'))) )
            WHERE t.due_date BETWEEN ${from} AND ${to}
              AND t.delete_status = 0
              AND (   ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_organization::text, '')), '\\s*,\\s*'))
                   OR EXISTS (
                           SELECT 1
                           FROM vendors v
                           WHERE v.org_id = ${oem}
                             AND v.id::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_vendor::text, '')), '\\s*,\\s*'))
                       )
                  )
            GROUP BY t.id
            HAVING COUNT(r.id) > 0
        `);
        return rows as unknown as RfqInfoRow[];
    }

    // ─── Builders ─────────────────────────────────────────────────────────────

    private buildNotAllowedTenders(tenders: TenderRow[]): NotAllowedTenderRow[] {
        return tenders
            .filter(t => t.notAllowedForOem)
            .map(t => ({
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                dueDate: format(t.dueDate, DATE_FORMAT),
                gstValues: t.gstValues,
                member: t.teamMemberName ?? "—",
                team: t.teamName ?? "—",
                reason: TENDER_REASON_MAP[Number(t.status)] ?? "Not allowed by OEM",
            }));
    }

    private buildRfqsSentToOem(tenders: TenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): RfqSentToOemRow[] {
        return tenders
            .filter(t => t.sentToOem && rfqInfoByTender.has(t.id))
            .map(t => {
                const info = rfqInfoByTender.get(t.id)!;
                return {
                    id: t.id,
                    tenderNo: t.tenderNo,
                    tenderName: t.tenderName,
                    dueDate: format(t.dueDate, DATE_FORMAT),
                    gstValues: t.gstValues,
                    member: t.teamMemberName ?? "—",
                    team: t.teamName ?? "—",
                    rfqSentOn: info.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                    rfqResponseOn: info.responseOn ? format(info.responseOn, DATE_FORMAT) : null,
                    createdAt: info.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                };
            });
    }

    private buildMissedTenders(tenders: TenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): MissedTenderRow[] {
        return tenders
            .filter(t => t.sentToOem && (STATUS.MISSED as readonly number[]).includes(Number(t.status)))
            .map(t => {
                const info = rfqInfoByTender.get(t.id);
                return {
                    id: t.id,
                    tenderNo: t.tenderNo,
                    tenderName: t.tenderName,
                    dueDate: format(t.dueDate, DATE_FORMAT),
                    gstValues: t.gstValues,
                    member: t.teamMemberName ?? "—",
                    team: t.teamName ?? "—",
                    createdAt: info?.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                    status: "Missed",
                };
            });
    }

    private buildSummary(tenders: TenderRow[], bids: BidTenderRow[]): OemSummary {
        const assigned = tenders.filter(t => t.sentToOem);
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

        for (const row of bids) {
            const s = Number(row.tenderStatus);

            if ((STATUS.MISSED as readonly number[]).includes(s)) this.add(summary.tendersMissed, this.toSummaryRow(row));
            else if ((STATUS.DISQUALIFIED as readonly number[]).includes(s)) this.add(summary.tendersDisqualified, this.toSummaryRow(row));
            else if ((STATUS.RESULTS_AWAITED as readonly number[]).includes(s)) this.add(summary.tenderResultsAwaited, this.toSummaryRow(row));
            else if ((STATUS.LOST as readonly number[]).includes(s)) this.add(summary.tendersLost, this.toSummaryRow(row));
            else if ((STATUS.WON as readonly number[]).includes(s)) this.add(summary.tendersWon, this.toSummaryRow(row));

            if (row.bidStatus === "Bid Submitted") this.add(summary.tendersBid, this.toSummaryRow(row));
        }

        return summary;
    }

    // ─── Monthly trend: Won / Missed / Lost counts per calendar month ────────

    private buildMonthlyTrend(bids: BidTenderRow[]): MonthlyTrendPoint[] {
        const byMonth = new Map<string, MonthlyTrendPoint>();

        for (const row of bids) {
            if (!row.submissionDatetime) continue;

            const s = Number(row.tenderStatus);
            const bucket = (STATUS.WON as readonly number[]).includes(s)
                ? "won"
                : (STATUS.MISSED as readonly number[]).includes(s)
                  ? "missed"
                  : (STATUS.LOST as readonly number[]).includes(s)
                    ? "lost"
                    : null;

            if (!bucket) continue;

            const month = format(row.submissionDatetime, "yyyy-MM");
            let point = byMonth.get(month);

            if (!point) {
                point = { month, label: format(row.submissionDatetime, "MMM ''yy"), won: 0, missed: 0, lost: 0, total: 0 };
                byMonth.set(month, point);
            }

            point[bucket] += 1;
            point.total += 1;
        }

        return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private toSummaryRow(row: BidTenderRow): SummarizableTender {
        return { id: row.tenderId, tenderNo: row.tenderNo, tenderName: row.tenderName, gstValues: row.gstValues };
    }

    private makeSummaryItem(rows: SummarizableTender[]): SummaryItem {
        return rows.reduce<SummaryItem>((acc, r) => this.add(acc, r), { count: 0, value: 0, tenders: [] });
    }

    private emptySummaryItem(): SummaryItem {
        return { count: 0, value: 0, tenders: [] };
    }

    private add(item: SummaryItem, row: SummarizableTender): SummaryItem {
        item.count++;
        item.value += parseFloat(row.gstValues || "0");
        item.tenders.push({
            id: row.id,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            value: parseFloat(row.gstValues || "0"),
        });
        return item;
    }
}
