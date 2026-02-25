import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, between, lte } from "drizzle-orm";
import { PerformanceQueryDto } from "./zod/performance-query.dto";
import { StagePerformance } from "./zod/stage-performance.type";
import { TenderInfo, tenderInfos } from "@db/schemas/tendering/tenders.schema";
// import { timer } from "@db/schemas/workflow/timer.schema";
import { timerTrackers } from "@db/schemas/workflow/timer.schema";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { STAGE_CONFIG } from "../config/stage-config";
import { tenderResults } from "@/db/schemas/tendering/tender-result.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { TenderListQuery } from "./zod/tender.dto";
import { TenderOutcomeStatus } from "./zod/stage-performance.type";
import { fa } from "zod/v4/locales";
import { paymentInstruments, paymentRequests, reverseAuctions, tenderQueries, users } from "@/db/schemas";
import type { TenderKpiBucket } from "./zod/tender-buckets.type";
import { TenderMeta } from "./zod/tender.types";
import { StageBacklogQueryDto } from "./zod/stage-backlog-query.dto";
import { EmdBalanceQueryDto } from "./zod/emd-balance-query.dto";
import { STAGE_BACKLOG_CONFIG, STAGE_BACKLOG_KPI_RANK } from "../config/stage-backlog.config";

export interface TenderListRow {
    id: number;
    tenderNo: string;
    tenderName: string;
    organizationName?: string | null;
    value: number;
    dueDate: Date;
    status: TenderOutcomeStatus;
}

interface StageDrilldownItem {
    tenderId: number;
    tenderNo?: string;
    tenderName?: string;

    // Common
    stageKey: string;

    // Timing
    deadline?: Date | null;
    completedAt?: Date | null;
    daysOverdue?: number | null;

    // Stage-specific (optional)
    meta?: Record<string, any>;
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

function classifyStage(row?: StagePerformance): StageState {
    if (!row || !row.applicable) {
        return "NOT_APPLICABLE";
    }

    if (row.completed) {
        return "DONE";
    }

    if (row.onTime === false) {
        return "OVERDUE";
    }

    return "PENDING";
}

type EmdFinancialState = "LOCKED" | "RETURNED" | "SETTLED";

function resolveEmdStateFromAction(instrumentType: number, action: number | null): EmdFinancialState {
    switch (instrumentType) {
        // ==========================
        // DEMAND DRAFT (DD)
        // ==========================
        case 1: {
            if (action === 3 || action === 4) return "RETURNED";
            if (action === 5) return "SETTLED";
            return "LOCKED";
        }

        // ==========================
        // FDR
        // ==========================
        case 2: {
            if (action === 3 || action === 4) return "RETURNED";
            if (action === 5) return "SETTLED";
            return "LOCKED";
        }

        // ==========================
        // BANK GUARANTEE (BG)
        // ==========================
        case 4: {
            if (action === 6) return "RETURNED";
            // BG cancellations do NOT refund → treated as settled/closed
            if (action === 7 || action === 8 || action === 9) return "SETTLED";
            return "LOCKED";
        }

        // ==========================
        // BANK TRANSFER (BT)
        // ==========================
        case 5: {
            if (action === 3) return "RETURNED";
            if (action === 4) return "SETTLED";
            return "LOCKED";
        }

        // ==========================
        // PAY ON PORTAL (POP)
        // ==========================
        case 6: {
            if (action === 3) return "RETURNED";
            if (action === 4) return "SETTLED";
            return "LOCKED";
        }

        default:
            return "LOCKED";
    }
}

const TERMINAL_KPI: TenderKpiBucket[] = ["WON", "LOST", "DISQUALIFIED", "MISSED", "REJECTED"];

type StageState = "DONE" | "PENDING" | "OVERDUE" | "NOT_APPLICABLE";

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
            .from(timerTrackers)
            .where(and(eq(timerTrackers.assignedUserId, userId), inArray(timerTrackers.entityId, tenderIds), inArray(timerTrackers.stage, timerNames)));

        const timerMap = new Map<string, (typeof timers)[number]>();
        for (const t of timers) {
            timerMap.set(`${t.entityId}:${t.stage}`, t);
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
                const bucket = mapStatusToKpi(Number(tender.status));

                const hasBid = ["RESULT_AWAITED", "WON", "LOST", "DISQUALIFIED"].includes(bucket);

                const applicable = stage.stageKey === "tq" ? hasTq : stage.stageKey === "result" ? hasBid : stage.isApplicable(tender);

                let completed = false;
                let onTime: boolean | null = null;
                let startTime: Date | null = null;
                let endTime: Date | null = null;

                /* ---------- TIMER-BASED STAGES ---------- */
                if (applicable && stage.type === "timer" && stage.timerName) {
                    const timerRow = timerMap.get(`${tender.id}:${stage.timerName}`);

                    if (timerRow) {
                        startTime = timerRow.startedAt;
                        endTime = timerRow.endedAt ?? null;
                        const deadline = stage.resolveDeadline(tender);
                        const now = new Date();

                        if (timerRow.status === "completed" && endTime) {
                            completed = true;
                            onTime = deadline ? endTime <= deadline : null;
                        } else {
                            completed = false;
                            if (deadline) {
                                // not completed, check SLA
                                onTime = now <= deadline ? null : false;
                                // null = still pending, false = overdue
                            }
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
                    tenderNo: tender.tenderNo ?? null,
                    tenderName: tender.tenderName ?? null,
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

    async getOutcomes(query: PerformanceQueryDto) {
        const { userId, fromDate, toDate } = query;

        const tenders = await this.db
            .select()
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        const counters = {
            allocated: 0,

            // PRE-BID
            pending: 0,
            approved: 0,
            rejected: 0,

            // POST-BID
            bid: 0,
            missed: 0,

            // BID OUTCOMES
            resultAwaited: 0,
            won: 0,
            lost: 0,

            // CROSS-CUTTING
            disqualified: 0,
        };

        const tendersByKpi: Record<TenderKpiBucket, TenderMeta[]> = {
            ALLOCATED: [],
            PENDING: [],
            APPROVED: [],
            REJECTED: [],
            BID: [],
            MISSED: [],
            DISQUALIFIED: [],
            RESULT_AWAITED: [],
            LOST: [],
            WON: [],
        };

        if (tenders.length === 0) return counters;

        for (const t of tenders) {
            const bucket = mapStatusToKpi(Number(t.status));

            const meta: TenderMeta = {
                id: t.id,
                tenderNo: t.tenderNo ?? null,
                tenderName: t.tenderName ?? null,
                organizationName: String(t.organization) ?? null,
                dueDate: t.dueDate,
                value: Number(t.gstValues ?? 0),
                statusBucket: bucket,
            };

            // ----------------------------------
            // ALLOCATED (all tenders)
            // ----------------------------------
            counters.allocated++;
            tendersByKpi.ALLOCATED.push(meta);

            // ----------------------------------
            // PRE-BID PHASE
            // ----------------------------------
            if (bucket === "PENDING" || bucket === "ALLOCATED") {
                counters.pending++;
                tendersByKpi.PENDING.push(meta);
                continue;
            }

            if (bucket === "REJECTED") {
                counters.rejected++;
                tendersByKpi.REJECTED.push(meta);
                continue;
            }

            // If we reach here, tender was APPROVED
            counters.approved++;
            tendersByKpi.APPROVED.push(meta);

            // ----------------------------------
            // POST-BID PHASE (only approved)
            // ----------------------------------

            if (bucket === "MISSED") {
                counters.missed++;
                tendersByKpi.MISSED.push(meta);
                continue;
            }

            // If we reach here, bid was submitted
            counters.bid++;
            tendersByKpi.BID.push(meta);

            // ----------------------------------
            // BID OUTCOMES
            // ----------------------------------
            if (bucket === "RESULT_AWAITED") {
                counters.resultAwaited++;
                tendersByKpi.RESULT_AWAITED.push(meta);
                continue;
            }

            if (bucket === "WON") {
                counters.won++;
                tendersByKpi.WON.push(meta);
                continue;
            }

            if (bucket === "LOST") {
                counters.lost++;
                tendersByKpi.LOST.push(meta);
                continue;
            }

            if (bucket === "DISQUALIFIED") {
                counters.disqualified++;
                tendersByKpi.DISQUALIFIED.push(meta);
                continue;
            }
        }

        return { ...counters, tendersByKpi };
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
                overdue: number;
                notApplicable: number;
                drilldown: {
                    done: any[];
                    onTime: any[];
                    late: any[];
                    pending: any[];
                    overdue: any[];
                    notApplicable: any[];
                };
            }
        >();

        for (const key of stageKeys) {
            counters.set(key, {
                done: 0,
                onTime: 0,
                late: 0,
                pending: 0,
                overdue: 0,
                notApplicable: 0,
                drilldown: {
                    done: [],
                    onTime: [],
                    late: [],
                    pending: [],
                    overdue: [],
                    notApplicable: [],
                },
            });
        }

        // ----------------------------------------
        // Populate counters
        // ----------------------------------------
        for (const stage of stages) {
            const counter = counters.get(stage.stageKey)!;

            const tenderMeta: StageDrilldownItem = {
                tenderId: stage.tenderId,
                stageKey: stage.stageKey,
                tenderNo: stage.tenderNo,
                tenderName: stage.tenderName,
                deadline: stage.deadline ?? null,
                completedAt: stage.endTime ?? null,
                daysOverdue:
                    !stage.completed && stage.onTime === false && stage.deadline
                        ? Math.max(0, Math.ceil((Date.now() - new Date(stage.deadline).getTime()) / (1000 * 60 * 60 * 24)))
                        : null,
                meta: {},
            };

            switch (stage.stageKey) {
                case "emd":
                    tenderMeta.meta = {
                        emdStatus: stage.completed ? "Paid" : "Pending",
                    };
                    break;

                case "ra":
                    tenderMeta.meta = {
                        raApplicable: stage.applicable,
                        raCompleted: stage.completed,
                    };
                    break;

                case "tq":
                    tenderMeta.meta = {
                        tqRaised: stage.applicable,
                        tqCompleted: stage.completed,
                    };
                    break;

                case "result":
                    tenderMeta.meta = {
                        resultStatus: stage.completed ? "Declared" : "Awaited",
                    };
                    break;

                default:
                    tenderMeta.meta = {};
            }

            if (!stage.applicable) {
                counter.notApplicable++;
                counter.drilldown.notApplicable.push(tenderMeta);
                continue;
            }

            if (!stage.completed) {
                if (stage.onTime === false) {
                    counter.overdue++;
                    counter.drilldown.overdue.push(tenderMeta);
                } else {
                    counter.pending++;
                    counter.drilldown.pending.push(tenderMeta);
                }
                continue;
            }

            // Completed
            counter.done++;
            counter.drilldown.done.push(tenderMeta);

            if (stage.onTime === true) {
                counter.onTime++;
                counter.drilldown.onTime.push(tenderMeta);
            }

            if (stage.onTime === false) {
                counter.late++;
                counter.drilldown.late.push(tenderMeta);
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
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.done),
            },
            {
                key: "onTime",
                label: "On Time",
                data: stageKeys.map(k => counters.get(k)!.onTime),
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.onTime),
            },
            {
                key: "late",
                label: "Late",
                data: stageKeys.map(k => counters.get(k)!.late),
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.late),
            },
            {
                key: "pending",
                label: "Pending",
                data: stageKeys.map(k => counters.get(k)!.pending),
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.pending),
            },
            {
                key: "overdue",
                label: "Overdue",
                data: stageKeys.map(k => counters.get(k)!.overdue),
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.overdue),
            },
            {
                key: "notApplicable",
                label: "Not Applicable",
                data: stageKeys.map(k => counters.get(k)!.notApplicable),
                drilldown: stageKeys.map(k => counters.get(k)!.drilldown.notApplicable),
            },
        ];

        return {
            stages: stageKeys,
            rows,
        };
    }

    async getTenderList(query: TenderListQuery) {
        const { userId, fromDate, toDate, kpi } = query;

        const from = new Date(`${fromDate}T00:00:00.000Z`);
        const to = new Date(`${toDate}T23:59:59.999Z`);

        /* ----------------------------------------
       Step 1: Fetch tenders
    ---------------------------------------- */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                value: tenderInfos.emd,
                organization: tenderInfos.organization,
                statusCode: tenderInfos.status,
            })
            .from(tenderInfos)
            .where(and(eq(tenderInfos.teamMember, userId), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, from, to)));

        if (tenders.length === 0) return [];

        /* ----------------------------------------
       Step 2: Normalize + filter by KPI bucket
    ---------------------------------------- */

        return tenders
            .map(t => {
                const bucket = mapStatusToKpi(Number(t.statusCode));

                return {
                    id: t.id,
                    tenderNo: t.tenderNo,
                    tenderName: t.tenderName,
                    organizationName: t.organization ?? null,
                    value: Number(t.value ?? 0),
                    dueDate: t.dueDate,
                    statusBucket: bucket,
                };
            })
            .filter(row => {
                if (!kpi) return true;
                return row.statusBucket === kpi;
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

    //LOGIC FOR STAGE BACKLOG (STAGE-WISE OPEN TENDERS)
    // =======================================================
    // STAGE BACKLOG (STATUS-DRIVEN, CUMULATIVE)
    // =======================================================

    async getStageBacklog(query: StageBacklogQueryDto) {
        const from = new Date(`${query.fromDate}T00:00:00.000Z`);
        const to = new Date(`${query.toDate}T23:59:59.999Z`);

        // --------------------------------------------------
        // 1️⃣ Fetch tender universe (till `to`)
        // --------------------------------------------------
        const conditions = [eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, new Date("2000-01-01"), to)];

        if (query.view === "user" && query.userId) {
            conditions.push(eq(tenderInfos.teamMember, query.userId));
        }

        if (query.view === "team" && query.teamId) {
            conditions.push(eq(tenderInfos.team, query.teamId));
        }

        const tenders = await this.db
            .select()
            .from(tenderInfos)
            .where(and(...conditions));

        if (!tenders.length) return [];

        // --------------------------------------------------
        // 2️⃣ Stage Matrix (CURRENT truth)
        // --------------------------------------------------
        const stageMatrix =
            query.view === "user" && query.userId
                ? await this.getStagePerformance({
                      userId: query.userId,
                      fromDate: from,
                      toDate: to,
                  })
                : query.view === "team" && query.teamId
                  ? await this.getStagePerformanceForTeamAggregated(query.teamId, from, to)
                  : [];

        const stageMatrixMap = new Map<string, StagePerformance>();
        for (const row of stageMatrix) {
            stageMatrixMap.set(`${row.tenderId}:${row.stageKey}`, row);
        }

        // --------------------------------------------------
        // 3️⃣ Aggregate per stage
        // --------------------------------------------------
        return STAGE_BACKLOG_CONFIG.map(stage => {
            const metrics = {
                opening: { count: 0, value: 0, drilldown: [] as any[] },
                current: { count: 0, value: 0, drilldown: [] as any[] },
                completed: { count: 0, value: 0, drilldown: [] as any[] },
                pending: { count: 0, value: 0, drilldown: [] as any[] },
                overdue: { count: 0, value: 0, drilldown: [] as any[] },
            };

            for (const tender of tenders) {
                const bucket = mapStatusToKpi(Number(tender.status));

                // 🔴 TERMINAL TENDERS ARE NEVER PART OF BACKLOG
                if (TERMINAL_KPI.includes(bucket)) {
                    continue;
                }

                const matrixRow = stageMatrixMap.get(`${tender.id}:${stage.stageKey}`);
                const startedInStageMatrix = Boolean(matrixRow);

                const isOldTender = tender.createdAt < from || !startedInStageMatrix;

                const value = Number(tender.gstValues ?? 0);

                const meta = {
                    tenderId: tender.id,
                    tenderNo: tender.tenderNo ?? null,
                    tenderName: tender.tenderName ?? null,
                    value,
                    status: bucket, // ✅ normalized KPI status
                    deadline: matrixRow?.deadline ?? null,
                    daysOverdue:
                        matrixRow && !matrixRow.completed && matrixRow.onTime === false && matrixRow.deadline
                            ? Math.max(0, Math.ceil((to.getTime() - new Date(matrixRow.deadline).getTime()) / (1000 * 60 * 60 * 24)))
                            : null,
                };

                // ===============================
                // OPENING — OLD TENDERS ONLY
                // ===============================
                if (isOldTender) {
                    const completedByStatus = STAGE_BACKLOG_KPI_RANK[bucket] >= STAGE_BACKLOG_KPI_RANK[stage.autoCompleteAfter];

                    if (!completedByStatus) {
                        metrics.opening.count++;
                        metrics.opening.value += value;
                        metrics.opening.drilldown.push(meta);
                    }
                    continue;
                }

                // ===============================
                // CURRENT TENDERS — STAGE MATRIX TRUTH
                // ===============================
                if (!isOldTender) {
                    const state = classifyStage(matrixRow);

                    if (state === "NOT_APPLICABLE") {
                        continue;
                    }

                    // CURRENT = applicable stages only
                    metrics.current.count++;
                    metrics.current.value += value;
                    metrics.current.drilldown.push(meta);

                    if (state === "DONE") {
                        metrics.completed.count++;
                        metrics.completed.value += value;
                        metrics.completed.drilldown.push(meta);
                    }

                    if (state === "PENDING") {
                        metrics.pending.count++;
                        metrics.pending.value += value;
                        metrics.pending.drilldown.push(meta);
                    }

                    if (state === "OVERDUE") {
                        metrics.pending.count++;
                        metrics.pending.value += value;
                        metrics.pending.drilldown.push(meta);

                        metrics.overdue.count++;
                        metrics.overdue.value += value;
                        metrics.overdue.drilldown.push(meta);
                    }
                }
            }

            return {
                stageKey: stage.stageKey,
                label: stage.label,
                metrics,
            };
        });
    }

    private async evaluateStagePerformance(tenders: TenderInfo[], mode: "user" | "team", userId?: number): Promise<StagePerformance[]> {
        const activeStages = getExecutiveStages();
        const tenderIds = tenders.map(t => t.id);

        // -----------------------------
        // Timers (USER + TEAM MODE)
        // -----------------------------
        let timerMap = new Map<string, any>();

        const timerNames = activeStages.filter(s => s.type === "timer" && s.timerName).map(s => s.timerName!);

        const timerConditions = [inArray(timerTrackers.entityId, tenderIds), inArray(timerTrackers.stage, timerNames)];

        // User view → only that user's timers
        if (mode === "user" && userId) {
            timerConditions.push(eq(timerTrackers.assignedUserId, userId));
        }

        // Team view → ALL timers (no user filter)

        const timers = await this.db
            .select()
            .from(timerTrackers)
            .where(and(...timerConditions));

        timers.forEach(t => {
            timerMap.set(`${t.entityId}:${t.stage}`, t);
        });

        // -----------------------------
        // Existence data (shared)
        // -----------------------------
        const [resultsRows, tqs, raResults] = await Promise.all([
            this.db.select().from(tenderResults).where(inArray(tenderResults.tenderId, tenderIds)),
            this.db.select().from(tenderQueries).where(inArray(tenderQueries.tenderId, tenderIds)),
            this.db.select().from(reverseAuctions).where(inArray(reverseAuctions.tenderId, tenderIds)),
        ]);

        const resultMap = new Map(resultsRows.map(r => [Number(r.tenderId), r]));
        const tqMap = new Map(tqs.map(tq => [Number(tq.tenderId), tq]));
        const raMap = new Map(raResults.map(ra => [Number(ra.tenderId), ra]));

        // -----------------------------
        // Normalize stages
        // -----------------------------
        const output: StagePerformance[] = [];

        for (const tender of tenders) {
            for (const stage of activeStages) {
                const bucket = mapStatusToKpi(Number(tender.status));

                const hasBid = ["RESULT_AWAITED", "WON", "LOST", "DISQUALIFIED"].includes(bucket);
                const applicable = stage.stageKey === "tq" ? tqMap.has(tender.id) : stage.stageKey === "result" ? hasBid : stage.isApplicable(tender);

                let completed = false;
                let onTime: boolean | null = null;
                let startTime: Date | null = null;
                let endTime: Date | null = null;

                // TIMER STAGES → only user mode
                if (applicable && mode === "user" && stage.type === "timer" && stage.timerName) {
                    const timer = timerMap.get(`${tender.id}:${stage.timerName}`);
                    if (timer) {
                        startTime = timer.startedAt;
                        endTime = timer.endedAt ?? null;

                        if (timer.status === "completed") {
                            completed = true;
                            const deadline = stage.resolveDeadline(tender);
                            onTime = deadline ? endTime! <= deadline : null;
                        } else {
                            const deadline = stage.resolveDeadline(tender);
                            onTime = deadline && new Date() > deadline ? false : null;
                        }
                    }
                }

                // EXISTENCE STAGES → both modes
                if (applicable && stage.type === "existence") {
                    if (stage.stageKey === "result") {
                        completed = Boolean(resultMap.get(tender.id)?.status);
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
                    tenderNo: tender.tenderNo ?? null,
                    tenderName: tender.tenderName ?? null,
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

    async getStagePerformanceForTeamAggregated(teamId: number, fromDate: Date, toDate: Date): Promise<StagePerformance[]> {
        // --------------------------------------------------
        // 1️⃣ Fetch users in the team
        // --------------------------------------------------
        const teamUsers = await this.db.select({ id: users.id }).from(users).where(eq(users.team, teamId));

        if (!teamUsers.length) return [];

        // --------------------------------------------------
        // 2️⃣ Aggregate stage performance per user
        // --------------------------------------------------
        const aggregated: StagePerformance[] = [];

        for (const user of teamUsers) {
            const userStages = await this.getStagePerformance({
                userId: user.id,
                fromDate,
                toDate,
            });

            aggregated.push(...userStages);
        }

        return aggregated;
    }

    // =======================================================
    // EMD BALANCE SHEET VIEW
    // =======================================================
    async getEmdBalance(query: EmdBalanceQueryDto) {
        const from = new Date(`${query.fromDate}T00:00:00.000Z`);
        const to = new Date(`${query.toDate}T23:59:59.999Z`);

        // 1️⃣ Fetch all relevant EMD instruments (past + present)
        const emds = await this.fetchEmdUniverse(query, to);
        if (!emds.length) {
            return this.emptyEmdBalance();
        }

        // 2️⃣ Aggregate into balance-sheet style buckets
        return this.aggregateEmdBalance(emds, from, to);
    }

    private async fetchEmdUniverse(query: EmdBalanceQueryDto, to: Date) {
        const conditions = [eq(paymentRequests.purpose, "EMD"), lte(paymentRequests.createdAt, to)];

        if (query.view === "user" && query.userId) {
            conditions.push(eq(paymentRequests.requestedBy, query.userId));
        }

        if (query.view !== "user" && query.teamId) {
            conditions.push(eq(tenderInfos.team, query.teamId));
        }

        return this.db
            .select({
                requestId: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                amount: paymentRequests.amountRequired,
                createdAt: paymentRequests.createdAt,

                instrumentType: paymentInstruments.instrumentType,
                status: paymentInstruments.status,
                statusUpdatedAt: paymentInstruments.updatedAt,

                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
            })
            .from(paymentRequests)
            .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .where(and(...conditions));
    }

    private emptyEmdBalance() {
        const bucket = () => ({ count: 0, value: 0, drilldown: [] });

        return {
            opening: bucket(),
            requested: bucket(),
            returned: bucket(),
            settled: bucket(),
            closing: bucket(),
            overdue: bucket(),
        };
    }

    private aggregateEmdBalance(rows: any[], from: Date, to: Date) {
        const result = this.emptyEmdBalance();

        for (const r of rows) {
            const stateAtTo = resolveEmdStateFromAction(r.instrumentType, r.action);

            const meta = {
                tenderId: r.tenderId,
                tenderNo: r.tenderNo,
                tenderName: r.tenderName,
                instrumentType: r.instrumentType,
                amount: Number(r.amount),
                status: r.status,
                requestedAt: r.createdAt,
                lastUpdatedAt: r.statusUpdatedAt,
                daysLocked: stateAtTo === "LOCKED" ? Math.ceil((to.getTime() - r.createdAt.getTime()) / 86400000) : null,
            };

            // 🔹 Requested during period
            if (r.createdAt >= from && r.createdAt <= to) {
                this.add(result.requested, meta);
            }

            // 🔹 Returned during period
            if (stateAtTo === "RETURNED" && r.statusUpdatedAt && r.statusUpdatedAt >= from && r.statusUpdatedAt <= to) {
                this.add(result.returned, meta);
            }

            // 🔹 Settled during period
            if (stateAtTo === "SETTLED" && r.statusUpdatedAt && r.statusUpdatedAt >= from && r.statusUpdatedAt <= to) {
                this.add(result.settled, meta);
            }

            // 🔹 Closing balance (still locked)
            if (stateAtTo === "LOCKED") {
                this.add(result.closing, meta);

                if (r.dueDate && r.dueDate < to) {
                    this.add(result.overdue, meta);
                }
            }
        }

        return result;
    }

    private add(bucket, meta) {
        bucket.count += 1;
        bucket.value += meta.amount;
        bucket.drilldown.push(meta);
    }
}
