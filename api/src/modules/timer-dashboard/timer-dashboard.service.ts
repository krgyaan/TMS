import type { DbInstance } from "@/db";
import { TenderInfosService } from "@/modules/tendering/tenders/tenders.service";
import { TimersService } from "@/modules/timers/timers.service";
import { DRIZZLE } from "@db/database.module";
import { paymentRequests } from "@db/schemas/tendering/payment-requests.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { timerEvents, timerTrackers } from "@db/schemas/workflow/timer.schema";
import { users } from "@db/schemas/auth/users.schema";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, lte, sql } from "drizzle-orm";

@Injectable()
export class TimerDashboardService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly timersService: TimersService
    ) {}

    async search(by: string, value: string) {
        let tenderIds: number[];

        switch (by) {
            case "id": {
                const id = Number.parseInt(value, 10);
                if (Number.isNaN(id)) {
                    throw new BadRequestException("Invalid tender ID");
                }
                const tender = await this.tenderInfosService.findById(id);
                if (!tender) {
                    throw new NotFoundException(`Tender with ID ${id} not found`);
                }
                tenderIds = [id];
                break;
            }

            case "tender_no": {
                const searchStr = `%${value}%`;
                const rows = await this.db
                    .select({ id: tenderInfos.id })
                    .from(tenderInfos)
                    .where(and(eq(tenderInfos.tlStatus, 1), eq(tenderInfos.deleteStatus, 0), sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`));
                if (rows.length === 0) {
                    throw new NotFoundException(`No tender found with number matching "${value}"`);
                }
                tenderIds = rows.map(r => r.id);
                break;
            }

            case "tender_name": {
                const searchStr = `%${value}%`;
                const rows = await this.db
                    .select({ id: tenderInfos.id })
                    .from(tenderInfos)
                    .where(and(eq(tenderInfos.tlStatus, 1), eq(tenderInfos.deleteStatus, 0), sql`${tenderInfos.tenderName} ILIKE ${searchStr}`));
                if (rows.length === 0) {
                    throw new NotFoundException(`No tender found with name matching "${value}"`);
                }
                tenderIds = rows.map(r => r.id);
                break;
            }

            default:
                throw new BadRequestException(`Invalid search field: "${by}". Use "id", "tender_no", or "tender_name"`);
        }

        const results: Array<{ tender: any; timers: any[] }> = [];
        for (const tenderId of tenderIds) {
            const tender = await this.tenderInfosService.findById(tenderId);
            const timers = await this.timersService.getTimers("TENDER", tenderId);
            const timersWithEvents = await this.enrichTimersWithEvents(timers);
            results.push({ tender, timers: timersWithEvents });
        }

        return { results };
    }

    private async enrichTimersWithEvents(timers: any[]) {
        if (timers.length === 0) return timers;

        const trackerIds = timers.map(t => t.id);

        const eventRows = await this.db
            .select({
                trackerId: timerEvents.trackerId,
                eventType: timerEvents.eventType,
                previousStatus: timerEvents.previousStatus,
                newStatus: timerEvents.newStatus,
                reason: timerEvents.reason,
                createdAt: timerEvents.createdAt,
                performedByName: users.name,
            })
            .from(timerEvents)
            .leftJoin(users, eq(timerEvents.performedByUserId, users.id))
            .where(inArray(timerEvents.trackerId, trackerIds))
            .orderBy(timerEvents.trackerId, timerEvents.createdAt);

        const eventsByTrackerId: Record<number, typeof eventRows> = {};
        for (const row of eventRows) {
            const tid = row.trackerId;
            if (!eventsByTrackerId[tid]) eventsByTrackerId[tid] = [];
            eventsByTrackerId[tid].push(row);
        }

        return timers.map(t => ({
            ...t,
            events: eventsByTrackerId[t.id] || [],
        }));
    }

    async getExpiringSoon(withinHours = 12, includeOverdue = false) {
        const now = Date.now();
        const deadlineUpperBound = new Date(now + withinHours * 60 * 60 * 1000);

        const conditions = [sql`${timerTrackers.status} IN ('running', 'paused')`, sql`${timerTrackers.deadlineAt} IS NOT NULL`, lte(timerTrackers.deadlineAt, deadlineUpperBound)];

        // By default only timers with remaining time in (0, withinHours].
        // Set includeOverdue to true to also surface timers whose deadline has already passed.
        if (!includeOverdue) {
            conditions.push(sql`${timerTrackers.deadlineAt} >= ${new Date(now)}`);
        }

        const timerRows = await this.db
            .select({
                id: timerTrackers.id,
                entityType: timerTrackers.entityType,
                entityId: timerTrackers.entityId,
                stage: timerTrackers.stage,
                status: timerTrackers.status,
                allocatedTimeMs: timerTrackers.allocatedTimeMs,
                totalExtensionMs: timerTrackers.totalExtensionMs,
                totalPausedDurationMs: timerTrackers.totalPausedDurationMs,
                deadlineAt: timerTrackers.deadlineAt,
                startedAt: timerTrackers.startedAt,
                pausedAt: timerTrackers.pausedAt,
                assignedUserId: timerTrackers.assignedUserId,
                assignedUserName: users.name,
                createdAt: timerTrackers.createdAt,
                updatedAt: timerTrackers.updatedAt,
                metadata: timerTrackers.metadata,
            })
            .from(timerTrackers)
            .leftJoin(users, eq(timerTrackers.assignedUserId, users.id))
            .where(and(...conditions))
            .orderBy(timerTrackers.deadlineAt);

        if (timerRows.length === 0) {
            return { timers: [] };
        }

        type TimerRow = (typeof timerRows)[number] & {
            remainingMs: number;
            entity: Record<string, any> | null;
        };

        const timers: TimerRow[] = timerRows.map(t => ({
            ...t,
            remainingMs: t.deadlineAt ? new Date(t.deadlineAt).getTime() - now : 0,
            entity: null,
        }));

        const timersByEntity = new Map<string, Map<number, typeof timers>>();
        for (const timer of timers) {
            let byType = timersByEntity.get(timer.entityType);
            if (!byType) {
                byType = new Map();
                timersByEntity.set(timer.entityType, byType);
            }
            const list = byType.get(timer.entityId) || [];
            list.push(timer);
            byType.set(timer.entityId, list);
        }

        // TENDER -> tender_infos
        const tenderType = timersByEntity.get("TENDER");
        if (tenderType && tenderType.size > 0) {
            const tenderRows = await this.db
                .select({
                    id: tenderInfos.id,
                    tenderNo: tenderInfos.tenderNo,
                    tenderName: tenderInfos.tenderName,
                    dueDate: tenderInfos.dueDate,
                    teamMemberId: tenderInfos.teamMember,
                    teamMemberName: users.name,
                    tlStatus: tenderInfos.tlStatus,
                    deleteStatus: tenderInfos.deleteStatus,
                })
                .from(tenderInfos)
                .leftJoin(users, eq(tenderInfos.teamMember, users.id))
                .where(inArray(tenderInfos.id, [...tenderType.keys()]));

            for (const tender of tenderRows) {
                const list = tenderType.get(tender.id);
                if (list) {
                    for (const timer of list) {
                        timer.entity = { type: "TENDER", ...tender };
                    }
                }
            }
        }

        // EMD -> payment_requests
        const emdType = timersByEntity.get("EMD");
        if (emdType && emdType.size > 0) {
            const emdRows = await this.db
                .select({
                    id: paymentRequests.id,
                    tenderId: paymentRequests.tenderId,
                    tenderNo: paymentRequests.tenderNo,
                    projectName: paymentRequests.projectName,
                    purpose: paymentRequests.purpose,
                    amountRequired: paymentRequests.amountRequired,
                    dueDate: paymentRequests.dueDate,
                    status: paymentRequests.status,
                    requestedBy: paymentRequests.requestedBy,
                })
                .from(paymentRequests)
                .where(inArray(paymentRequests.id, [...emdType.keys()]));

            for (const emd of emdRows) {
                const list = emdType.get(emd.id);
                if (list) {
                    for (const timer of list) {
                        timer.entity = { type: "EMD", ...emd };
                    }
                }
            }
        }

        return { timers };
    }

    async stopTimer(entityType: string, entityId: number, stage: string) {
        const timer = await this.timersService.stopTimer({
            entityType,
            entityId,
            stage,
        });
        return { success: true, message: "Timer stopped", timer };
    }
}
