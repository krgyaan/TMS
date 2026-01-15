import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { stepInstances, timerEvents } from '@db/schemas/workflow/workflows.schema';
import { BusinessCalendarService } from '@/modules/timers/services/business-calendar.service';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@db';

export type TimerType = 'FIXED_DURATION' | 'DEADLINE_BASED' | 'NEGATIVE_COUNTDOWN' | 'DYNAMIC' | 'NO_TIMER';
export type TimerStatus = 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED' | 'CANCELLED';

export interface TimerState {
    stepInstanceId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'REJECTED' | 'ON_HOLD';
    timerStatus: TimerStatus;
    colorIndicator: 'GREEN' | 'YELLOW' | 'RED' | 'GREY';
    totalAllocatedMs: number | null;
    elapsedMs: number | null;
    remainingMs: number | null;
    pausedDurationMs: number;
    extensionDurationMs: number;
    startedAt: Date | null;
    scheduledEndAt: Date | null;
    actualEndAt: Date | null;
    percentageComplete: number;
    percentageOverdue: number;
    displayText: string;
    isOverdue: boolean;
    isNegativeCountdown: boolean;
    stepKey: string;
    stepName: string;
    stepOrder: number;
    assignedRole: string | null;
}

@Injectable()
export class TimerEngineService {
    private readonly logger = new Logger(TimerEngineService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly businessCalendar: BusinessCalendarService,
    ) { }

    /**
     * Start a timer for a step instance
     */
    async startTimer(params: {
        stepInstanceId: string;
        customDurationHours?: number;
        customDeadline?: Date;
    }): Promise<TimerState> {
        const { stepInstanceId, customDurationHours, customDeadline } = params;
        const now = new Date();

        this.logger.log(`Starting timer for step instance ${stepInstanceId}`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Validate timer can be started
        if (stepInstance.timerStatus !== 'NOT_STARTED') {
            throw new BadRequestException(`Timer already started (status: ${stepInstance.timerStatus})`);
        }

        // 3. Get timer configuration
        const timerConfig = stepInstance.timerConfig;
        if (timerConfig.type === 'NO_TIMER') {
            throw new BadRequestException('Cannot start timer for NO_TIMER type');
        }

        let allocatedTimeMs: number | null = null;
        let scheduledEndAt: Date | null = null;

        // 4. Calculate timer parameters based on type
        switch (timerConfig.type) {
            case 'FIXED_DURATION':
                const durationHours = customDurationHours || timerConfig.durationHours;
                if (durationHours === undefined) {
                    throw new BadRequestException('Duration hours required for FIXED_DURATION timer');
                }

                allocatedTimeMs = durationHours * 60 * 60 * 1000;

                if (timerConfig.isBusinessDaysOnly) {
                    scheduledEndAt = await this.businessCalendar.addBusinessHours(now, allocatedTimeMs);
                } else {
                    scheduledEndAt = new Date(now.getTime() + allocatedTimeMs);
                }
                break;

            case 'DEADLINE_BASED':
                const deadline = customDeadline || stepInstance.customDeadline;
                if (!deadline) {
                    throw new BadRequestException('Deadline required for DEADLINE_BASED timer');
                }
                scheduledEndAt = deadline;
                allocatedTimeMs = scheduledEndAt.getTime() - now.getTime();
                break;

            case 'NEGATIVE_COUNTDOWN':
                const entityDeadline = stepInstance.customDeadline;
                if (!entityDeadline) {
                    throw new BadRequestException('Deadline required for NEGATIVE_COUNTDOWN timer');
                }

                const hoursBeforeDeadline = timerConfig.hoursBeforeDeadline || -72;
                scheduledEndAt = new Date(entityDeadline.getTime() + (hoursBeforeDeadline * 60 * 60 * 1000));
                allocatedTimeMs = Math.abs(hoursBeforeDeadline * 60 * 60 * 1000);
                break;

            case 'DYNAMIC':
                if (!customDurationHours) {
                    throw new BadRequestException('Custom duration required for DYNAMIC timer');
                }
                allocatedTimeMs = customDurationHours * 60 * 60 * 1000;
                scheduledEndAt = new Date(now.getTime() + allocatedTimeMs);
                break;
        }

        // 5. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: 'RUNNING',
                status: 'IN_PROGRESS',
                actualStartAt: now,
                allocatedTimeMs,
                customDeadline: scheduledEndAt,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 6. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'START',
            newStatus: 'RUNNING',
            metadata: {
                scheduledEndAt: scheduledEndAt?.toISOString(),
                allocatedTimeMs,
                customDurationHours,
                customDeadline: customDeadline?.toISOString(),
            },
            createdAt: now,
        });

        this.logger.log(`Timer started successfully for step instance ${stepInstanceId}`);

        // 7. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Stop a running timer
     */
    async stopTimer(stepInstanceId: string): Promise<TimerState> {
        const now = new Date();

        this.logger.log(`Stopping timer for step instance ${stepInstanceId}`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Validate timer can be stopped
        if (!['RUNNING', 'PAUSED', 'OVERDUE'].includes(stepInstance.timerStatus)) {
            throw new BadRequestException(`Cannot stop timer with status: ${stepInstance.timerStatus}`);
        }

        // 3. Calculate actual time taken
        let actualTimeMs: number | null = null;
        if (stepInstance.actualStartAt) {
            actualTimeMs = now.getTime() - stepInstance.actualStartAt.getTime() -
                (stepInstance.totalPausedDurationMs || 0);
        }

        // 4. Determine if overdue
        let remainingTimeMs: number | null = null;
        let isOverdue = false;

        if (stepInstance.allocatedTimeMs && actualTimeMs) {
            remainingTimeMs = stepInstance.allocatedTimeMs - actualTimeMs;
            isOverdue = remainingTimeMs < 0;
        }

        // 5. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: isOverdue ? 'OVERDUE' : 'COMPLETED',
                status: 'COMPLETED',
                actualEndAt: now,
                actualTimeMs,
                remainingTimeMs,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 6. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'COMPLETE',
            previousStatus: stepInstance.timerStatus,
            newStatus: isOverdue ? 'OVERDUE' : 'COMPLETED',
            metadata: {
                actualTimeMs,
                remainingTimeMs,
                isOverdue,
            },
            createdAt: now,
        });

        this.logger.log(`Timer stopped successfully for step instance ${stepInstanceId}`);

        // 7. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Pause a running timer
     */
    async pauseTimer(stepInstanceId: string): Promise<TimerState> {
        const now = new Date();

        this.logger.log(`Pausing timer for step instance ${stepInstanceId}`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Validate timer can be paused
        if (stepInstance.timerStatus !== 'RUNNING') {
            throw new BadRequestException(`Cannot pause timer with status: ${stepInstance.timerStatus}`);
        }

        // 3. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: 'PAUSED',
                metadata: {
                    ...stepInstance.metadata as any,
                    lastPausedAt: now.toISOString(),
                },
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 4. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'PAUSE',
            previousStatus: 'RUNNING',
            newStatus: 'PAUSED',
            createdAt: now,
        });

        this.logger.log(`Timer paused successfully for step instance ${stepInstanceId}`);

        // 5. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Resume a paused timer
     */
    async resumeTimer(stepInstanceId: string): Promise<TimerState> {
        const now = new Date();

        this.logger.log(`Resuming timer for step instance ${stepInstanceId}`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Validate timer can be resumed
        if (stepInstance.timerStatus !== 'PAUSED') {
            throw new BadRequestException(`Cannot resume timer with status: ${stepInstance.timerStatus}`);
        }

        // 3. Calculate paused duration
        const metadata = stepInstance.metadata as any;
        const lastPausedAt = metadata?.lastPausedAt ? new Date(metadata.lastPausedAt) : null;
        let pausedDuration = 0;

        if (lastPausedAt) {
            pausedDuration = now.getTime() - lastPausedAt.getTime();
        }

        // 4. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: 'RUNNING',
                totalPausedDurationMs: (stepInstance.totalPausedDurationMs || 0) + pausedDuration,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 5. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'RESUME',
            previousStatus: 'PAUSED',
            newStatus: 'RUNNING',
            metadata: {
                pausedDurationMs: pausedDuration,
            },
            createdAt: now,
        });

        this.logger.log(`Timer resumed successfully for step instance ${stepInstanceId}`);

        // 6. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Extend a timer's duration
     */
    async extendTimer(stepInstanceId: string, extensionHours: number): Promise<TimerState> {
        const now = new Date();
        const extensionMs = extensionHours * 60 * 60 * 1000;

        this.logger.log(`Extending timer for step instance ${stepInstanceId} by ${extensionHours} hours`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Validate timer can be extended
        if (!['RUNNING', 'PAUSED', 'OVERDUE'].includes(stepInstance.timerStatus)) {
            throw new BadRequestException(`Cannot extend timer with status: ${stepInstance.timerStatus}`);
        }

        // 3. Calculate new end time
        let newEndTime: Date | null = null;
        if (stepInstance.customDeadline) {
            newEndTime = new Date(stepInstance.customDeadline.getTime() + extensionMs);
        }

        // 4. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                extensionDurationMs: (stepInstance.extensionDurationMs || 0) + extensionMs,
                allocatedTimeMs: stepInstance.allocatedTimeMs
                    ? stepInstance.allocatedTimeMs + extensionMs
                    : null,
                customDeadline: newEndTime,
                timerStatus: stepInstance.timerStatus === 'OVERDUE' ? 'RUNNING' : stepInstance.timerStatus,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 5. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'EXTEND',
            durationChangeMs: extensionMs,
            metadata: {
                extensionHours,
                totalExtensionMs: (stepInstance.extensionDurationMs || 0) + extensionMs,
            },
            createdAt: now,
        });

        this.logger.log(`Timer extended successfully for step instance ${stepInstanceId}`);

        // 6. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Cancel a timer
     */
    async cancelTimer(stepInstanceId: string): Promise<TimerState> {
        const now = new Date();

        this.logger.log(`Cancelling timer for step instance ${stepInstanceId}`);

        // 1. Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // 2. Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: 'CANCELLED',
                status: 'ON_HOLD',
                actualEndAt: now,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // 3. Create timer event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id,
            eventType: 'CANCEL',
            previousStatus: stepInstance.timerStatus,
            newStatus: 'CANCELLED',
            createdAt: now,
        });

        this.logger.log(`Timer cancelled successfully for step instance ${stepInstanceId}`);

        // 4. Return current timer state
        return this.calculateTimerState(stepInstanceId);
    }

    /**
     * Calculate current timer state (existing method with enhancements)
     */
    async calculateTimerState(stepInstanceId: string): Promise<TimerState> {
        // Get step instance with full data
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        const now = new Date();
        const timerConfig = stepInstance.timerConfig as any;

        // Base state
        let state: TimerState = {
            stepInstanceId,
            status: stepInstance.status as any,
            timerStatus: stepInstance.timerStatus as any,
            colorIndicator: 'GREY',
            totalAllocatedMs: stepInstance.allocatedTimeMs,
            elapsedMs: null,
            remainingMs: null,
            pausedDurationMs: stepInstance.totalPausedDurationMs || 0,
            extensionDurationMs: stepInstance.extensionDurationMs || 0,
            startedAt: stepInstance.actualStartAt,
            scheduledEndAt: stepInstance.customDeadline,
            actualEndAt: stepInstance.actualEndAt,
            percentageComplete: 0,
            percentageOverdue: 0,
            displayText: 'Not started',
            isOverdue: false,
            isNegativeCountdown: timerConfig.type === 'NEGATIVE_COUNTDOWN',
            stepKey: stepInstance.stepKey,
            stepName: stepInstance.stepName,
            stepOrder: stepInstance.stepOrder,
            assignedRole: stepInstance.assignedRole,
        };

        // Handle NO_TIMER type
        if (timerConfig.type === 'NO_TIMER') {
            state.displayText = 'N/A';
            return state;
        }

        // Handle NOT_STARTED
        if (stepInstance.timerStatus === 'NOT_STARTED') {
            return state;
        }

        // Handle COMPLETED, SKIPPED, CANCELLED
        if (['COMPLETED', 'SKIPPED', 'CANCELLED'].includes(stepInstance.timerStatus)) {
            state.colorIndicator = 'GREY';
            state.displayText = stepInstance.timerStatus;
            state.elapsedMs = stepInstance.actualTimeMs;
            state.remainingMs = stepInstance.remainingTimeMs;
            state.percentageComplete = 100;

            if (stepInstance.remainingTimeMs && stepInstance.remainingTimeMs < 0) {
                state.isOverdue = true;
                state.percentageOverdue = stepInstance.allocatedTimeMs
                    ? Math.abs(stepInstance.remainingTimeMs) / stepInstance.allocatedTimeMs * 100
                    : 0;
            }

            return state;
        }

        // Calculate based on timer type
        switch (timerConfig.type) {
            case 'FIXED_DURATION':
                if (timerConfig.isBusinessDaysOnly) {
                    state = await this.calculateBusinessHoursTimer(stepInstance, timerConfig, now);
                } else {
                    state = this.calculateFixedDurationTimer(stepInstance, timerConfig, now);
                }
                break;

            case 'DEADLINE_BASED':
                state = this.calculateDeadlineBasedTimer(stepInstance, timerConfig, now);
                break;

            case 'NEGATIVE_COUNTDOWN':
                state = this.calculateNegativeCountdownTimer(stepInstance, timerConfig, now);
                break;

            case 'DYNAMIC':
                state = this.calculateDynamicTimer(stepInstance, timerConfig, now);
                break;
        }

        // Determine color indicator
        state.colorIndicator = this.determineColorIndicator(
            state.percentageComplete,
            state.isOverdue,
            timerConfig.warningThreshold || 80,
            timerConfig.criticalThreshold || 100
        );

        return state;
    }

    /**
     * Calculate FIXED_DURATION timer (business hours)
     */
    private async calculateBusinessHoursTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): Promise<TimerState> {
        const startTime = stepInstance.actualStartAt;
        if (!startTime) {
            throw new Error('Start time not set for business hours timer');
        }

        const baseDurationMs = (timerConfig.durationHours || 0) * 60 * 60 * 1000;
        const extensionMs = stepInstance.extensionDurationMs || 0;
        const totalDurationMs = baseDurationMs + extensionMs;

        // Calculate business hours elapsed
        const elapsedMs = await this.businessCalendar.calculateBusinessHours(startTime, now) * 60 * 60 * 1000;

        // Calculate scheduled end time
        const scheduledEndAt = await this.businessCalendar.addBusinessHours(startTime, totalDurationMs);

        const remainingMs = totalDurationMs - elapsedMs;
        const isOverdue = remainingMs < 0;
        const percentageComplete = Math.min((elapsedMs / totalDurationMs) * 100, 100);
        const percentageOverdue = isOverdue ? ((Math.abs(remainingMs) / totalDurationMs) * 100) : 0;

        return {
            ...this.getBaseTimerState(stepInstance),
            totalAllocatedMs: totalDurationMs,
            elapsedMs,
            remainingMs,
            scheduledEndAt,
            percentageComplete,
            percentageOverdue,
            displayText: this.formatTimerDisplay(remainingMs, isOverdue),
            isOverdue,
        };
    }

    /**
     * Calculate FIXED_DURATION timer (calendar time)
     */
    private calculateFixedDurationTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): TimerState {
        const startTime = stepInstance.actualStartAt;
        if (!startTime) {
            throw new Error('Start time not set for fixed duration timer');
        }

        const baseDurationMs = (timerConfig.durationHours || 0) * 60 * 60 * 1000;
        const extensionMs = stepInstance.extensionDurationMs || 0;
        const totalDurationMs = baseDurationMs + extensionMs;

        const elapsedMs = now.getTime() - startTime.getTime() - (stepInstance.totalPausedDurationMs || 0);
        const scheduledEndAt = new Date(startTime.getTime() + totalDurationMs);
        const remainingMs = totalDurationMs - elapsedMs;
        const isOverdue = remainingMs < 0;
        const percentageComplete = Math.min((elapsedMs / totalDurationMs) * 100, 100);
        const percentageOverdue = isOverdue ? ((Math.abs(remainingMs) / totalDurationMs) * 100) : 0;

        return {
            ...this.getBaseTimerState(stepInstance),
            totalAllocatedMs: totalDurationMs,
            elapsedMs,
            remainingMs,
            scheduledEndAt,
            percentageComplete,
            percentageOverdue,
            displayText: this.formatTimerDisplay(remainingMs, isOverdue),
            isOverdue,
        };
    }

    /**
     * Calculate DEADLINE_BASED timer
     */
    private calculateDeadlineBasedTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): TimerState {
        const deadline = stepInstance.customDeadline;
        const startTime = stepInstance.actualStartAt;

        if (!deadline) {
            throw new Error('Deadline not set for deadline-based timer');
        }

        if (!startTime) {
            throw new Error('Start time not set for deadline-based timer');
        }

        const totalDurationMs = deadline.getTime() - startTime.getTime();
        const elapsedMs = now.getTime() - startTime.getTime();
        const remainingMs = deadline.getTime() - now.getTime();
        const isOverdue = remainingMs < 0;
        const percentageComplete = Math.min((elapsedMs / totalDurationMs) * 100, 100);
        const percentageOverdue = isOverdue ? ((Math.abs(remainingMs) / totalDurationMs) * 100) : 0;

        return {
            ...this.getBaseTimerState(stepInstance),
            totalAllocatedMs: totalDurationMs,
            elapsedMs,
            remainingMs,
            scheduledEndAt: deadline,
            percentageComplete,
            percentageOverdue,
            displayText: this.formatTimerDisplay(remainingMs, isOverdue),
            isOverdue,
        };
    }

    /**
     * Calculate NEGATIVE_COUNTDOWN timer
     */
    private calculateNegativeCountdownTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): TimerState {
        const deadline = stepInstance.customDeadline;
        const hoursBeforeDeadline = timerConfig.hoursBeforeDeadline || -72;

        if (!deadline) {
            throw new Error('Deadline not set for negative countdown timer');
        }

        // Calculate trigger point (when timer becomes critical)
        const triggerPoint = new Date(deadline.getTime() + (hoursBeforeDeadline * 60 * 60 * 1000));
        const remainingMs = deadline.getTime() - now.getTime();
        const timeUntilTriggerMs = triggerPoint.getTime() - now.getTime();

        const isInCriticalZone = now >= triggerPoint;
        const isOverdue = now >= deadline;

        let displayText: string;
        let percentageComplete: number;

        if (isOverdue) {
            displayText = `Overdue by ${this.formatDuration(Math.abs(remainingMs))}`;
            percentageComplete = 100;
        } else if (isInCriticalZone) {
            displayText = `${this.formatDuration(remainingMs)} until deadline (CRITICAL)`;
            const criticalDuration = Math.abs(hoursBeforeDeadline * 60 * 60 * 1000);
            const timeSinceTrigger = now.getTime() - triggerPoint.getTime();
            percentageComplete = Math.min((timeSinceTrigger / criticalDuration) * 100, 100);
        } else {
            displayText = `${this.formatDuration(timeUntilTriggerMs)} until critical zone`;
            percentageComplete = 0;
        }

        return {
            ...this.getBaseTimerState(stepInstance),
            totalAllocatedMs: Math.abs(hoursBeforeDeadline * 60 * 60 * 1000),
            elapsedMs: null,
            remainingMs,
            scheduledEndAt: deadline,
            percentageComplete,
            percentageOverdue: isOverdue ? 100 : 0,
            displayText,
            isOverdue,
            isNegativeCountdown: true,
        };
    }

    /**
     * Calculate DYNAMIC timer
     */
    private calculateDynamicTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): TimerState {
        // For dynamic timers, we use the customDurationHours if available
        if (!stepInstance.allocatedTimeMs) {
            return {
                ...this.getBaseTimerState(stepInstance),
                displayText: 'Waiting for duration input',
            };
        }

        // Calculate similar to FIXED_DURATION
        return this.calculateFixedDurationTimer(stepInstance, timerConfig, now);
    }

    /**
     * Get base timer state from step instance
     */
    private getBaseTimerState(stepInstance: any): TimerState {
        return {
            stepInstanceId: stepInstance.id.toString(),
            status: stepInstance.status,
            timerStatus: stepInstance.timerStatus,
            colorIndicator: 'GREY',
            totalAllocatedMs: stepInstance.allocatedTimeMs,
            elapsedMs: null,
            remainingMs: null,
            pausedDurationMs: stepInstance.totalPausedDurationMs || 0,
            extensionDurationMs: stepInstance.extensionDurationMs || 0,
            startedAt: stepInstance.actualStartAt,
            scheduledEndAt: stepInstance.customDeadline,
            actualEndAt: stepInstance.actualEndAt,
            percentageComplete: 0,
            percentageOverdue: 0,
            displayText: '',
            isOverdue: false,
            isNegativeCountdown: stepInstance.timerConfig.type === 'NEGATIVE_COUNTDOWN',
            stepKey: stepInstance.stepKey,
            stepName: stepInstance.stepName,
            stepOrder: stepInstance.stepOrder,
            assignedRole: stepInstance.assignedRole,
        };
    }

    /**
     * Determine color indicator based on progress
     */
    private determineColorIndicator(
        percentageComplete: number,
        isOverdue: boolean,
        warningThreshold: number,
        criticalThreshold: number
    ): 'GREEN' | 'YELLOW' | 'RED' | 'GREY' {
        if (isOverdue) return 'RED';
        if (percentageComplete >= criticalThreshold) return 'RED';
        if (percentageComplete >= warningThreshold) return 'YELLOW';
        return 'GREEN';
    }

    /**
     * Format timer display text
     */
    private formatTimerDisplay(remainingMs: number, isOverdue: boolean): string {
        const absMs = Math.abs(remainingMs);
        const duration = this.formatDuration(absMs);

        if (isOverdue) {
            return `${duration} overdue`;
        } else {
            return `${duration} remaining`;
        }
    }

    /**
     * Format duration in human-readable format
     */
    formatDuration(ms: number): string {
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

        return parts.join(' ');
    }
}
