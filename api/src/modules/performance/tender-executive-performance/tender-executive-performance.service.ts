import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, between, lte, desc, sql, gte } from "drizzle-orm";
import { PerformanceQueryDto } from "./zod/performance-query.dto";
import { StagePerformance } from "./zod/stage-performance.type";
import { TenderInfo, tenderInfos } from "@db/schemas/tendering/tenders.schema";
// import { timer } from "@db/schemas/workflow/timer.schema";
import { timerTrackers } from "@db/schemas/workflow/timer.schema";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { STAGE_CONFIG } from "../config/stage-config";
import { tenderResultDetails } from "@/db/schemas/tendering/tender-result-details.schema";
import { tenderResults } from "@/db/schemas/tendering/tender-result.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { TenderListQuery } from "./zod/tender.dto";
import { TenderOutcomeStatus } from "./zod/stage-performance.type";
import { fa } from "zod/v4/locales";
import { paymentInstruments, paymentRequests, reverseAuctions, tenderCostingSheets, tenderInformation, tenderQueries, users } from "@/db/schemas";
import type { TenderKpiBucket } from "./zod/tender-buckets.type";
import { TenderMeta } from "./zod/tender.types";
import { StageBacklogQueryDto } from "./zod/stage-backlog-query.dto";
import { EmdBalanceQueryDto } from "./zod/emd-balance-query.dto";
import { STAGE_BACKLOG_CONFIG, STAGE_BACKLOG_KPI_RANK } from "../config/stage-backlog.config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

function isWon(status: number) {
    return [25, 26, 27, 28].includes(status);
}

function isLost(status: number) {
    return [18, 21, 22, 24].includes(status);
}

function isDisqualified(status: number) {
    return [33, 38, 39, 41].includes(status);
}

function resolvePeriod(type: "MONTH" | "QUARTER" | "FY", year: number, month?: number, quarter?: number): Period {
    if (type === "MONTH") {
        const from = new Date(Date.UTC(year, month! - 1, 1));
        const to = new Date(Date.UTC(year, month!, 0, 23, 59, 59));
        return { from, to, label: `${from.toLocaleString("en", { month: "short" })} ${year}` };
    }

    if (type === "QUARTER") {
        const qStartMonth = (quarter! - 1) * 3;
        const from = new Date(Date.UTC(year, qStartMonth, 1));
        const to = new Date(Date.UTC(year, qStartMonth + 3, 0, 23, 59, 59));
        return { from, to, label: `Q${quarter} ${year}` };
    }

    // FY (Apr–Mar)
    const from = new Date(Date.UTC(year, 3, 1));
    const to = new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59));
    return { from, to, label: `FY ${year}-${year + 1}` };
}

type Period = {
    from: Date;
    to: Date;
    label: string;
};

type Bucket = {
    count: number;
    value: number;
    drilldown: any[];
};

const emptyBucket = (): Bucket => ({
    count: 0,
    value: 0,
    drilldown: [],
});

const EMD_OVERDUE_GRACE_DAYS = 14;

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

    value?: number;
    status?: string | null;
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

function resolveEmdFinancialState(instrumentType: string, action: number | null): EmdFinancialState {
    switch (instrumentType) {
        case "Portal Payment":
        case "Bank Transfer":
            if (action === 3) return "RETURNED";
            if (action === 4) return "SETTLED";
            return "LOCKED";

        case "DD":
        case "FDR":
            if ([3, 4, 5].includes(action ?? -1)) return "RETURNED";
            if ([6, 7].includes(action ?? -1)) return "SETTLED";
            return "LOCKED";

        case "BG":
            if (action === 6) return "RETURNED";
            if ([8, 9].includes(action ?? -1)) return "SETTLED";
            return "LOCKED";

        default:
            return "LOCKED";
    }
}
const TERMINAL_KPI: TenderKpiBucket[] = ["WON", "LOST", "DISQUALIFIED", "MISSED", "REJECTED"];

type StageState = "DONE" | "PENDING" | "OVERDUE" | "NOT_APPLICABLE";

type DrilldownDateMode = "assigned" | "infoFilled" | "approved" | "bidSubmitted" | "resultEval" | "resultUploaded" | "tenderUpdated";

@Injectable()
export class TenderExecutiveService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

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
            .where(and(eq(timerTrackers.createdByUserId, userId), inArray(timerTrackers.entityId, tenderIds), inArray(timerTrackers.stage, timerNames)));

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

        const stageTenderIds = Array.from(new Set(stages.map(s => s.tenderId)));
        const tenderDetails = new Map<number, { value: number; status: string | null }>();

        if (stageTenderIds.length) {
            const detailRows = (await this.db.execute(sql.raw(`
                SELECT
                    ti.id,
                    ti.gst_values AS "value",
                    s.name AS "status"
                FROM tender_infos ti
                LEFT JOIN statuses s ON s.id = ti.status
                WHERE ti.id IN (${stageTenderIds.join(",")})
            `))).rows as any[];

            for (const row of detailRows) {
                tenderDetails.set(Number(row.id), { value: Number(row.value ?? 0), status: row.status ?? null });
            }
        }

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
                value: tenderDetails.get(stage.tenderId)?.value ?? 0,
                status: tenderDetails.get(stage.tenderId)?.status ?? null,
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
                    const applicable = stage.isApplicable?.(tender) ?? true;

                    const completedByStatus = STAGE_BACKLOG_KPI_RANK[bucket] >= STAGE_BACKLOG_KPI_RANK[stage.autoCompleteAfter];

                    if (applicable && !completedByStatus) {
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
            timerConditions.push(eq(timerTrackers.createdByUserId, userId));
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

    private mapDrilldown(rows: any[], dateMode: DrilldownDateMode = "assigned") {
        const pick: Record<DrilldownDateMode, (t: any) => unknown> = {
            assigned: t => t.created_at,
            infoFilled: t => t.info_filled_at,
            approved: t => t.tl_approval_timestamp ?? t.info_filled_at,
            bidSubmitted: t => t.bid_submitted_at,
            resultEval: t => t.result_created_at ?? t.bid_submitted_at,
            resultUploaded: t => t.result_resolved_at,
            tenderUpdated: t => t.updated_at,
        };

        return rows.map(t => ({
            tenderId: t.id,
            tenderNo: t.tender_no ?? t.tenderNo,
            tenderName: t.tender_name ?? t.tenderName,
            value: Number(t.effective_value ?? t.gst_values ?? 0),
            status: t.status_name ?? null,
            date: (pick[dateMode](t) as string | undefined) ?? null,
        }));
    }

    async getStageBacklogV2(query: { view: "user" | "team" | "all"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
        const from = `${query.fromDate}T00:00:00.000Z`;
        const to = `${query.toDate}T23:59:59.999Z`;

        const baseWhere = () => {
            let w = `ti.delete_status = 0`;
            if (query.view === "user" && query.userId) {
                w += ` AND ti.team_member = ${query.userId}`;
            }
            if (query.view === "team" && query.teamId) {
                w += ` AND ti.team = ${query.teamId}`;
            }
            return w;
        };

        const exec = async (sqlText: string) => (await this.db.execute(sql.raw(sqlText))).rows as any[];

        /**
         * 🔥 BASE SELECT WITH VALUE SWITCH
         * Switch to final_price only AFTER Bid Submitted
         */
        const baseSelect = `
        SELECT
            ti.*,
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM bid_submissions bs
                    WHERE bs.tender_id = ti.id
                      AND bs.status = 'Bid Submitted'
                )
                THEN COALESCE(tcd.final_price, ti.gst_values)
                ELSE ti.gst_values
            END AS effective_value,
            (
                SELECT MIN(tin.created_at)
                FROM tender_information tin
                WHERE tin.tender_id = ti.id
            ) AS info_filled_at,
            (
                SELECT MIN(bs.submission_datetime)
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
            ) AS bid_submitted_at,
            (
                SELECT MIN(tr.created_at)
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
            ) AS result_created_at,
            (
                SELECT COALESCE(MAX(tr.result_uploaded_at), MAX(tr.updated_at))
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
            ) AS result_resolved_at,
            sst.name AS status_name
        FROM tender_infos ti
        LEFT JOIN LATERAL (
            SELECT tcd.final_price
            FROM tender_costing_sheets tcs
            INNER JOIN tender_costing_details tcd
                ON tcd.tender_costing_sheets_id = tcs.id
            WHERE tcs.tender_id = ti.id
              AND tcd.status = 'Approved'
            ORDER BY tcd.approved_at DESC NULLS LAST, tcd.id DESC
            LIMIT 1
        ) tcd ON true
        LEFT JOIN statuses sst ON sst.id = ti.status
    `;

        const dnb = [8, 9, 10, 11, 12, 13, 14, 15, 16, 31, 32, 34, 35, 36];
        const disqualified = [33, 39, 41];
        const excludedStatuses = [...dnb, ...disqualified];
        const resolvedResultStatuses =
            "'won','lost','disqualified','cancelled','lost - h1 elimination'";
        const receivedResultStatuses = "'won','lost','cancelled','lost - h1 elimination'";
        /* =====================================================
       ASSIGNED
    ===================================================== */
        /**
         * Pending at Start
         * Point-in-time: assigned before ${from} with no info sheet as of ${from}.
         * Carry-over whose sheet landed during the period still counts as pending
         * at the start. Legacy rows with no info sheet at all and a progressed
         * status are excluded.
         */
        const assignedOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
        AND ti.created_at < '${from}'
        AND NOT EXISTS (
            SELECT 1
            FROM tender_information tin
            WHERE tin.tender_id = ti.id
            AND tin.created_at < '${from}'
        )
        AND (
            EXISTS (
                SELECT 1
                FROM tender_information tin
                WHERE tin.tender_id = ti.id
            )
            OR ti.status = 1
        )
        `);
        /**
         * Allocated During Period
         * All tenders assigned during selected period
         */
        const assignedDuringTotal = await exec(`
            ${baseSelect}
            WHERE ${baseWhere()}
            AND ti.created_at BETWEEN '${from}' AND '${to}'
            `);

        /**
         * Info Filled During
         * Info sheet saved during the period (any assignment date) — this is the
         * shared source for both the Assignment and Approval "Info Filled" columns.
         * Also counts tenders assigned during the period that progressed past
         * Read Tender with no info sheet recorded, since reaching a later status
         * implies the information was captured.
         */
        const assignedDuringCompleted = await exec(`
            ${baseSelect}
            WHERE ${baseWhere()}
            AND (
                EXISTS (
                    SELECT 1
                    FROM tender_information tin
                    WHERE tin.tender_id = ti.id
                    AND tin.created_at BETWEEN '${from}' AND '${to}'
                )
                OR (
                    ti.created_at BETWEEN '${from}' AND '${to}'
                    AND NOT EXISTS (
                        SELECT 1
                        FROM tender_information tin
                        WHERE tin.tender_id = ti.id
                    )
                    AND ti.status <> 1
                )
            )
            `);

        /**
         * Pending at End
         * Point-in-time: assigned on or before end of period with no info sheet
         * by end. Includes carry-over backlog from pending-at-start and tenders
         * that progressed after the period. Legacy rows with no info sheet at
         * all and a progressed status are excluded.
         */
        const assignedClosingPending = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
        AND ti.created_at <= '${to}'
        AND NOT EXISTS (
            SELECT 1
            FROM tender_information tin
            WHERE tin.tender_id = ti.id
            AND tin.created_at <= '${to}'
        )
        AND (
            EXISTS (
                SELECT 1
                FROM tender_information tin
                WHERE tin.tender_id = ti.id
            )
            OR ti.status = 1
        )
        `);

        /**
         * Closing Total (pending backlog)
         */
        const assignedTotal = assignedClosingPending;
        /* =====================================================
       APPROVED
    ===================================================== */

        /**
         * Pending at Start
         * Info sheet filled before the period and still awaiting approval
         * (tl_status 0 = pending, 3 = incomplete bounce — neither decided).
         * Point-in-time: a tender decided after ${from} was pending at ${from}.
         */
        const approvedOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND EXISTS (
              SELECT 1
              FROM tender_information tin
              WHERE tin.tender_id = ti.id
                AND tin.created_at < '${from}'
          )
          AND (
              ti.tl_status IN (0,3)
              OR (
                  ti.tl_status IN (1,2)
                  AND ti.tl_approval_timestamp >= '${from}'
              )
          )
    `);

        const approvedDuringAccepted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
        AND ti.tl_approval_timestamp BETWEEN '${from}' AND '${to}'
        AND EXISTS (
            SELECT 1
            FROM tender_information tin
            WHERE tin.tender_id = ti.id
        )
        AND ti.tl_status = 1
        `);

        const approvedDuringRejected = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
        AND ti.tl_approval_timestamp BETWEEN '${from}' AND '${to}'
        AND EXISTS (
            SELECT 1
            FROM tender_information tin
            WHERE tin.tender_id = ti.id
        )
        AND ti.tl_status = 2
        `);

        const approvedTotal = await exec(`
        ${baseSelect}
        JOIN tender_information tin ON tin.tender_id = ti.id
        WHERE ${baseWhere()}
          AND tin.created_at <= '${to}'
          AND (
              ti.tl_status IN (0,3)
              OR (
                  ti.tl_status IN (1,2)
                  AND ti.tl_approval_timestamp > '${to}'
              )
          )
    `);

        /* =====================================================
       BID
    ===================================================== */

        const bidOpening = await exec(`
        ${baseSelect}
        JOIN statuses st ON st.id = ti.status
        WHERE ${baseWhere()}
          AND ti.tl_status = 1
          AND ti.tl_approval_timestamp < '${from}'
          AND st.tender_category <> 'dnb'
          AND NOT EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
          )
    `);

        const bidDuringTotal = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.tl_approval_timestamp BETWEEN '${from}' AND '${to}'
          AND EXISTS (
                SELECT 1
                FROM tender_information tin
                WHERE tin.tender_id = ti.id
          )
          AND ti.tl_status = 1
    `);

        const bidDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.tl_status = 1
          AND EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND bs.status = 'Bid Submitted'
                  AND bs.submission_datetime BETWEEN '${from}' AND '${to}'
          )
    `);

        const dnbDuringCompleted = await exec(`
        ${baseSelect}
        JOIN statuses st ON st.id = ti.status
        WHERE ${baseWhere()}
          AND ti.tl_status IN (1, 2)
          AND NOT EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND bs.status = 'Bid Submitted'
                  AND bs.submission_datetime <= '${to}'
          )
          AND (
                st.tender_category = 'dnb'
             OR EXISTS (
                    SELECT 1
                    FROM bid_submissions bs
                    WHERE bs.tender_id = ti.id
                      AND bs.status = 'Tender Missed'
                )
          )
          AND ti.updated_at >= '${from}'
          AND ti.updated_at <= '${to}'
    `);

        const bidTotal = await exec(`
        ${baseSelect}
        JOIN statuses st ON st.id = ti.status
        WHERE ${baseWhere()}
          AND ti.tl_status = 1
          AND ti.tl_approval_timestamp >= '${from}'
          AND ti.tl_approval_timestamp <= '${to}'
          AND st.tender_category <> 'dnb'
          AND NOT EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND (
                        (bs.status = 'Bid Submitted' AND bs.submission_datetime <= '${to}')
                     OR (bs.status = 'Tender Missed'    AND bs.created_at <= '${to}')
                  )
          )
    `);

        /* =====================================================
       RESULT AWAITED
    ===================================================== */

        const resultAwaitedOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND bs.status = 'Bid Submitted'
                  AND bs.submission_datetime < '${from}'
          )
          AND NOT EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND (
                        LOWER(TRIM(tr.status)) IN (${resolvedResultStatuses})
                     OR (LOWER(TRIM(tr.status)) = 'under evaluation'
                         AND tr.created_at >= '${from}')
                  )
          )
    `);

        const resultAwaitedDuringTotal = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND bs.status = 'Bid Submitted'
                  AND bs.submission_datetime BETWEEN '${from}' AND '${to}'
          )
    `);

        const wonDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND LOWER(TRIM(tr.status)) = 'won'
                  AND COALESCE(tr.result_uploaded_at, tr.updated_at) BETWEEN '${from}' AND '${to}'
          )
    `);

        const lostDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND LOWER(TRIM(tr.status)) IN ('lost', 'lost - h1 elimination')
                  AND COALESCE(tr.result_uploaded_at, tr.updated_at) BETWEEN '${from}' AND '${to}'
          )
    `);

        const resultAwaitedDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND (
                        (LOWER(TRIM(tr.status)) IN (${receivedResultStatuses})
                          AND COALESCE(tr.result_uploaded_at, tr.updated_at) BETWEEN '${from}' AND '${to}')
                     OR (LOWER(TRIM(tr.status)) = 'disqualified'
                          AND tr.created_at BETWEEN '${from}' AND '${to}')
                  )
          )
    `);

        const disqualifiedDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND LOWER(TRIM(tr.status)) = 'disqualified'
                  AND tr.created_at BETWEEN '${from}' AND '${to}'
          )
    `);

        const resultAwaitedClosing = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM bid_submissions bs
                WHERE bs.tender_id = ti.id
                  AND bs.status = 'Bid Submitted'
                  AND bs.submission_datetime <= '${to}'
          )
          AND NOT EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND (
                        LOWER(TRIM(tr.status)) IN (${resolvedResultStatuses})
                     OR (LOWER(TRIM(tr.status)) = 'under evaluation'
                         AND tr.created_at >= '${to}')
                  )
          )
    `);

        const wonOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND LOWER(TRIM(tr.status)) = 'won'
                  AND COALESCE(tr.result_uploaded_at, tr.updated_at) < '${from}'
          )
    `);

        const lostOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status NOT IN (${excludedStatuses})
          AND EXISTS (
                SELECT 1
                FROM tender_results tr
                WHERE tr.tender_id = ti.id
                  AND LOWER(TRIM(tr.status)) IN ('lost', 'lost - h1 elimination')
                  AND COALESCE(tr.result_uploaded_at, tr.updated_at) < '${from}'
          )
    `);

        const cancelledOpening = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status = 18
          AND ti.updated_at < '${from}'
    `);

        const cancelledDuringCompleted = await exec(`
        ${baseSelect}
        WHERE ${baseWhere()}
          AND ti.status = 18
          AND ti.updated_at BETWEEN '${from}' AND '${to}'
    `);

        /* =====================================================
        FINAL RESPONSE
    ===================================================== */

        const wonTotalSet = new Map();
        [...wonOpening, ...wonDuringCompleted].forEach(t => {
            wonTotalSet.set(t.id, t);
        });
        const wonTotal = Array.from(wonTotalSet.values());

        const lostTotalSet = new Map();
        [...lostOpening, ...lostDuringCompleted].forEach(t => {
            lostTotalSet.set(t.id, t);
        });
        const lostTotal = Array.from(lostTotalSet.values());

        const cancelledTotalSet = new Map();
        [...cancelledOpening, ...cancelledDuringCompleted].forEach(t => {
            cancelledTotalSet.set(t.id, t);
        });
        const cancelledTotal = Array.from(cancelledTotalSet.values());

        return {
            from: new Date(from),
            to: new Date(to),
            stages: {
                assigned: {
                    opening: {
                        count: assignedOpening.length,
                        value: this.sumValue(assignedOpening),
                        drilldown: this.mapDrilldown(assignedOpening),
                    },

                    total: {
                        count: assignedTotal.length,
                        value: this.sumValue(assignedTotal),
                        drilldown: this.mapDrilldown(assignedTotal),
                    },

                    during: {
                        total: {
                            count: assignedDuringTotal.length,
                            value: this.sumValue(assignedDuringTotal),
                            drilldown: this.mapDrilldown(assignedDuringTotal),
                        },

                        completed: {
                            count: assignedDuringCompleted.length,
                            value: this.sumValue(assignedDuringCompleted),
                            drilldown: this.mapDrilldown(assignedDuringCompleted, "infoFilled"),
                        },

                        // statusChanged is intentionally no longer reported for this
                        // stage: it duplicated the assignment cohort and was never rendered.

                        pending: {
                            count: assignedClosingPending.length,
                            value: this.sumValue(assignedClosingPending),
                            drilldown: this.mapDrilldown(assignedClosingPending),
                        },
                    },
                },

                approved: {
                    opening: {
                        count: approvedOpening.length,
                        value: this.sumValue(approvedOpening),
                        drilldown: this.mapDrilldown(approvedOpening, "infoFilled"),
                    },
                    total: {
                        count: approvedTotal.length,
                        value: this.sumValue(approvedTotal),
                        drilldown: this.mapDrilldown(approvedTotal, "infoFilled"),
                    },
                    during: {
                        total: {
                            count: assignedDuringCompleted.length,
                            value: this.sumValue(assignedDuringCompleted),
                            drilldown: this.mapDrilldown(assignedDuringCompleted, "infoFilled"),
                        },
                        completed: {
                            count: approvedDuringAccepted.length,
                            value: this.sumValue(approvedDuringAccepted),
                            drilldown: this.mapDrilldown(approvedDuringAccepted, "approved"),
                        },
                        rejected: {
                            count: approvedDuringRejected.length,
                            value: this.sumValue(approvedDuringRejected),
                            drilldown: this.mapDrilldown(approvedDuringRejected, "approved"),
                        },
                    },
                },

                bid: {
                    opening: {
                        count: bidOpening.length,
                        value: this.sumValue(bidOpening),
                        drilldown: this.mapDrilldown(bidOpening),
                    },
                    total: {
                        count: bidTotal.length,
                        value: this.sumValue(bidTotal),
                        drilldown: this.mapDrilldown(bidTotal),
                    },
                    during: {
                        total: {
                            count: bidDuringTotal.length,
                            value: this.sumValue(bidDuringTotal),
                            drilldown: this.mapDrilldown(bidDuringTotal),
                        },
                        completed: {
                            count: bidDuringCompleted.length,
                            value: this.sumValue(bidDuringCompleted),
                            drilldown: this.mapDrilldown(bidDuringCompleted, "bidSubmitted"),
                        },
                        pending: {
                            count: dnbDuringCompleted.length,
                            value: this.sumValue(dnbDuringCompleted),
                            drilldown: this.mapDrilldown(dnbDuringCompleted, "tenderUpdated"),
                        },
                    },
                },
                resultAwaited: {
                    opening: {
                        count: resultAwaitedOpening.length,
                        value: this.sumValue(resultAwaitedOpening),
                        drilldown: this.mapDrilldown(resultAwaitedOpening, "resultEval"),
                    },

                    total: {
                        count: resultAwaitedClosing.length, // 🔥 closing pending
                        value: this.sumValue(resultAwaitedClosing),
                        drilldown: this.mapDrilldown(resultAwaitedClosing, "resultEval"),
                    },

                    during: {
                        total: {
                            // 🔥 bids that entered result stage during period
                            count: resultAwaitedDuringTotal.length,
                            value: this.sumValue(resultAwaitedDuringTotal),
                            drilldown: this.mapDrilldown(resultAwaitedDuringTotal, "bidSubmitted"),
                        },
                        disqualified: {
                            // 🔥 bids that entered result stage during period
                            count: disqualifiedDuringCompleted.length,
                            value: this.sumValue(disqualifiedDuringCompleted),
                            drilldown: this.mapDrilldown(disqualifiedDuringCompleted, "resultUploaded"),
                        },
                        received: {
                            // 🔥 result received during period
                            count: resultAwaitedDuringCompleted.length,
                            value: this.sumValue(resultAwaitedDuringCompleted),
                            drilldown: this.mapDrilldown(resultAwaitedDuringCompleted, "resultUploaded"),
                        },
                    },
                },

                won: {
                    opening: {
                        count: wonOpening.length,
                        value: this.sumValue(wonOpening),
                        drilldown: this.mapDrilldown(wonOpening, "resultUploaded"),
                    },
                    total: {
                        count: wonTotal.length,
                        value: this.sumValue(wonTotal),
                        drilldown: this.mapDrilldown(wonTotal, "resultUploaded"),
                    },
                    during: {
                        completed: {
                            count: wonDuringCompleted.length,
                            value: this.sumValue(wonDuringCompleted),
                            drilldown: this.mapDrilldown(wonDuringCompleted, "resultUploaded"),
                        },
                        pending: { count: 0, value: 0, drilldown: [] },
                    },
                },

                lost: {
                    opening: {
                        count: lostOpening.length,
                        value: this.sumValue(lostOpening),
                        drilldown: this.mapDrilldown(lostOpening, "resultUploaded"),
                    },
                    total: {
                        count: lostTotal.length,
                        value: this.sumValue(lostTotal),
                        drilldown: this.mapDrilldown(lostTotal, "resultUploaded"),
                    },
                    during: {
                        completed: {
                            count: lostDuringCompleted.length,
                            value: this.sumValue(lostDuringCompleted),
                            drilldown: this.mapDrilldown(lostDuringCompleted, "resultUploaded"),
                        },
                        pending: { count: 0, value: 0, drilldown: [] },
                    },
                },

                cancelled: {
                    opening: {
                        count: cancelledOpening.length,
                        value: this.sumValue(cancelledOpening),
                        drilldown: this.mapDrilldown(cancelledOpening, "resultUploaded"),
                    },
                    total: {
                        count: cancelledTotal.length,
                        value: this.sumValue(cancelledTotal),
                        drilldown: this.mapDrilldown(cancelledTotal, "resultUploaded"),
                    },
                    during: {
                        completed: {
                            count: cancelledDuringCompleted.length,
                            value: this.sumValue(cancelledDuringCompleted),
                            drilldown: this.mapDrilldown(cancelledDuringCompleted, "resultUploaded"),
                        },
                        pending: { count: 0, value: 0, drilldown: [] },
                    },
                },
            },
        };
    }

    private sumValue(rows: any[]) {
        return rows.reduce((sum, r) => sum + Number(r.effective_value ?? r.gst_values ?? 0), 0);
    }
    // =======================================================
    // EMD BALANCE SHEET VIEW
    // =======================================================

    private async resolveTenderIdsForView(view: "user" | "team" | "all", userId?: number, teamId?: number): Promise<number[]> {
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (view === "user" && userId) {
            conditions.push(eq(tenderInfos.teamMember, userId));
        }

        if (view === "team" && teamId) {
            conditions.push(eq(tenderInfos.team, teamId));
        }

        const tenders = await this.db
            .select({ id: tenderInfos.id })
            .from(tenderInfos)
            .where(and(...conditions));

        return tenders.map(t => t.id);
    }

    private async fetchEmdRequestsForTenders(tenderIds: number[], to: Date) {
        if (!tenderIds.length) return [];

        return this.db
            .select({
                requestId: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                amount: paymentRequests.amountRequired,
                createdAt: paymentRequests.createdAt,
                dueDate: paymentRequests.dueDate,

                instrumentType: paymentInstruments.instrumentType,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                statusUpdatedAt: paymentInstruments.updatedAt,

                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                tenderStatus: tenderInfos.status,

                resultDeclaredAt: sql`(SELECT MAX(${tenderResultDetails.resultUploadedAt}) FROM ${tenderResultDetails} WHERE ${tenderResultDetails.tenderResultId} = ${tenderResults.id})`,
            })
            .from(paymentRequests)
            .innerJoin(paymentInstruments, eq(paymentInstruments.requestId, paymentRequests.id))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, paymentRequests.tenderId))
            .where(
                and(
                    inArray(paymentRequests.tenderId, tenderIds),
                    eq(paymentRequests.purpose, "EMD"),
                    lte(paymentRequests.createdAt, to),

                    // ✅ IMPORTANT: Only real EMD instruments
                    inArray(paymentInstruments.instrumentType, ["DD", "FDR", "Bank Transfer", "Portal Payment", "BG"])
                )
            );
    }

    async getEmdBalance(query: EmdBalanceQueryDto) {
        const from = new Date(`${query.fromDate}T00:00:00.000Z`);
        const to = new Date(`${query.toDate}T23:59:59.999Z`);

        const tenderIds = await this.resolveTenderIdsForView(query.view, query.userId, query.teamId);

        if (!tenderIds.length) {
            return this.emptyEmdBalance();
        }

        const rows = await this.fetchEmdRequestsForTenders(tenderIds, to);

        if (!rows.length) {
            return this.emptyEmdBalance();
        }

        return this.aggregateEmdBalance(rows, from, to);
    }

    private emptyEmdBalance() {
        const bucket = () => ({ count: 0, value: 0, drilldown: [] as any[] });

        return {
            opening: bucket(),
            requested: bucket(),
            returned: bucket(),
            settled: bucket(),
            closing: bucket(),
            overdue: bucket(),
        };
    }

    private isTenderWon(statusCode: number | null): boolean {
        if (statusCode === null || statusCode === undefined) return false;

        // WON status codes from your KPI mapping
        return [25, 26, 27, 28].includes(Number(statusCode));
    }

    private aggregateEmdBalance(rows: any[], from: Date, to: Date) {
        const result = this.emptyEmdBalance();

        for (const r of rows) {
            const state = resolveEmdFinancialState(r.instrumentType, r.action);
            const weWonTender = this.isTenderWon(r.tenderStatus);

            const meta = {
                tenderId: r.tenderId,
                tenderNo: r.tenderNo,
                tenderName: r.tenderName,
                instrumentType: r.instrumentType,
                amount: Number(r.amount),
                status: r.status,
                requestedAt: r.createdAt,
                lastUpdatedAt: r.statusUpdatedAt,
                resultDeclaredAt: r.resultDeclaredAt,
                daysLocked: state === "LOCKED" ? Math.ceil((to.getTime() - r.createdAt.getTime()) / 86400000) : null,
            };

            // ===============================
            // OPENING BALANCE
            // ===============================
            if (r.createdAt < from && state === "LOCKED") {
                this.add(result.opening, meta);
            }

            // ===============================
            // REQUESTED (during period)
            // ===============================
            if (r.createdAt >= from && r.createdAt <= to) {
                this.add(result.requested, meta);
            }

            // ===============================
            // RETURNED (during period)
            // ===============================
            if (state === "RETURNED" && r.statusUpdatedAt && r.statusUpdatedAt >= from && r.statusUpdatedAt <= to) {
                this.add(result.returned, meta);
            }

            // ===============================
            // SETTLED / ADJUSTED (during period)
            // ===============================
            if (state === "SETTLED" && r.statusUpdatedAt && r.statusUpdatedAt >= from && r.statusUpdatedAt <= to) {
                this.add(result.settled, meta);
            }

            // ===============================
            // CLOSING BALANCE
            // ===============================
            if (state === "LOCKED") {
                this.add(result.closing, meta);

                // ===============================
                // OVERDUE (FINAL DEFINITION)
                // ===============================
                if (
                    r.resultDeclaredAt && // result declared
                    !weWonTender && // NOT won
                    new Date(r.resultDeclaredAt.getTime() + EMD_OVERDUE_GRACE_DAYS * 86400000) < to // grace expired
                ) {
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

    async getEmdCashFlow(query: { view: "user" | "team" | "all"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
        const from = `${query.fromDate}T00:00:00.000Z`;
        const to = `${query.toDate}T23:59:59.999Z`;

        /* ============================
       BASE WHERE
    ============================ */

        const baseWhere = () => {
            let w = `pr.purpose = 'EMD'`;
            if (query.view === "user" && query.userId) {
                w += ` AND ti.team_member = ${query.userId}`;
            }
            if (query.view === "team" && query.teamId) {
                w += ` AND ti.team = ${query.teamId}`;
            }
            return w;
        };

        const exec = async (sqlText: string) => (await this.db.execute(sql.raw(sqlText))).rows as any[];

        const sumValue = (rows: any[]) => rows.reduce((s, r) => s + Number(r.value ?? 0), 0);

        const emdCte = `
        WITH emd AS (
            SELECT
                pi.id                    AS instrument_id,
                pr.tender_id             AS tender_id,
                pi.amount                AS value,
                sst.name                 AS status,
                pi.instrument_type       AS instrument_type,
                pi.action                AS action,
                pi.status                AS instrument_status,
                pi.transfer_date         AS transfer_date,
                itd.return_transfer_date AS return_date,
                itd.return_utr           AS return_utr,
                itd.reason               AS return_reason,
                (itd.return_transfer_date IS NULL) AS return_date_derived,
                COALESCE(ti.tender_no, '-') AS tender_no,
                COALESCE(ti.tender_name, pr.project_name) AS tender_name,
                COALESCE(
                    CASE pi.instrument_type
                        WHEN 'DD'             THEN idd.dd_date
                        WHEN 'FDR'            THEN ifd.fdr_date
                        WHEN 'BG'             THEN ibd.bg_date
                        WHEN 'Cheque'         THEN icd.cheque_date
                        WHEN 'Bank Transfer'  THEN itd.transaction_date
                        WHEN 'Portal Payment' THEN itd.transaction_date
                    END,
                    pi.transfer_date,
                    itd.transaction_date,
                    pr.created_at
                ) AS paid_at,
                COALESCE(itd.return_transfer_date, pi.updated_at) AS returned_at,
                (
                       (pi.instrument_type IN ('DD','FDR')                      AND pi.action IN (3,4,7))
                    OR (pi.instrument_type IN ('Bank Transfer','Portal Payment') AND pi.action IN (3,4))
                    OR (pi.instrument_type = 'Cheque'                           AND pi.action IN (3,4,5,6))
                    OR (pi.instrument_type = 'BG'                               AND pi.action IN (6,8,9))
                ) AS has_return,
                CASE
                    WHEN (pi.instrument_type IN ('DD','FDR')                      AND pi.action IN (3,4,7))
                      OR (pi.instrument_type IN ('Bank Transfer','Portal Payment') AND pi.action IN (3))
                      OR (pi.instrument_type = 'Cheque'                           AND pi.action IN (3,6))
                      OR (pi.instrument_type = 'BG'                               AND pi.action IN (6,8,9)) THEN 'RETURNED'
                    WHEN (pi.instrument_type IN ('DD','FDR')                      AND pi.action IN (5))
                      OR (pi.instrument_type IN ('Bank Transfer','Portal Payment') AND pi.action IN (4))
                      OR (pi.instrument_type = 'Cheque'                           AND pi.action IN (4,5))        THEN 'SETTLED'
                    ELSE 'PAID'
                END AS emd_state
            FROM payment_requests pr
            JOIN payment_instruments pi ON pi.request_id = pr.id
            LEFT JOIN tender_infos ti ON ti.id = pr.tender_id
            LEFT JOIN statuses sst ON sst.id = ti.status
            LEFT JOIN instrument_dd_details idd ON idd.instrument_id = pi.id
            LEFT JOIN instrument_fdr_details ifd ON ifd.instrument_id = pi.id
            LEFT JOIN instrument_bg_details ibd ON ibd.instrument_id = pi.id
            LEFT JOIN instrument_cheque_details icd ON icd.instrument_id = pi.id
            LEFT JOIN instrument_transfer_details itd ON itd.instrument_id = pi.id
            WHERE ${baseWhere()}
            AND ti.delete_status NOT IN (1)
            AND pi.status NOT ILIKE '%rejected%'
            AND pi.status NOT ILIKE '%pending%'
        )`;

        /* =====================================================
   A. OPENING
===================================================== */

        const opening = await exec(`${emdCte}
        SELECT
            instrument_id AS "instrumentId",
            tender_id AS "tenderId",
            value,
            status,
            instrument_type AS "instrumentType",
            tender_no AS "tenderNo",
            tender_name AS "tenderName",
            transfer_date AS "transferDate",
            paid_at AS "date",
            paid_at AS "paidDate",
            returned_at AS "returnedAt",
            return_date AS "returnDate",
            return_utr AS "returnUtr",
            return_reason AS "returnReason",
            return_date_derived AS "returnDateDerived",
            emd_state AS "emdState"
        FROM emd
        WHERE paid_at < '${from}'
        AND (NOT has_return OR returned_at >= '${from}')
        `);

        /* =====================================================
   B. PAID DURING PERIOD (ALL)
===================================================== */

        const paidDuring = await exec(`${emdCte}
        SELECT
            instrument_id AS "instrumentId",
            tender_id AS "tenderId",
            value,
            status,
            instrument_type AS "instrumentType",
            tender_no AS "tenderNo",
            tender_name AS "tenderName",
            transfer_date AS "transferDate",
            paid_at AS "date",
            paid_at AS "paidDate",
            returned_at AS "returnedAt",
            return_date AS "returnDate",
            return_utr AS "returnUtr",
            return_reason AS "returnReason",
            return_date_derived AS "returnDateDerived",
            emd_state AS "emdState"
        FROM emd
        WHERE paid_at BETWEEN '${from}' AND '${to}'
        `);

        /* =====================================================
   C. RECEIVED FOR PRIOR PAID
===================================================== */

        const receivedForPrior = await exec(`${emdCte}
        SELECT
            instrument_id AS "instrumentId",
            tender_id AS "tenderId",
            value,
            status,
            instrument_type AS "instrumentType",
            tender_no AS "tenderNo",
            tender_name AS "tenderName",
            transfer_date AS "transferDate",
            returned_at AS "date",
            paid_at AS "paidDate",
            returned_at AS "returnedAt",
            return_date AS "returnDate",
            return_utr AS "returnUtr",
            return_reason AS "returnReason",
            return_date_derived AS "returnDateDerived",
            emd_state AS "emdState"
        FROM emd
        WHERE paid_at < '${from}'
        AND has_return
        AND returned_at BETWEEN '${from}' AND '${to}'
        `);

        /* =====================================================
   D. RECEIVED FOR DURING PAID
===================================================== */

        const receivedForDuring = await exec(`${emdCte}
        SELECT
            instrument_id AS "instrumentId",
            tender_id AS "tenderId",
            value,
            status,
            instrument_type AS "instrumentType",
            tender_no AS "tenderNo",
            tender_name AS "tenderName",
            transfer_date AS "transferDate",
            returned_at AS "date",
            paid_at AS "paidDate",
            returned_at AS "returnedAt",
            return_date AS "returnDate",
            return_utr AS "returnUtr",
            return_reason AS "returnReason",
            return_date_derived AS "returnDateDerived",
            emd_state AS "emdState"
        FROM emd
        WHERE paid_at BETWEEN '${from}' AND '${to}'
        AND has_return
        AND returned_at BETWEEN '${from}' AND '${to}'
        `);

        /* =====================================================
   E. CLOSING
   Pending at end of period
===================================================== */

        const closing = await exec(`${emdCte}
        SELECT
            instrument_id AS "instrumentId",
            tender_id AS "tenderId",
            value,
            status,
            instrument_type AS "instrumentType",
            tender_no AS "tenderNo",
            tender_name AS "tenderName",
            transfer_date AS "transferDate",
            paid_at AS "date",
            paid_at AS "paidDate",
            returned_at AS "returnedAt",
            return_date AS "returnDate",
            return_utr AS "returnUtr",
            return_reason AS "returnReason",
            return_date_derived AS "returnDateDerived",
            emd_state AS "emdState"
        FROM emd
        WHERE paid_at < '${to}'
        AND (NOT has_return OR returned_at >= '${to}')
        `);

        let otherThanTms: any[] | null = null;

        if (query.view === "team" && query.teamId === 1) {
            const specialIds = [318, 322, 328, 320];

            const rows = await exec(`
        SELECT
            pr.id               AS "requestId",
            pr.project_name     AS "name",
            pi.amount           AS "value",
            pi.instrument_type  AS "instrumentType",
            pi.status           AS "status",
            pi.action           AS "action"
        FROM payment_requests pr
        JOIN payment_instruments pi ON pi.request_id = pr.id
        WHERE pr.id IN (${specialIds.join(",")})
        AND pi.status NOT ILIKE '%rejected%'
    `);

            otherThanTms = rows;
        }

        /* =====================================================
       FINAL RESPONSE (dashboard-ready)
    ===================================================== */

        return {
            from: new Date(from),
            to: new Date(to),

            paidPriorNotReceived: {
                count: opening.length,
                value: sumValue(opening),
                drilldown: opening,
            },

            paidDuring: {
                count: paidDuring.length,
                value: sumValue(paidDuring),
                drilldown: paidDuring,
            },

            receivedForPrior: {
                count: receivedForPrior.length,
                value: sumValue(receivedForPrior),
                drilldown: receivedForPrior,
            },

            receivedForDuring: {
                count: receivedForDuring.length,
                value: sumValue(receivedForDuring),
                drilldown: receivedForDuring,
            },

            pendingAtEnd: {
                count: closing.length,
                value: sumValue(closing),
                drilldown: closing,
            },

            otherThanTms,
        };
    }
}
