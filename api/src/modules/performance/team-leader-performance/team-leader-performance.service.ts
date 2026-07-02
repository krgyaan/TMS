import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, between } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PerformanceQueryDto } from "../tender-executive-performance/zod/performance-query.dto";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { tenderResults } from "@/db/schemas/tendering/tender-result.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { timerTrackers } from "@db/schemas/workflow/timer.schema";
import { TenderListQuery } from "../tender-executive-performance/zod/tender.dto";
import { TenderOutcomeStatus } from "../tender-executive-performance/zod/stage-performance.type";
import { users } from "@db/schemas/auth/users.schema";
import { StagePerformance } from "../tender-executive-performance/zod/stage-performance.type";
import { mapStatusToKpi } from "../config/stage-status";
import type { TenderKpiBucket } from "../tender-executive-performance/zod/tender-buckets.type";
import { TenderMeta } from "../tender-executive-performance/zod/tender.types";

export interface TLStagePerformance {
    tenderId: number;
    stageKey: "tender_approval" | "costing_sheet_approval";
    applicable: boolean;
    completed: boolean;
    onTime: boolean | null;
    startTime: Date | null;
    endTime: Date | null;
    deadline: Date | null;
}

const TL_STAGES = [
    {
        stageKey: "tender_approval",
        timerName: "tender_approval",
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },
    {
        stageKey: "costing_sheet_approval",
        timerName: "costing_sheet_approval",
        resolveDeadline: tender => tender.dueDate,
        tlStage: true,
    },
] as const;

type TLStageKey = (typeof TL_STAGES)[number]["stageKey"];

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
}

export function mapTenderOutcome(statusCode: number): TenderOutcomeStatus {
    // WON
    if ([25, 26, 27, 28].includes(statusCode)) return "Won";

    // LOST / DISQUALIFIED
    if ([18, 21, 22, 24, 33, 38, 39, 41].includes(statusCode)) return "Lost";

    // MISSED
    if ([8, 16, 36].includes(statusCode)) return "Missed";

    // RESULT AWAITED (Bid done, result pending)
    if ([17, 19, 20, 23, 37, 40].includes(statusCode)) return "Result Awaited";

    // NOT BID (Default: under-prep / rejected before bid)
    return "Not Bid";
}

@Injectable()
export class TeamLeaderPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) { }

    /* =====================================================
       CONTEXT
    ===================================================== */

    async getContext(query: PerformanceQueryDto) {
        const { userId, fromDate, toDate } = query;

        return {
            user: {
                id: userId,
                role: "Team Leader",
            },
            dateRange: { from: fromDate, to: toDate },
        };
    }

    /* =====================================================
       STAGE PERFORMANCE (APPROVAL ONLY)
    ===================================================== */

    async getStagePerformance(query: PerformanceQueryDto): Promise<StagePerformance[]> {
        const { userId, fromDate, toDate } = query;

        /* ----------------------------------------
       1. Resolve Team Leader & Team Members
    ---------------------------------------- */

        const leader = await this.db.select({ teamId: users.team }).from(users).where(eq(users.id, userId)).limit(1);

        const teamId = leader[0]?.teamId;
        if (!teamId) return [];

        const members = await this.db.select({ id: users.id }).from(users).where(eq(users.team, teamId));

        if (members.length === 0) return [];

        const memberIds = members.map(m => m.id);

        /* ----------------------------------------
       2. Fetch Team Tenders
    ---------------------------------------- */

        const tenders = await this.db
            .select()
            .from(tenderInfos)
            .where(and(inArray(tenderInfos.teamMember, memberIds), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        if (tenders.length === 0) return [];

        const tenderIds = tenders.map(t => t.id);
        const tenderMap = new Map(tenders.map(t => [t.id, t]));

        /* ----------------------------------------
       3. Fetch TL Approval Timers
    ---------------------------------------- */

        const timers = await this.db
            .select()
            .from(timerTrackers)
            .where(
                and(
                    inArray(timerTrackers.entityId, tenderIds),
                    inArray(
                        timerTrackers.stage,
                        TL_STAGES.map(s => s.timerName)
                    )
                )
            );

        const timerMap = new Map<string, (typeof timers)[number]>();
        for (const t of timers) {
            timerMap.set(`${t.entityId}:${t.stage}`, t);
        }

        /* ----------------------------------------
       4. Normalize (EXECUTIVE-ALIGNED LOGIC)
    ---------------------------------------- */

        const output: StagePerformance[] = [];
        const now = new Date();

        for (const tender of tenders) {
            for (const stage of TL_STAGES) {
                const timerRow = timerMap.get(`${tender.id}:${stage.timerName}`);

                const deadline = tender.dueDate ?? null;

                let completed = false;
                let onTime: boolean | null = null;
                let startTime: Date | null = null;
                let endTime: Date | null = null;

                if (timerRow) {
                    startTime = timerRow.startedAt ?? null;
                    endTime = timerRow.endedAt ?? null;

                    if (timerRow.status === "completed" && endTime) {
                        completed = true;
                        onTime = deadline ? endTime <= deadline : null;
                    } else if (deadline) {
                        // Not completed → check SLA
                        onTime = now <= deadline ? null : false;
                    }
                }

                output.push({
                    tenderId: tender.id,
                    tenderNo: tender.tenderNo ?? null,
                    tenderName: tender.tenderName ?? null,
                    stageKey: stage.stageKey,
                    applicable: true,
                    completed,
                    onTime,
                    startTime,
                    endTime,
                    deadline,
                });
            }
        }

        return output;
    }

    async getStageMatrix(query: PerformanceQueryDto) {
        const stages = await this.getStagePerformance(query);

        /* ----------------------------------------
       Resolve stage order
    ---------------------------------------- */

        const stageKeys = TL_STAGES.map(s => s.stageKey);

        /* ----------------------------------------
       Initialize counters + drilldowns
    ---------------------------------------- */

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

        /* ----------------------------------------
       Populate counters + drilldowns
    ---------------------------------------- */

        for (const stage of stages) {
            const counter = counters.get(stage.stageKey);
            if (!counter) continue;

            const tenderMeta = {
                tenderId: stage.tenderId,
                tenderNo: stage.tenderNo,
                tenderName: stage.tenderName,
                stageKey: stage.stageKey,
                deadline: stage.deadline ?? null,
                completedAt: stage.endTime ?? null,
                daysOverdue:
                    !stage.completed && stage.onTime === false && stage.deadline
                        ? Math.max(0, Math.ceil((Date.now() - new Date(stage.deadline).getTime()) / (1000 * 60 * 60 * 24)))
                        : null,
                meta:
                    stage.stageKey === "tender_approval"
                        ? { approvalType: "Tender Approval" }
                        : stage.stageKey === "costing_sheet_approval"
                            ? { approvalType: "Costing Sheet Approval" }
                            : {},
            };

            /* ---------- NOT APPLICABLE ---------- */
            if (!stage.applicable) {
                counter.notApplicable++;
                counter.drilldown.notApplicable.push(tenderMeta);
                continue;
            }

            /* ---------- NOT COMPLETED ---------- */
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

            /* ---------- COMPLETED ---------- */
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

        /* ----------------------------------------
       Build matrix rows (TE-compatible)
    ---------------------------------------- */

        return {
            stages: stageKeys,
            rows: [
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
            ],
        };
    }
    /* =====================================================
       OUTCOMES (ONLY TL-APPROVED TENDERS)
    ===================================================== */

    async getOutcomes(query: PerformanceQueryDto) {
        const { fromDate, toDate } = query;

        /* ----------------------------------------
       STEP 1: Resolve TL stage performance
       (source of truth for TL involvement)
    ---------------------------------------- */

        const stages = await this.getStagePerformance(query);

        const empty: {
            allocated: number;

            pending: number;
            approved: number;
            rejected: number;

            bid: number;
            missed: number;

            resultAwaited: number;
            won: number;
            lost: number;
            disqualified: number;

            tendersByKpi: Record<TenderKpiBucket, TenderMeta[]>;
        } = {
            allocated: 0,

            pending: 0,
            approved: 0,
            rejected: 0,

            bid: 0,
            missed: 0,

            resultAwaited: 0,
            won: 0,
            lost: 0,
            disqualified: 0,

            tendersByKpi: {
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
            },
        };

        if (stages.length === 0) return empty;

        /* ----------------------------------------
       STEP 2: Resolve TL-touched tenders
    ---------------------------------------- */

        const tenderIds = Array.from(new Set(stages.map(s => s.tenderId)));

        /* ----------------------------------------
       STEP 3: Fetch tender data (meta)
    ---------------------------------------- */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                organization: tenderInfos.organization,
                dueDate: tenderInfos.dueDate,
                value: tenderInfos.gstValues,
                statusCode: tenderInfos.status,
            })
            .from(tenderInfos)
            .where(and(inArray(tenderInfos.id, tenderIds), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        if (tenders.length === 0) return empty;

        /* ----------------------------------------
       STEP 4: Populate counters + tendersByKpi
       (EXECUTIVE-ALIGNED LOGIC)
    ---------------------------------------- */

        for (const t of tenders) {
            const bucket = mapStatusToKpi(Number(t.statusCode));

            const meta = {
                id: t.id,
                tenderNo: t.tenderNo ?? null,
                tenderName: t.tenderName ?? null,
                organizationName: String(t.organization) ?? null,
                dueDate: t.dueDate,
                value: Number(t.value ?? 0),
                statusBucket: bucket,
            };

            /* ----------------------------------
           ALLOCATED (all TL-touched tenders)
        ---------------------------------- */

            empty.allocated++;
            empty.tendersByKpi.ALLOCATED.push(meta);

            /* ----------------------------------
           PRE-BID
        ---------------------------------- */

            if (bucket === "PENDING" || bucket === "ALLOCATED") {
                empty.pending++;
                empty.tendersByKpi.PENDING.push(meta);
                continue;
            }

            if (bucket === "REJECTED") {
                empty.rejected++;
                empty.tendersByKpi.REJECTED.push(meta);
                continue;
            }

            /* ----------------------------------
           APPROVED
        ---------------------------------- */

            empty.approved++;
            empty.tendersByKpi.APPROVED.push(meta);

            /* ----------------------------------
           POST-BID
        ---------------------------------- */

            if (bucket === "MISSED") {
                empty.missed++;
                empty.tendersByKpi.MISSED.push(meta);
                continue;
            }

            empty.bid++;
            empty.tendersByKpi.BID.push(meta);

            /* ----------------------------------
           OUTCOMES
        ---------------------------------- */

            if (bucket === "RESULT_AWAITED") {
                empty.resultAwaited++;
                empty.tendersByKpi.RESULT_AWAITED.push(meta);
                continue;
            }

            if (bucket === "WON") {
                empty.won++;
                empty.tendersByKpi.WON.push(meta);
                continue;
            }

            if (bucket === "LOST") {
                empty.lost++;
                empty.tendersByKpi.LOST.push(meta);
                continue;
            }

            if (bucket === "DISQUALIFIED") {
                empty.disqualified++;
                empty.tendersByKpi.DISQUALIFIED.push(meta);
                continue;
            }
        }

        return empty;
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    async getSummary(query: PerformanceQueryDto) {
        const stages = await this.getStagePerformance(query);

        /* ----------------------------------------
       Unique tenders handled
    ---------------------------------------- */

        const tenderSet = new Set<number>();
        for (const stage of stages) {
            tenderSet.add(stage.tenderId);
        }

        let stagesApplicable = 0;
        let stagesCompleted = 0;
        let stagesPending = 0;
        let stagesOnTime = 0;
        let stagesLate = 0;

        /* ----------------------------------------
       Aggregate using EXECUTIVE semantics
    ---------------------------------------- */

        for (const stage of stages) {
            if (!stage.applicable) continue;

            stagesApplicable++;

            if (stage.completed) {
                stagesCompleted++;

                if (stage.onTime === true) {
                    stagesOnTime++;
                }

                if (stage.onTime === false) {
                    stagesLate++;
                }
            } else {
                // Includes overdue + pending
                stagesPending++;
            }
        }

        /* ----------------------------------------
       Safe rate calculations
    ---------------------------------------- */

        const completionRate = stagesApplicable > 0 ? Math.round((stagesCompleted / stagesApplicable) * 100) : 0;

        const onTimeRate = stagesCompleted > 0 ? Math.round((stagesOnTime / stagesCompleted) * 100) : 0;

        return {
            tendersHandled: tenderSet.size,

            stagesApplicable,
            stagesCompleted,
            stagesPending,

            stagesOnTime,
            stagesLate,

            completionRate,
            onTimeRate,
        };
    }

    /* =====================================================
       TRENDS
    ===================================================== */

    async getTrends(query: PerformanceQueryDto & { bucket?: "week" | "month" }) {
        const { userId, fromDate, toDate, bucket = "week" } = query;

        /* ----------------------------------------
       1️⃣ Fetch TL stage performance ONCE
    ---------------------------------------- */

        const stageData = await this.getStagePerformance(query);
        if (stageData.length === 0) return [];

        /* ----------------------------------------
       2️⃣ Group stages by tenderId
    ---------------------------------------- */

        const stagesByTender = new Map<number, StagePerformance[]>();
        for (const s of stageData) {
            if (!stagesByTender.has(s.tenderId)) {
                stagesByTender.set(s.tenderId, []);
            }
            stagesByTender.get(s.tenderId)!.push(s);
        }

        /* ----------------------------------------
       3️⃣ Fetch tender createdAt (same as TE)
    ---------------------------------------- */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                createdAt: tenderInfos.createdAt,
            })
            .from(tenderInfos)
            .where(
                and(
                    inArray(tenderInfos.id, Array.from(stagesByTender.keys())),
                    eq(tenderInfos.deleteStatus, 0),
                    between(tenderInfos.createdAt, new Date(fromDate), new Date(toDate))
                )
            );

        /* ----------------------------------------
       4️⃣ Bucket aggregation (EXECUTIVE-ALIGNED)
    ---------------------------------------- */

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
                buckets.set(label, {
                    applicable: 0,
                    completed: 0,
                    onTime: 0,
                });
            }

            const stats = buckets.get(label)!;
            const stages = stagesByTender.get(tender.id) ?? [];

            for (const stage of stages) {
                if (!stage.applicable) continue;

                stats.applicable++;

                if (stage.completed) {
                    stats.completed++;
                    if (stage.onTime === true) {
                        stats.onTime++;
                    }
                }
            }
        }

        /* ----------------------------------------
       5️⃣ Normalize to chart data
    ---------------------------------------- */

        return Array.from(buckets.entries()).map(([label, stats]) => ({
            label,
            completion: stats.applicable > 0 ? Math.round((stats.completed / stats.applicable) * 100) : 0,
            onTime: stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : 0,
        }));
    }

    /* =====================================================
       SCORING
    ===================================================== */

    async getScoring(query: PerformanceQueryDto) {
        const summary = await this.getSummary(query);
        const outcomes = await this.getOutcomes(query);

        /* ----------------------------------------
       Velocity & Accuracy (approval-based)
    ---------------------------------------- */

        const velocityScore = summary.completionRate;
        const accuracyScore = summary.onTimeRate;

        /* ----------------------------------------
       Outcome score (TE-aligned semantics)
       Only TL-touched tenders are considered
    ---------------------------------------- */

        const outcomeScore = outcomes.resultAwaited > 0 ? Math.round((outcomes.won / outcomes.resultAwaited) * 100) : 0;

        /* ----------------------------------------
       Weighted total (same as TE)
    ---------------------------------------- */

        const total = Math.round(velocityScore * 0.4 + accuracyScore * 0.4 + outcomeScore * 0.2);

        return {
            workCompletion: velocityScore,
            onTimeWork: accuracyScore,
            winRate: outcomeScore,
            total,
        };
    }

    async getTenderList(query: TenderListQuery) {
        const { userId, fromDate, toDate, kpi } = query;

        const from = new Date(`${fromDate}T00:00:00.000Z`);
        const to = new Date(`${toDate}T23:59:59.999Z`);

        /* =====================================================
        STEP 1: Resolve Team
    ===================================================== */

        const leader = await this.db.select({ teamId: users.team }).from(users).where(eq(users.id, userId)).limit(1);

        const teamId = leader[0]?.teamId;
        if (!teamId) return [];

        /* =====================================================
        STEP 2: Resolve Team Members
    ===================================================== */

        const teamMembers = await this.db.select({ id: users.id }).from(users).where(eq(users.team, teamId));

        if (teamMembers.length === 0) return [];

        const teamUserIds = teamMembers.map(u => u.id);

        /* =====================================================
        STEP 3: Fetch Tenders
    ===================================================== */

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
            .where(and(inArray(tenderInfos.teamMember, teamUserIds), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, from, to)));

        if (tenders.length === 0) return [];

        /* =====================================================
        STEP 4: Normalize Outcome using Mapper
    ===================================================== */

        const rows = tenders.map(t => {
            const status = mapTenderOutcome(Number(t.statusCode));

            return {
                id: t.id,
                tenderNo: t.tenderNo,
                tenderName: t.tenderName,
                organizationName: null,
                value: Number(t.value ?? 0),
                dueDate: t.dueDate,
                status,
            };
        });

        /* =====================================================
        STEP 5: Outcome Filter
    ===================================================== */

        if (!kpi) return rows;

        // return rows.filter(r => {
        //     switch (kpi) {
        //         case "resultAwaited":
        //             return r.status === "Result Awaited";
        //         case "won":
        //             return r.status === "Won";
        //         case "lost":
        //             return r.status === "Lost";
        //         case "missed":
        //             return r.status === "Missed";
        //         case "notBid":
        //             return r.status === "Not Bid";
        //         default:
        //             return true;
        //     }
        // });
    }
}
