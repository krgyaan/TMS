import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, between } from "drizzle-orm";
import { PerformanceQueryDto } from "./zod/performance-query.dto";
import { StagePerformance } from "./zod/stage-performance.type";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { timer } from "@db/schemas/workflow/timer.schema";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { STAGE_CONFIG } from "../config/stage-config";
import { tenderResults } from "@/db/schemas/tendering/tender-result.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { TenderListQuery } from "./zod/tender.dto";
import { TenderOutcomeStatus } from "./zod/stage-performance.type";
import { fa } from "zod/v4/locales";
import { reverseAuctions, tenderQueries } from "@/db/schemas";

export interface TenderListRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    organizationName: string | null;
    value: number;
    dueDate: Date;
    status: TenderOutcomeStatus;
}

function getExecutiveStages() {
    return STAGE_CONFIG.filter(s => !s.tlStage);
}

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
}

export type TenderKpiBucket = "ALLOCATED" | "APPROVED" | "REJECTED" | "PENDING" | "BID" | "MISSED" | "DISQUALIFIED" | "RESULT_AWAITED" | "LOST" | "WON";

function mapStatusToKpi(statusCode: number): TenderKpiBucket {
    // WON
    if ([25, 26, 27, 28].includes(statusCode)) return "WON";

    // LOST
    if ([18, 21, 22, 24].includes(statusCode)) return "LOST";

    // DISQUALIFIED
    if ([33, 38, 39, 41].includes(statusCode)) return "DISQUALIFIED";

    // MISSED (subset of DNB)
    if ([8, 16, 36].includes(statusCode)) return "MISSED";

    // REJECTED (Other DNB)
    if ([9, 10, 11, 12, 13, 14, 15, 31, 32, 34, 35].includes(statusCode)) return "REJECTED";

    // BID DONE, RESULT NOT YET
    if ([17, 19, 20, 23, 37, 40].includes(statusCode)) return "RESULT_AWAITED";

    // PRE-BID PENDING
    if ([1, 2, 3, 4, 5, 6, 7, 29, 30].includes(statusCode)) return "PENDING";

    // Fallback
    return "ALLOCATED";
}

@Injectable()
export class TenderExecutiveService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    /**
     * STEP 1:
     * - Validate user
     * - Resolve date range
     * - Count tenders
     */
    async getContext(query: PerformanceQueryDto) {
        const { userId, fromDate, toDate } = query;

        // TODO:
        // 1. Fetch user (users table)
        // 2. Count tenders assigned to user in date range

        return {
            user: {
                id: userId,
                name: "TBD",
                team: "TBD",
            },
            dateRange: { from: fromDate, to: toDate },
            tenderCount: 0,
        };
    }

    /**
     * CORE ENGINE
     * Produces normalized stage-level performance
     */
    async getStagePerformance(query: PerformanceQueryDto): Promise<StagePerformance[]> {
        const { userId, fromDate, toDate } = query;

        const activeStages = getExecutiveStages();

        /* =====================================================
       STEP 1: Fetch tenders
    ===================================================== */

        const tenders = await this.db
            .select()
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        if (tenders.length === 0) return [];

        const tenderIds = tenders.map(t => t.id);

        /* =====================================================
       STEP 2: Fetch timers
    ===================================================== */

        const timerNames = activeStages.filter(s => s.type === "timer" && s.timerName).map(s => s.timerName!);

        const timers = await this.db
            .select()
            .from(timer)
            .where(and(eq(timer.userId, userId), inArray(timer.entityId, tenderIds), inArray(timer.timerName, timerNames)));

        const timerMap = new Map<string, (typeof timers)[number]>();
        for (const t of timers) {
            timerMap.set(`${t.entityId}:${t.timerName}`, t);
        }

        /* =====================================================
       STEP 3: Fetch existence-based data (BULK)
    ===================================================== */

        const resultsRows = await this.db.select().from(tenderResults).where(inArray(tenderResults.tenderId, tenderIds));

        const resultMap = new Map<number, (typeof resultsRows)[number]>();
        resultsRows.forEach(r => resultMap.set(Number(r.tenderId), r));

        // TQ
        const tqs = await this.db.select().from(tenderQueries).where(inArray(tenderQueries.tenderId, tenderIds));

        const tqMap = new Map<number, (typeof tqs)[number]>();
        tqs.forEach(tq => tqMap.set(Number(tq.tenderId), tq));

        // RA
        const raResults = await this.db.select().from(reverseAuctions).where(inArray(reverseAuctions.tenderId, tenderIds));

        const raMap = new Map<number, (typeof raResults)[number]>();
        raResults.forEach(ra => raMap.set(Number(ra.tenderId), ra));

        /* =====================================================
       STEP 4: Normalize stage performance
    ===================================================== */

        const output: StagePerformance[] = [];

        for (const tender of tenders) {
            for (const stage of activeStages) {
                const hasTq = tqMap.has(tender.id);
                const hasBid = tender.status >= 17; // adjust if field differs

                const applicable = stage.stageKey === "tq" ? hasTq : stage.stageKey === "result" ? hasBid : stage.isApplicable(tender);

                let completed = false;
                let onTime: boolean | null = null;
                let startTime: Date | null = null;
                let endTime: Date | null = null;

                /* ---------- TIMER-BASED STAGES ---------- */
                if (applicable && stage.type === "timer" && stage.timerName) {
                    const timerRow = timerMap.get(`${tender.id}:${stage.timerName}`);

                    if (timerRow) {
                        startTime = timerRow.startTime;
                        endTime = timerRow.endTime ?? null;

                        completed = timerRow.status === "completed";

                        const deadline = stage.resolveDeadline(tender);
                        if (completed && deadline && endTime) {
                            onTime = endTime <= deadline;
                        }
                    }
                }

                /* ---------- EXISTENCE-BASED STAGES ---------- */
                if (applicable && stage.type === "existence") {
                    if (stage.stageKey === "result") {
                        const result = resultMap.get(tender.id);
                        completed = Boolean(result?.status);
                    }

                    if (stage.stageKey === "ra") {
                        completed = raMap.has(tender.id);
                    }

                    if (stage.stageKey === "tq") {
                        completed = tqMap.has(tender.id);
                    }

                    onTime = null;
                }

                output.push({
                    tenderId: tender.id,
                    stageKey: stage.stageKey,
                    applicable,
                    completed,
                    onTime,
                    startTime,
                    endTime,
                    deadline: stage.resolveDeadline(tender),
                });
            }
        }

        return output;
    }

    /**
     * Aggregated metrics
     * Derived from getStagePerformance()
     */
    async getSummary(query: PerformanceQueryDto) {
        const stagePerformances = await this.getStagePerformance(query);

        // -------------------------------
        // Tender count (unique tenders)
        // -------------------------------
        const tenderSet = new Set<number>();
        for (const stage of stagePerformances) {
            tenderSet.add(stage.tenderId);
        }

        let applicableStages = 0;
        let completedStages = 0;
        let pendingStages = 0;
        let onTimeStages = 0;
        let lateStages = 0;

        // -------------------------------
        // Aggregate stage metrics
        // -------------------------------
        for (const stage of stagePerformances) {
            if (!stage.applicable) {
                continue;
            }

            applicableStages++;

            if (stage.completed) {
                completedStages++;

                if (stage.onTime === true) {
                    onTimeStages++;
                }

                if (stage.onTime === false) {
                    lateStages++;
                }
            } else {
                pendingStages++;
            }
        }

        // -------------------------------
        // Rates (safe division)
        // -------------------------------
        const completionRate = applicableStages > 0 ? Math.round((completedStages / applicableStages) * 100) : 0;

        const onTimeRate = completedStages > 0 ? Math.round((onTimeStages / completedStages) * 100) : 0;

        return {
            tendersHandled: tenderSet.size,

            stagesApplicable: applicableStages,
            stagesCompleted: completedStages,
            stagesPending: pendingStages,

            stagesOnTime: onTimeStages,
            stagesLate: lateStages,

            completionRate,
            onTimeRate,
        };
    }
    /**
     * Outcome & bid health
     */
    async getOutcomes(query: PerformanceQueryDto) {
        const { userId, fromDate, toDate } = query;

        /* =====================================================
       STEP 1: Fetch tenders handled by user
    ===================================================== */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                statusCode: tenderInfos.status, // <-- important
            })
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        const counters = {
            allocated: 0,
            approved: 0,
            rejected: 0,
            pending: 0,

            bid: 0,
            missed: 0,
            disqualified: 0,
            resultAwaited: 0,
            lost: 0,
            won: 0,
        };

        if (tenders.length === 0) return counters;

        /* =====================================================
       STEP 2: Classify each tender by workflow status
    ===================================================== */

        for (const tender of tenders) {
            const code = Number(tender.statusCode);

            counters.allocated++;

            // ---------------- PRE-BID ----------------

            // Approved for bidding (Price Bid Approved and beyond)
            if (code === 7 || code >= 17) {
                counters.approved++;
            }

            // Rejected before bidding (DNB reasons)
            if ([9, 10, 11, 12, 13, 14, 15, 31, 32, 34, 35].includes(code)) {
                counters.rejected++;
            }

            // Pending in preparation
            if ([1, 2, 3, 4, 5, 6, 29, 30].includes(code)) {
                counters.pending++;
            }

            // ---------------- POST-BID ----------------

            // Bid submitted / competed
            if ([17, 19, 20, 23, 37, 40, 18, 21, 22, 24, 25, 26, 27, 28, 33, 38, 39, 41].includes(code)) {
                counters.bid++;
            }

            // Missed
            if ([8, 16, 36].includes(code)) {
                counters.missed++;
            }

            // Disqualified
            if ([33, 38, 39, 41].includes(code)) {
                counters.disqualified++;
            }

            // Result awaited
            if ([17, 19, 20, 23, 37, 40].includes(code)) {
                counters.resultAwaited++;
            }

            // Lost
            if ([18, 21, 22, 24].includes(code)) {
                counters.lost++;
            }

            // Won
            if ([25, 26, 27, 28].includes(code)) {
                counters.won++;
            }
        }

        return counters;
    }

    async getStageMatrix(query: PerformanceQueryDto) {
        const stages = await this.getStagePerformance(query);

        // ----------------------------------------
        // Resolve unique stages (column order)
        // ----------------------------------------
        const stageKeys = Array.from(new Set(stages.map(s => s.stageKey)));

        // ----------------------------------------
        // Initialize counters
        // ----------------------------------------
        const counters = new Map<
            string,
            {
                done: number;
                onTime: number;
                late: number;
                pending: number;
                notApplicable: number;
            }
        >();

        for (const key of stageKeys) {
            counters.set(key, {
                done: 0,
                onTime: 0,
                late: 0,
                pending: 0,
                notApplicable: 0,
            });
        }

        // ----------------------------------------
        // Populate counters
        // ----------------------------------------
        for (const stage of stages) {
            const counter = counters.get(stage.stageKey)!;

            if (!stage.applicable) {
                counter.notApplicable++;
                continue;
            }

            if (!stage.completed) {
                counter.pending++;
                continue;
            }

            // Completed
            counter.done++;

            if (stage.onTime === true) {
                counter.onTime++;
            }

            if (stage.onTime === false) {
                counter.late++;
            }
        }

        // ----------------------------------------
        // Build rows (UI order)
        // ----------------------------------------
        const rows = [
            {
                key: "done",
                label: "Done",
                data: stageKeys.map(k => counters.get(k)!.done),
            },
            {
                key: "onTime",
                label: "On Time",
                data: stageKeys.map(k => counters.get(k)!.onTime),
            },
            {
                key: "late",
                label: "Late",
                data: stageKeys.map(k => counters.get(k)!.late),
            },
            {
                key: "pending",
                label: "Pending",
                data: stageKeys.map(k => counters.get(k)!.pending),
            },
            {
                key: "notApplicable",
                label: "Not Applicable",
                data: stageKeys.map(k => counters.get(k)!.notApplicable),
            },
        ];

        return {
            stages: stageKeys,
            rows,
        };
    }

    async getTenderList(query: TenderListQuery) {
        const { userId, fromDate, toDate, outcome } = query;

        const from = new Date(`${fromDate}T00:00:00.000Z`);
        const to = new Date(`${toDate}T23:59:59.999Z`);

        /* ----------------------------------------
       Step 1: Base tender fetch
    ---------------------------------------- */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                value: tenderInfos.emd, // or final value logic later
                organization: tenderInfos.organization,
            })
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, from, to)));

        if (tenders.length === 0) return [];

        const tenderIds = tenders.map(t => t.id);

        /* ----------------------------------------
       Step 2: Fetch bid submissions
    ---------------------------------------- */

        const bids = await this.db.select().from(bidSubmissions).where(inArray(bidSubmissions.tenderId, tenderIds));

        const bidMap = new Map<number, (typeof bids)[number]>();
        bids.forEach(b => bidMap.set(Number(b.tenderId), b));

        /* ----------------------------------------
       Step 3: Fetch tender results
    ---------------------------------------- */

        const results = await this.db.select().from(tenderResults).where(inArray(tenderResults.tenderId, tenderIds));

        const resultMap = new Map<number, (typeof results)[number]>();
        results.forEach(r => resultMap.set(Number(r.tenderId), r));

        /* ----------------------------------------
       Step 4: Normalize outcome per tender
    ---------------------------------------- */

        const rows = tenders.map(t => {
            const bid = bidMap.get(t.id);
            const result = resultMap.get(t.id);

            let status: TenderListRow["status"] = "Not Bid";

            if (bid?.status === "Tender Missed") {
                status = "Missed";
            } else if (bid?.status === "Bid Submitted") {
                if (result?.status === "Won") status = "Won";
                else if (result?.status === "Lost" || result?.status === "Disqualified") status = "Lost";
                else status = "Result Awaited";
            }

            return {
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                organizationName: null, // join later if needed
                value: Number(t.value ?? 0),
                dueDate: t.dueDate,
                status,
            };
        });

        /* ----------------------------------------
       Step 5: Outcome filter (optional)
    ---------------------------------------- */

        if (!outcome) return rows;

        return rows.filter(r => {
            if (outcome === "resultAwaited") return r.status === "Result Awaited";
            if (outcome === "won") return r.status === "Won";
            if (outcome === "lost") return r.status === "Lost";
            if (outcome === "missed") return r.status === "Missed";
            if (outcome === "notBid") return r.status === "Not Bid";
            return true;
        });
    }

    async getTrends(query: PerformanceQueryDto & { bucket?: "week" | "month" }) {
        const { userId, fromDate, toDate, bucket = "week" } = query;

        // 1️⃣ Fetch all stage performance ONCE
        const stageData = await this.getStagePerformance(query);

        if (stageData.length === 0) return [];

        // 2️⃣ Group stages by tenderId
        const stagesByTender = new Map<number, StagePerformance[]>();
        for (const s of stageData) {
            if (!stagesByTender.has(s.tenderId)) {
                stagesByTender.set(s.tenderId, []);
            }
            stagesByTender.get(s.tenderId)!.push(s);
        }

        // 3️⃣ Fetch tender createdAt for bucketing
        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                createdAt: tenderInfos.createdAt,
            })
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, new Date(fromDate), new Date(toDate))));

        // 4️⃣ Group tenders by time bucket
        const buckets = new Map<
            string,
            {
                applicable: number;
                completed: number;
                onTime: number;
            }
        >();

        for (const tender of tenders) {
            const date = tender.createdAt;
            const label = bucket === "month" ? `${date.getFullYear()}-${date.getMonth() + 1}` : `Week ${getWeekNumber(date)}`;

            if (!buckets.has(label)) {
                buckets.set(label, { applicable: 0, completed: 0, onTime: 0 });
            }

            const bucketStats = buckets.get(label)!;
            const stages = stagesByTender.get(tender.id) ?? [];

            for (const stage of stages) {
                if (!stage.applicable) continue;

                bucketStats.applicable++;

                if (stage.completed) {
                    bucketStats.completed++;
                    if (stage.onTime === true) {
                        bucketStats.onTime++;
                    }
                }
            }
        }

        // 5️⃣ Normalize to chart data
        return Array.from(buckets.entries()).map(([label, stats]) => ({
            label,
            completion: stats.applicable > 0 ? Math.round((stats.completed / stats.applicable) * 100) : 0,
            onTime: stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : 0,
        }));
    }

    async getScoring(query: PerformanceQueryDto) {
        const summary = await this.getSummary(query);
        const outcomes = await this.getOutcomes(query);

        const velocityScore = summary.completionRate; // proxy for now
        const accuracyScore = summary.onTimeRate;

        const outcomeScore = outcomes.resultAwaited > 0 ? Math.round((outcomes.won / outcomes.resultAwaited) * 100) : 0;

        const total = Math.round(velocityScore * 0.4 + accuracyScore * 0.4 + outcomeScore * 0.2);

        return {
            workCompletion: velocityScore,
            onTimeWork: accuracyScore,
            winRate: outcomeScore,
            total,
        };
    }
}
