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
    type LifecycleTenderRow,
    type MonthlyTrendPoint,
    type NotAllowedTenderRow,
    type OemPerformanceResponse,
    type OemSummary,
    type RfqInfoRow,
    type RfqSentRawRow,
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

const containsOemInJsonArray = (column: PgColumn, oem: number) => sql<boolean>`${column}::text LIKE ${'%"' + oem + '"%'}`;

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

        const from = new Date(`${fromDate}T00:00:00+05:30`);
        const to = new Date(`${toDate}T23:59:59.999+05:30`);

        this.logger.info("Fetching OEM performance", { oem, fromDate, toDate });

        try {
            const [
                tenderRows,
                bidRows,
                rfqInfoRows,
                quotationTenders,
                rfqSentRows,
                missedBidRows,
                resultRows,
                resultsAwaitedNoResultRows,
            ] = await Promise.all([
                this.fetchOemTenders(oem, from, to),
                this.fetchBidTenders(oem, from, to),
                this.fetchRfqInfo(oem, from, to),
                this.fetchQuotationReceivedTenders(oem, from, to),
                this.fetchRfqsSentToOem(oem, from, to),
                this.fetchMissedTenders(oem, from, to),
                this.fetchResultBasedTenders(oem, from, to),
                this.fetchResultsAwaitedNoResultTenders(oem, from, to),
            ]);

            const rfqInfoByTender = new Map(rfqInfoRows.map(r => [Number(r.tenderId), r]));

            const summary = this.buildSummary(tenderRows, bidRows);
            const monthlyTrend = this.buildMonthlyTrend(bidRows);

            const notAllowedTenders = this.buildNotAllowedTenders(tenderRows);
            const rfqsSentToOem = this.buildRfqsSentToOem(rfqSentRows);
            const quotationReceivedTenders = this.buildQuotationReceivedTenders(quotationTenders, rfqInfoByTender);
            const bidTenders = this.buildBidTenders(bidRows, rfqInfoByTender);

            const missedTenders = this.buildMissedTenders(missedBidRows, rfqInfoByTender);
            const wonTenders = this.buildResultBasedTenders(resultRows, rfqInfoByTender, ["Won"], "Won");
            const lostTenders = this.buildResultBasedTenders(resultRows, rfqInfoByTender, ["Lost"], "Lost");
            const cancelledTenders = this.buildResultBasedTenders(resultRows, rfqInfoByTender, ["Cancelled"], "Cancelled");
            const disqualifiedTenders = this.buildResultBasedTenders(
                resultRows,
                rfqInfoByTender,
                ["Disqualified", "TQ replied, Disqualified"],
                "Disqualified"
            );
            const resultsAwaitedTenders = [
                ...this.buildResultBasedTenders(
                    resultRows,
                    rfqInfoByTender,
                    ["Under Evaluation", "RA scheduled", "TQ Received", "TQ replied", "TQ replied, Qualified"],
                    "Results Awaited"
                ),
                ...this.buildResultsAwaitedNoResult(resultsAwaitedNoResultRows, rfqInfoByTender),
            ];

            this.logger.info("OEM performance computed", { oem });

            return {
                summary,
                notAllowedTenders,
                rfqsSentToOem,
                missedTenders,
                wonTenders,
                lostTenders,
                cancelledTenders,
                disqualifiedTenders,
                resultsAwaitedTenders,
                bidTenders,
                quotationReceivedTenders,
                monthlyTrend,
            };
        } catch (error) {
            const e = error as Error;
            this.logger.error("Failed to fetch OEM performance", {
                message: e?.message,
                stack: e?.stack,
            });
            throw error;
        }
    }

    private async fetchResultBasedTenders(oem: number, from: Date, to: Date): Promise<any[]> {
        const { rows } = await this.db.execute(sql`
            SELECT 
                tr.tender_id           AS "tenderId",
                t.tender_no            AS "tenderNo",
                t.tender_name          AS "tenderName",
                t.due_date             AS "dueDate",
                t.gst_values           AS "gstValues",
                tr.status              AS "resultStatus",
                u.name                 AS "teamMemberName",
                tm.name                AS "teamName",
                tr.created_at          AS "trCreatedAt",
                COALESCE(tr.result_uploaded_at, tr.updated_at) AS "resultDate"
            FROM tender_results tr
            INNER JOIN tender_infos t ON t.id = tr.tender_id
            INNER JOIN bid_submissions bs ON bs.tender_id = t.id
            INNER JOIN tender_costing_sheets cs ON cs.tender_id = t.id
            INNER JOIN tender_costing_details cd ON cd.tender_costing_sheets_id = cs.id
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            WHERE t.delete_status = 0
            AND bs.status = 'Bid Submitted'
            AND cd.status = 'Approved'
            AND cs.oem_vendor_ids @> to_jsonb(${oem}::int)
            AND t.created_at BETWEEN ${from} AND ${to}
        `);
        return rows;
    }

    // ─── Fetchers ─────────────────────────────────────────────────────────────

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
                notAllowedForOem: containsOemInJsonArray(tenderInfos.oemNotAllowed, oem),
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(teams, eq(teams.id, tenderInfos.team))
            .where(
                and(
                    between(tenderInfos.createdAt, from, to),
                    eq(tenderInfos.deleteStatus, 0),
                    or(containsOem(tenderInfos.rfqTo, oem), containsOemInJsonArray(tenderInfos.oemNotAllowed, oem))
                )
            )
            .orderBy(tenderInfos.dueDate);
    }

    private async fetchQuotationReceivedTenders(oem: number, from: Date, to: Date): Promise<TenderRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT DISTINCT t.id            AS "id",
                t.tender_no              AS "tenderNo",
                t.tender_name            AS "tenderName",
                t.due_date               AS "dueDate",
                t.gst_values             AS "gstValues",
                t.tl_status              AS "tlStatus",
                t.status                 AS "status",
                u.name                   AS "teamMemberName",
                tm.name                  AS "teamName",
                MAX(rr.receipt_datetime) AS "responseOn",
                ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(t.rfq_to::text, '')), '\\s*,\\s*')) AS "sentToOem",
                ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(t.oem_not_allowed::text, '')), '\\s*,\\s*')) AS "notAllowedForOem"
            FROM tender_infos t
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            INNER JOIN rfqs r ON r.tender_id = t.id
            INNER JOIN rfq_responses rr
                ON rr.rfq_id = r.id
                AND rr.organization_id = ${oem}
            WHERE t.created_at BETWEEN ${from} AND ${to}
            AND t.delete_status = 0
            GROUP BY t.id, t.tender_no, t.tender_name, t.due_date, t.gst_values, t.tl_status, t.status, u.name, tm.name
        `);
        return rows as unknown as TenderRow[];
    }

    private async fetchResultsAwaitedNoResultTenders(oem: number, from: Date, to: Date): Promise<BidTenderRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT bs.tender_id           AS "tenderId",
                t.tender_no            AS "tenderNo",
                t.tender_name          AS "tenderName",
                t.gst_values           AS "gstValues",
                bs.status              AS "bidStatus",
                t.status               AS "tenderStatus",
                bs.submission_datetime AS "submissionDatetime",
                t.due_date             AS "dueDate",
                u.name                 AS "teamMemberName",
                tm.name                AS "teamName"
            FROM bid_submissions bs
            INNER JOIN tender_infos t ON t.id = bs.tender_id
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            INNER JOIN tender_costing_sheets cs ON cs.tender_id = t.id
                AND cs.oem_vendor_ids @> to_jsonb(${oem}::int)
            INNER JOIN tender_costing_details cd ON cd.tender_costing_sheets_id = cs.id
                AND cd.status = 'Approved'
            LEFT JOIN tender_results tr ON tr.tender_id = t.id
            WHERE t.delete_status = 0
            AND bs.status = 'Bid Submitted'
            AND tr.id IS NULL
            AND t.created_at BETWEEN ${from} AND ${to}
        `);
        return rows as unknown as BidTenderRow[];
    }

    private async fetchBidTenders(oem: number, from: Date, to: Date): Promise<BidTenderRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT bs.tender_id           AS "tenderId",
                t.tender_no            AS "tenderNo",
                t.tender_name          AS "tenderName",
                t.gst_values           AS "gstValues",
                bs.status              AS "bidStatus",
                t.status               AS "tenderStatus",
                bs.submission_datetime AS "submissionDatetime",
                t.due_date             AS "dueDate",
                u.name                 AS "teamMemberName",
                tm.name                AS "teamName",
                bo.bidded_by           AS "biddedBy"
            FROM bid_submissions bs
            INNER JOIN tender_infos t ON t.id = bs.tender_id
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            LEFT JOIN LATERAL (
                SELECT string_agg(DISTINCT vo.name, ', ') AS bidded_by
                FROM tender_costing_sheets cs2
                INNER JOIN tender_costing_details cd2
                    ON cd2.tender_costing_sheets_id = cs2.id
                AND cd2.status = 'Approved'
                CROSS JOIN LATERAL (
                    SELECT CASE
                        WHEN cs2.oem_vendor_ids IS NOT NULL AND jsonb_array_length(cs2.oem_vendor_ids) > 0
                        THEN cs2.oem_vendor_ids
                        ELSE (
                            SELECT jsonb_agg(x)
                            FROM rfqs r2,
                                unnest(regexp_split_to_array(btrim(coalesce(r2.requested_organization::text, '')), '\\s*,\\s*')) AS x
                            WHERE r2.tender_id = cs2.tender_id
                            AND x <> ''
                        )
                    END AS ids_json
                ) resolved
                CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(resolved.ids_json, '[]'::jsonb)) AS oem_id(val)
                INNER JOIN vendor_organizations vo ON vo.id = oem_id.val::int
                WHERE cs2.tender_id = t.id
            ) bo ON true
            WHERE t.delete_status = 0
            AND bs.status IN ('Bid Submitted', 'Submission Pending')
            AND bs.submission_datetime IS NOT NULL
            AND t.created_at BETWEEN ${from} AND ${to}
            AND ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(t.rfq_to::text, '')), '\\s*,\\s*'))
        `);
        return rows as unknown as BidTenderRow[];
    }

    private async fetchMissedTenders(oem: number, from: Date, to: Date): Promise<BidTenderRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT bs.tender_id           AS "tenderId",
                t.tender_no            AS "tenderNo",
                t.tender_name          AS "tenderName",
                t.gst_values           AS "gstValues",
                bs.status              AS "bidStatus",
                t.status               AS "tenderStatus",
                bs.submission_datetime AS "submissionDatetime",
                t.due_date             AS "dueDate",
                u.name                 AS "teamMemberName",
                tm.name                AS "teamName"
            FROM bid_submissions bs
            INNER JOIN tender_infos t ON t.id = bs.tender_id
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            INNER JOIN tender_costing_sheets cs ON cs.tender_id = t.id
                AND cs.oem_vendor_ids @> to_jsonb(${oem}::int)
            INNER JOIN tender_costing_details cd ON cd.tender_costing_sheets_id = cs.id
                AND cd.status = 'Approved'
            WHERE t.delete_status = 0
            AND bs.status = 'Tender Missed'
            AND t.created_at BETWEEN ${from} AND ${to}
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
                  AND (
                        rr.vendor_id IN (SELECT v.id FROM vendors v WHERE v.org_id = ${oem})
                        OR (
                            COALESCE(rr.vendor_id, 0) = 0
                            AND ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_organization::text, '')), '\\s*,\\s*'))
                        )
                      )
            WHERE t.created_at BETWEEN ${from} AND ${to}
              AND t.delete_status = 0
              AND (
                    ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_organization::text, '')), '\\s*,\\s*'))
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

    private async fetchRfqsSentToOem(oem: number, from: Date, to: Date): Promise<RfqSentRawRow[]> {
        const { rows } = await this.db.execute(sql`
            SELECT t.id                       AS "id",
                   t.tender_no                AS "tenderNo",
                   t.tender_name              AS "tenderName",
                   t.due_date                 AS "dueDate",
                   t.gst_values               AS "gstValues",
                   u.name                     AS "member",
                   tm.name                    AS "team",
                   MIN(r.created_at)          AS "rfqSentOn",
                   MAX(rr.receipt_datetime)   AS "rfqResponseOn",
                   MIN(r.created_at)          AS "createdAt"
            FROM rfqs r
            INNER JOIN tender_infos t
                   ON t.id = r.tender_id
                  AND t.delete_status = 0
            LEFT JOIN users u ON u.id = t.team_member
            LEFT JOIN teams tm ON tm.id = t.team
            LEFT JOIN rfq_responses rr
                   ON rr.rfq_id = r.id
                  AND rr.organization_id = ${oem}
            WHERE t.created_at BETWEEN ${from} AND ${to}
              AND (
                    ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(r.requested_organization::text, '')), '\\s*,\\s*'))
                    OR ${oem}::text = ANY(regexp_split_to_array(btrim(coalesce(t.rfq_to::text, '')), '\\s*,\\s*'))
                  )
            GROUP BY t.id, t.tender_no, t.tender_name, t.due_date, t.gst_values, u.name, tm.name
            ORDER BY t.due_date
        `);
        return rows as unknown as RfqSentRawRow[];
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

    private buildRfqsSentToOem(rows: RfqSentRawRow[]): RfqSentToOemRow[] {
        return rows.map(r => ({
            id: r.id,
            tenderNo: r.tenderNo,
            tenderName: r.tenderName,
            dueDate: r.dueDate ? format(r.dueDate, DATE_FORMAT) : "—",
            gstValues: r.gstValues,
            member: r.member ?? "—",
            team: r.team ?? "—",
            rfqSentOn: r.rfqSentOn ? format(r.rfqSentOn, DATE_FORMAT) : "—",
            rfqResponseOn: r.rfqResponseOn ? format(r.rfqResponseOn, DATE_FORMAT) : null,
            createdAt: r.createdAt ? format(r.createdAt, DATE_FORMAT) : "—",
        }));
    }

    private buildLifecycleTenders(tenders: TenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>, statuses: readonly number[], statusLabel: string): LifecycleTenderRow[] {
        return tenders
            .filter(t => t.sentToOem && statuses.includes(Number(t.status)))
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
                    status: statusLabel,
                };
            });
    }

    private buildQuotationReceivedTenders(quotationTenders: TenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): LifecycleTenderRow[] {
        return quotationTenders.map(t => {
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
                rfqResponseOn: t.responseOn ? format(t.responseOn, DATE_FORMAT) : null,
                status: "Quotation Received",
            };
        });
    }

    private buildBidTenders(bids: BidTenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): LifecycleTenderRow[] {
        return bids
            .filter(b => b.bidStatus === "Bid Submitted" || b.bidStatus === "Submission Pending")
            .map(b => {
                const info = rfqInfoByTender.get(b.tenderId);
                return {
                    id: b.tenderId,
                    tenderNo: b.tenderNo,
                    tenderName: b.tenderName,
                    dueDate: format(b.dueDate, DATE_FORMAT),
                    gstValues: b.gstValues,
                    member: b.teamMemberName ?? "—",
                    team: b.teamName ?? "—",
                    createdAt: info?.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                    submissionTime: b.submissionDatetime ? format(b.submissionDatetime, DATE_FORMAT) : "—",
                    biddedBy: b.biddedBy ?? "—",
                    status: b.bidStatus,
                };
            });
    }
    private buildMissedTenders(rows: BidTenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): LifecycleTenderRow[] {
        return rows.map(r => {
            const info = rfqInfoByTender.get(r.tenderId);
            return {
                id: r.tenderId,
                tenderNo: r.tenderNo,
                tenderName: r.tenderName,
                dueDate: format(r.dueDate, DATE_FORMAT),
                gstValues: r.gstValues,
                member: r.teamMemberName ?? "—",
                team: r.teamName ?? "—",
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

    private buildResultBasedTenders(rows: any[], rfqInfoByTender: Map<number, RfqInfoRow>, targetStatuses: string[], label: string): LifecycleTenderRow[] {
        const normalizedTargets = targetStatuses.map(s => s.trim().toLowerCase());
        return rows
            .filter(r => normalizedTargets.includes(String(r.resultStatus ?? "").trim().toLowerCase()))
            .map(r => {
                const info = rfqInfoByTender.get(r.tenderId);
                return {
                    id: r.tenderId,
                    tenderNo: r.tenderNo,
                    tenderName: r.tenderName,
                    dueDate: format(r.dueDate, DATE_FORMAT),
                    gstValues: r.gstValues,
                    member: r.teamMemberName ?? "—",
                    team: r.teamName ?? "—",
                    createdAt: info?.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                    resultDate: r.resultDate ? format(r.resultDate, DATE_FORMAT) : "—",
                    status: label,
                };
            });
    }

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
                point = {
                    month,
                    label: format(row.submissionDatetime, "MMM ''yy"),
                    won: 0,
                    missed: 0,
                    lost: 0,
                    total: 0,
                };
                byMonth.set(month, point);
            }

            point[bucket] += 1;
            point.total += 1;
        }

        return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    }

    private buildResultsAwaitedNoResult(rows: BidTenderRow[], rfqInfoByTender: Map<number, RfqInfoRow>): LifecycleTenderRow[] {
        return rows.map(r => {
            const info = rfqInfoByTender.get(r.tenderId);
            return {
                id: r.tenderId,
                tenderNo: r.tenderNo,
                tenderName: r.tenderName,
                dueDate: format(r.dueDate, DATE_FORMAT),
                gstValues: r.gstValues,
                member: r.teamMemberName ?? "—",
                team: r.teamName ?? "—",
                createdAt: info?.rfqSentOn ? format(info.rfqSentOn, DATE_FORMAT) : "—",
                resultDate: "—",
                status: "Results Awaited",
            };
        });
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private toSummaryRow(row: BidTenderRow): SummarizableTender {
        return {
            id: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            gstValues: row.gstValues,
        };
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