import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, between } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { PerformanceQueryDto } from "../tender-executive-performance/zod/performance-query.dto";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { timer } from "@db/schemas/workflow/timer.schema";
import { tenderResults } from "@/db/schemas/tendering/tender-result.schema";
import { bidSubmissions } from "@/db/schemas/tendering/bid-submissions.schema";
import { TenderListQuery } from "../tender-executive-performance/zod/tender.dto";
import { TenderOutcomeStatus } from "../tender-executive-performance/zod/stage-performance.type";
import { users } from "@db/schemas/auth/users.schema";
import { StagePerformance } from "../tender-executive-performance/zod/stage-performance.type";

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
    },
    {
        stageKey: "costing_sheet_approval",
        timerName: "costing_sheet_approval",
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
    ) {}

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

        const teamMembers = await this.db.select({ id: users.id }).from(users).where(eq(users.team, teamId));

        if (teamMembers.length === 0) return [];

        const teamUserIds = teamMembers.map(u => u.id);

        /* ----------------------------------------
       2. Fetch Team Tenders
    ---------------------------------------- */

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                dueDate: tenderInfos.dueDate,
            })
            .from(tenderInfos)
            .where(and(inArray(tenderInfos.teamMember, teamUserIds), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        if (tenders.length === 0) return [];

        const tenderIds = tenders.map(t => t.id);
        const tenderMap = new Map(tenders.map(t => [t.id, t]));

        /* ----------------------------------------
       3. Fetch ONLY TL Approval Timers
    ---------------------------------------- */

        const timers = await this.db
            .select()
            .from(timer)
            .where(
                and(
                    inArray(timer.entityId, tenderIds),
                    inArray(
                        timer.timerName,
                        TL_STAGES.map(s => s.timerName)
                    )
                )
            );

        if (timers.length === 0) return [];

        /* ----------------------------------------
       4. Normalize (Timer = Source of Truth)
    ---------------------------------------- */

        const output: StagePerformance[] = [];
        const now = new Date();

        for (const t of timers) {
            const tender = tenderMap.get(t.entityId);
            if (!tender) continue;

            const stage = TL_STAGES.find(s => s.timerName === t.timerName);
            if (!stage) continue;

            const deadline = tender.dueDate ?? null;

            let completed = t.status === "completed";
            let onTime: boolean | null = null;

            if (completed && t.endTime && deadline) {
                onTime = t.endTime <= deadline;
            } else if (!completed && deadline && now > deadline) {
                completed = true;
                onTime = false;
            }

            output.push({
                tenderId: tender.id,
                stageKey: stage.stageKey,
                applicable: true,
                completed,
                onTime,
                startTime: t.startTime ?? null,
                endTime: t.endTime ?? null,
                deadline,
            });
        }

        return output;
    }

    async getStageMatrix(query: PerformanceQueryDto) {
        const stages = await this.getStagePerformance(query);

        const stageKeys = TL_STAGES.map(s => s.stageKey);

        const counters = new Map<TLStageKey, any>();
        stageKeys.forEach(k => counters.set(k, { done: 0, onTime: 0, late: 0, pending: 0, notApplicable: 0 }));

        for (const s of stages) {
            const c = counters.get(s.stageKey as TLStageKey)!;

            if (!s.completed) {
                c.pending++;
                continue;
            }

            c.done++;
            if (s.onTime === true) c.onTime++;
            if (s.onTime === false) c.late++;
        }

        return {
            stages: stageKeys,
            rows: [
                { key: "done", label: "Done", data: stageKeys.map(k => counters.get(k)!.done) },
                { key: "onTime", label: "On Time", data: stageKeys.map(k => counters.get(k)!.onTime) },
                { key: "late", label: "Late", data: stageKeys.map(k => counters.get(k)!.late) },
                { key: "pending", label: "Pending", data: stageKeys.map(k => counters.get(k)!.pending) },
                { key: "notApplicable", label: "Not Applicable", data: stageKeys.map(k => counters.get(k)!.notApplicable) },
            ],
        };
    }

    /* =====================================================
       OUTCOMES (ONLY TL-APPROVED TENDERS)
    ===================================================== */

    async getOutcomes(query: PerformanceQueryDto) {
        const { userId, fromDate, toDate } = query;

        const empty = { resultAwaited: 0, missed: 0, won: 0, lost: 0, notBid: 0 };

        const leader = await this.db.select({ teamId: users.team }).from(users).where(eq(users.id, userId)).limit(1);

        const teamId = leader[0]?.teamId;
        if (!teamId) return empty;

        const members = await this.db.select({ id: users.id }).from(users).where(eq(users.team, teamId));

        if (members.length === 0) return empty;

        const memberIds = members.map(m => m.id);

        const tenders = await this.db
            .select({
                id: tenderInfos.id,
                statusCode: tenderInfos.status,
            })
            .from(tenderInfos)
            .where(and(inArray(tenderInfos.teamMember, memberIds), eq(tenderInfos.deleteStatus, 0), between(tenderInfos.createdAt, fromDate, toDate)));

        if (tenders.length === 0) return empty;

        let resultAwaited = 0,
            missed = 0,
            won = 0,
            lost = 0,
            notBid = 0;

        for (const t of tenders) {
            const outcome = mapTenderOutcome(Number(t.statusCode));
            switch (outcome) {
                case "Result Awaited":
                    resultAwaited++;
                    break;
                case "Missed":
                    missed++;
                    break;
                case "Won":
                    won++;
                    break;
                case "Lost":
                    lost++;
                    break;
                case "Not Bid":
                    notBid++;
                    break;
            }
        }

        return { resultAwaited, missed, won, lost, notBid };
    }

    /* =====================================================
       SUMMARY
    ===================================================== */

    async getSummary(query: PerformanceQueryDto) {
        const stages = await this.getStagePerformance(query);

        const tenderSet = new Set<number>();
        stages.forEach(s => tenderSet.add(s.tenderId));

        let applicableStages = 0;
        let completedStages = 0;
        let pendingStages = 0;
        let onTimeStages = 0;
        let lateStages = 0;

        for (const s of stages) {
            applicableStages++;
            if (s.completed) {
                completedStages++;
                if (s.onTime === true) onTimeStages++;
                if (s.onTime === false) lateStages++;
            } else {
                pendingStages++;
            }
        }

        const completionRate = applicableStages ? Math.round((completedStages / applicableStages) * 100) : 0;

        const onTimeRate = completedStages ? Math.round((onTimeStages / completedStages) * 100) : 0;

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

    /* =====================================================
       TRENDS
    ===================================================== */

    async getTrends(query: PerformanceQueryDto & { bucket?: "week" | "month" }) {
        const { bucket = "week" } = query;

        const stages = await this.getStagePerformance(query);

        const buckets = new Map<string, { applicable: number; completed: number; onTime: number }>();

        for (const s of stages) {
            const date = s.endTime ?? s.startTime;
            if (!date) continue;

            const label = bucket === "month" ? `${date.getFullYear()}-${date.getMonth() + 1}` : `Week ${getWeekNumber(date)}`;

            if (!buckets.has(label)) {
                buckets.set(label, { applicable: 0, completed: 0, onTime: 0 });
            }

            const b = buckets.get(label)!;
            b.applicable++;

            if (s.completed) {
                b.completed++;
                if (s.onTime === true) b.onTime++;
            }
        }

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

        const velocityScore = summary.completionRate;
        const accuracyScore = summary.onTimeRate;
        const outcomeScore = outcomes.resultAwaited ? Math.round((outcomes.won / outcomes.resultAwaited) * 100) : 0;

        const total = Math.round(velocityScore * 0.4 + accuracyScore * 0.4 + outcomeScore * 0.2);

        return {
            velocity: velocityScore,
            accuracy: accuracyScore,
            outcome: outcomeScore,
            total,
        };
    }

    async getTenderList(query: TenderListQuery) {
        const { userId, fromDate, toDate, outcome } = query;

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

        if (!outcome) return rows;

        return rows.filter(r => {
            switch (outcome) {
                case "resultAwaited":
                    return r.status === "Result Awaited";
                case "won":
                    return r.status === "Won";
                case "lost":
                    return r.status === "Lost";
                case "missed":
                    return r.status === "Missed";
                case "notBid":
                    return r.status === "Not Bid";
                default:
                    return true;
            }
        });
    }
}
