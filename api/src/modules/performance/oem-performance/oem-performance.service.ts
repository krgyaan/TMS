import { Inject, Injectable } from "@nestjs/common";
import { and, between, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { users } from "@db/schemas/auth/users.schema";
import { OemPerformanceQueryDto } from "./zod/oem-performance.dto";
import { mapTenderOutcome } from "../team-leader-performance/team-leader-performance.service";

@Injectable()
export class OemPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    /* =====================================================
       BASE QUERY
    ===================================================== */

    private async getBaseTenders(dto: OemPerformanceQueryDto) {
        return this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValue: tenderInfos.gstValues,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                rfqTo: tenderInfos.rfqTo,
                oemDenied: tenderInfos.oemNotAllowed,
            })
            .from(tenderInfos)
            .where(
                and(
                    eq(tenderInfos.deleteStatus, 0),
                    between(tenderInfos.createdAt, dto.fromDate, dto.toDate),
                    sql`${dto.oemId} = ANY (string_to_array(${tenderInfos.rfqTo}, ',')::int[])`
                )
            );
    }

    /* =====================================================
       SUMMARY (KPI CARDS)
    ===================================================== */

    async getSummary(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        let won = 0,
            lost = 0,
            submitted = 0,
            notAllowed = 0;

        let valueWon = 0,
            valueLost = 0,
            valueSubmitted = 0;

        for (const t of tenders) {
            const outcome = mapTenderOutcome(Number(t.status));

            if (outcome === "Won") {
                won++;
                valueWon += Number(t.gstValue ?? 0);
            } else if (outcome === "Lost") {
                lost++;
                valueLost += Number(t.gstValue ?? 0);
            } else if (outcome === "Result Awaited") {
                submitted++;
                valueSubmitted += Number(t.gstValue ?? 0);
            }

            if (t.oemDenied?.split(",").map(Number).includes(dto.oemId)) {
                notAllowed++;
            }
        }

        const total = won + lost + submitted + notAllowed;

        return {
            totalTendersWithOem: total,
            tendersWon: won,
            tendersLost: lost,
            tendersSubmitted: submitted,
            tendersNotAllowed: notAllowed,
            totalValueWon: valueWon,
            totalValueLost: valueLost,
            totalValueSubmitted: valueSubmitted,
            winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
        };
    }

    /* =====================================================
       ALL TENDERS (TABLE)
    ===================================================== */

    async getTenderList(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        return tenders.map(t => ({
            id: t.id,
            tenderNo: t.tenderNo,
            tenderName: t.tenderName,
            value: Number(t.gstValue ?? 0),
            dueDate: t.dueDate,
            status: mapTenderOutcome(Number(t.status)),
        }));
    }

    /* =====================================================
       NOT ALLOWED TABLE
    ===================================================== */

    async getNotAllowedTenders(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        return tenders
            .filter(t => t.oemDenied?.includes(String(dto.oemId)))
            .map(t => ({
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                gstValue: Number(t.gstValue ?? 0),
                dueDate: t.dueDate,
                reason: "Not allowed by OEM",
            }));
    }

    /* =====================================================
       RFQs SENT TABLE
    ===================================================== */

    async getRfqsSent(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        return tenders.map(t => ({
            id: t.id,
            tenderNo: t.tenderNo,
            tenderName: t.tenderName,
            gstValue: Number(t.gstValue ?? 0),
            dueDate: t.dueDate,
        }));
    }

    /* =====================================================
       TRENDS
    ===================================================== */

    async getTrends(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        const buckets = new Map<string, { won: number; lost: number }>();

        for (const t of tenders) {
            const label = `${t.dueDate.getFullYear()}-${t.dueDate.getMonth() + 1}`;
            if (!buckets.has(label)) buckets.set(label, { won: 0, lost: 0 });

            const b = buckets.get(label)!;
            const outcome = mapTenderOutcome(Number(t.status));

            if (outcome === "Won") b.won++;
            if (outcome === "Lost") b.lost++;
        }

        return Array.from(buckets.entries()).map(([label, v]) => ({
            label,
            winRate: v.won + v.lost ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
        }));
    }

    /* =====================================================
       SCORING
    ===================================================== */

    async getScoring(dto: OemPerformanceQueryDto) {
        const summary = await this.getSummary(dto);

        const winRateScore = Math.min(100, summary.winRate * 1.2);
        const complianceScore = summary.totalTendersWithOem > 0 ? Math.round(100 - (summary.tendersNotAllowed / summary.totalTendersWithOem) * 100) : 100;

        const total = Math.round(winRateScore * 0.6 + complianceScore * 0.4);

        return {
            winRateScore,
            complianceScore,
            total,
        };
    }
}
