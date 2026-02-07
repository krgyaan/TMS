import type { TimersService } from './timers.service';
import { transformTimerForFrontend } from './timer-transform';

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
