import { Inject, Injectable } from "@nestjs/common";
import { and, between, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { users } from "@db/schemas/auth/users.schema";
import { OemPerformanceQueryDto } from "./zod/oem-performance.dto";
import { mapTenderOutcome } from "../team-leader-performance/team-leader-performance.service";
import type { TenderOutcomeStatus } from "../types/tender.type";

type OemTenderView = {
    id: number;
    tenderNo: string;
    tenderName: string;
    value: number;
    dueDate: Date;
    status: TenderOutcomeStatus;
};

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
    async getOemOutcomes(dto: OemPerformanceQueryDto) {
        const tenders = await this.getBaseTenders(dto);

        const tendersWon: OemTenderView[] = [];
        const tendersLost: OemTenderView[] = [];
        const tendersSubmitted: OemTenderView[] = [];
        const tendersNotAllowed: OemTenderView[] = [];
        const rfqsSent: OemTenderView[] = [];

        let valueWon = 0,
            valueLost = 0,
            valueSubmitted = 0;

        const trendBuckets = new Map<string, { won: number; lost: number }>();

        for (const t of tenders) {
            const outcome = mapTenderOutcome(Number(t.status));
            const isNotAllowed = t.oemDenied?.split(",").map(Number).includes(dto.oemId);

            const mapped = {
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                value: Number(t.gstValue ?? 0),
                dueDate: t.dueDate,
                status: outcome,
            };

            // KPI buckets
            if (outcome === "Won") {
                tendersWon.push(mapped);
                valueWon += mapped.value;
            } else if (outcome === "Lost") {
                tendersLost.push(mapped);
                valueLost += mapped.value;
            } else if (outcome === "Result Awaited") {
                tendersSubmitted.push(mapped);
                valueSubmitted += mapped.value;
            }

            if (isNotAllowed) {
                tendersNotAllowed.push(mapped);
            }

            rfqsSent.push(mapped);

            // Trends
            const label = `${t.dueDate.getFullYear()}-${t.dueDate.getMonth() + 1}`;
            if (!trendBuckets.has(label)) trendBuckets.set(label, { won: 0, lost: 0 });
            const bucket = trendBuckets.get(label)!;
            if (outcome === "Won") bucket.won++;
            if (outcome === "Lost") bucket.lost++;
        }

        const totalTendersWithOem = tendersWon.length + tendersLost.length + tendersSubmitted.length + tendersNotAllowed.length;

        const winRate = tendersWon.length + tendersLost.length ? Math.round((tendersWon.length / (tendersWon.length + tendersLost.length)) * 100) : 0;

        const trends = Array.from(trendBuckets.entries()).map(([label, v]) => ({
            label,
            winRate: v.won + v.lost ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
        }));

        const complianceScore = totalTendersWithOem > 0 ? Math.round(100 - (tendersNotAllowed.length / totalTendersWithOem) * 100) : 100;

        const winRateScore = Math.min(100, winRate * 1.2);
        const totalScore = Math.round(winRateScore * 0.6 + complianceScore * 0.4);

        return {
            summary: {
                totalTendersWithOem,
                tendersWon: tendersWon.length,
                tendersLost: tendersLost.length,
                tendersSubmitted: tendersSubmitted.length,
                tendersNotAllowed: tendersNotAllowed.length,
                totalValueWon: valueWon,
                totalValueLost: valueLost,
                totalValueSubmitted: valueSubmitted,
                winRate,
            },
            trends,
            scoring: {
                winRateScore,
                complianceScore,
                total: totalScore,
            },
            tendersByKpi: {
                total: tenders,
                tendersWon,
                tendersLost,
                tendersSubmitted,
                tendersNotAllowed,
                rfqsSent,
            },
        };
    }
}
