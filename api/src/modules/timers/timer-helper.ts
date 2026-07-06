import type { TimersService } from './timers.service';
import { transformTimerForFrontend, type FrontendTimerData } from './timer-transform';

export async function getFrontendTimer(
    timersService: TimersService,
    entityType: string,
    entityId: number,
    stage?: string
) {
    try {
        if (stage) {
            const timer = await timersService.getTimer(entityType, entityId, stage);
            const transformed = transformTimerForFrontend(timer, stage);
            return {
                ...transformed,
                deadline: timer?.deadlineAt || null,
                allocatedHours: timer?.allocatedTimeMs ? timer.allocatedTimeMs / (1000 * 60 * 60) : null,
            };
        } else {
            const timers = await timersService.getTimers(entityType, entityId);
            return timers.map(timer => ({
                ...transformTimerForFrontend(timer, timer.stage),
                deadline: timer.deadlineAt || null,
                allocatedHours: timer.allocatedTimeMs ? timer.allocatedTimeMs / (1000 * 60 * 60) : null,
            }));
        }
    } catch (error) {
        if (stage) {
            return transformTimerForFrontend(null, stage);
        }
        return [];
    }
}

export async function getFrontendTimersBatch(
    timersService: TimersService,
    entityType: string,
    entityIds: number[],
    stage?: string
): Promise<Map<number, FrontendTimerData & { deadline: Date | null; allocatedHours: number | null }>> {
    const timerMap = stage
        ? await timersService.getTimersByEntityIds(entityType, entityIds, stage)
        : new Map();

    const result = new Map<number, FrontendTimerData & { deadline: Date | null; allocatedHours: number | null }>();

    for (const entityId of entityIds) {
        const timer = timerMap.get(entityId);
        let deadline: Date | null = null;
        let allocatedHours: number | null = null;
        let frontendData: FrontendTimerData;

        if (timer) {
            frontendData = transformTimerForFrontend(timer, stage);
            deadline = timer.deadlineAt || null;
            allocatedHours = timer.allocatedTimeMs ? timer.allocatedTimeMs / (1000 * 60 * 60) : null;
        } else {
            frontendData = transformTimerForFrontend(null, stage);
        }

        result.set(entityId, { ...frontendData, deadline, allocatedHours });
    }

    return result;
}
