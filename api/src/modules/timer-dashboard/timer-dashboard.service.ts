import type { DbInstance } from '@/db';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TimersService } from '@/modules/timers/timers.service';
import { DRIZZLE } from '@db/database.module';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { timerEvents, timerTrackers } from '@db/schemas/workflow/timer.schema';
import { users } from '@db/schemas/auth/users.schema';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

@Injectable()
export class TimerDashboardService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly timersService: TimersService,
    ) { }

    async search(by: string, value: string) {
        let tenderIds: number[];

        switch (by) {
            case 'id': {
                const id = Number.parseInt(value, 10);
                if (Number.isNaN(id)) {
                    throw new BadRequestException('Invalid tender ID');
                }
                const tender = await this.tenderInfosService.findById(id);
                if (!tender) {
                    throw new NotFoundException(`Tender with ID ${id} not found`);
                }
                tenderIds = [id];
                break;
            }

            case 'tender_no': {
                const searchStr = `%${value}%`;
                const rows = await this.db
                    .select({ id: tenderInfos.id })
                    .from(tenderInfos)
                    .where(
                        and(
                            eq(tenderInfos.tlStatus, 1),
                            eq(tenderInfos.deleteStatus, 0),
                            sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`
                        )
                    );
                if (rows.length === 0) {
                    throw new NotFoundException(`No tender found with number matching "${value}"`);
                }
                tenderIds = rows.map(r => r.id);
                break;
            }

            case 'tender_name': {
                const searchStr = `%${value}%`;
                const rows = await this.db
                    .select({ id: tenderInfos.id })
                    .from(tenderInfos)
                    .where(
                        and(
                            eq(tenderInfos.tlStatus, 1),
                            eq(tenderInfos.deleteStatus, 0),
                            sql`${tenderInfos.tenderName} ILIKE ${searchStr}`
                        )
                    );
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
            const timers = await this.timersService.getTimers('TENDER', tenderId);
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

    async stopTimer(entityType: string, entityId: number, stage: string) {
        const timer = await this.timersService.stopTimer({
            entityType,
            entityId,
            stage,
        });
        return { success: true, message: 'Timer stopped', timer };
    }
}
