import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@db';
import { stepInstances, timerEvents } from '@db/schemas/workflow/workflows.schema';
import { BusinessCalendarService } from '@/modules/timers/services/business-calendar.service';

export interface TimerState {
    stepInstanceId: string;

    // Status
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'REJECTED' | 'ON_HOLD';
    timerStatus: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE' | 'SKIPPED' | 'CANCELLED';

    // Color indicator
    colorIndicator: 'GREEN' | 'YELLOW' | 'RED' | 'GREY';

    // Time calculations
    totalAllocatedMs: number | null;
    elapsedMs: number | null;
    remainingMs: number | null;
    pausedDurationMs: number;
    extensionDurationMs: number;

    // Dates
    startedAt: Date | null;
    scheduledEndAt: Date | null;
    actualEndAt: Date | null;

    // Percentages
    percentageComplete: number;
    percentageOverdue: number;

    // Display
    displayText: string;
    isOverdue: boolean;
    isNegativeCountdown: boolean;

    // Step info
    stepKey: string;
    stepName: string;
    stepOrder: number;
    assignedRole: string | null;
}

@Injectable()
export class TimerEngineService {
    private readonly logger = new Logger(TimerEngineService.name);

    constructor(
        @Inject('DATABASE_CONNECTION')
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly businessCalendar: BusinessCalendarService,
    ) { }

    /**
     * Calculate current timer state for a step instance
     */
    async calculateTimerState(stepInstanceId: string): Promise<TimerState> {
        // Load step instance with full data
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new Error(`Step instance ${stepInstanceId} not found`);
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
            scheduledEndAt: null,
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
                state = await this.calculateFixedDurationTimer(stepInstance, timerConfig, now);
                break;

            case 'DEADLINE_BASED':
                state = await this.calculateDeadlineBasedTimer(stepInstance, timerConfig, now);
                break;

            case 'NEGATIVE_COUNTDOWN':
                state = await this.calculateNegativeCountdownTimer(stepInstance, timerConfig, now);
                break;

            case 'DYNAMIC':
                state = await this.calculateDynamicTimer(stepInstance, timerConfig, now);
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
     * Calculate FIXED_DURATION timer (e.g., 72h, 24h, 48h)
     */
    private async calculateFixedDurationTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): Promise<TimerState> {
        const startTime = stepInstance.actualStartAt;
        if (!startTime) {
            throw new Error('Start time not set for fixed duration timer');
        }

        const baseDurationMs = (timerConfig.durationHours || 0) * 60 * 60 * 1000;
        const extensionMs = stepInstance.extensionDurationMs || 0;
        const totalDurationMs = baseDurationMs + extensionMs;

        let elapsedMs: number;
        let scheduledEndAt: Date;

        if (timerConfig.isBusinessDaysOnly) {
            // Calculate business hours
            elapsedMs = await this.businessCalendar.calculateBusinessHours(startTime, now);
            scheduledEndAt = await this.businessCalendar.addBusinessHours(startTime, totalDurationMs);
        } else {
            // Calendar time
            elapsedMs = now.getTime() - startTime.getTime() - (stepInstance.totalPausedDurationMs || 0);
            scheduledEndAt = new Date(startTime.getTime() + totalDurationMs);
        }

        const remainingMs = totalDurationMs - elapsedMs;
        const isOverdue = remainingMs < 0;
        const percentageComplete = Math.min((elapsedMs / totalDurationMs) * 100, 100);
        const percentageOverdue = isOverdue ? ((Math.abs(remainingMs) / totalDurationMs) * 100) : 0;

        return {
            stepInstanceId: stepInstance.id,
            status: stepInstance.status,
            timerStatus: isOverdue ? 'OVERDUE' : (stepInstance.timerStatus === 'PAUSED' ? 'PAUSED' : 'RUNNING'),
            colorIndicator: 'GREEN',
            totalAllocatedMs: totalDurationMs,
            elapsedMs,
            remainingMs,
            pausedDurationMs: stepInstance.totalPausedDurationMs || 0,
            extensionDurationMs: stepInstance.extensionDurationMs || 0,
            startedAt: startTime,
            scheduledEndAt,
            actualEndAt: stepInstance.actualEndAt,
            percentageComplete,
            percentageOverdue,
            displayText: this.formatTimerDisplay(remainingMs, isOverdue),
            isOverdue,
            isNegativeCountdown: false,
            stepKey: stepInstance.stepKey,
            stepName: stepInstance.stepName,
            stepOrder: stepInstance.stepOrder,
            assignedRole: stepInstance.assignedRole,
        };
    }

    /**
     * Calculate DEADLINE_BASED timer (countdown to specific date)
     */
    private async calculateDeadlineBasedTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): Promise<TimerState> {
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
            stepInstanceId: stepInstance.id,
            status: stepInstance.status,
            timerStatus: isOverdue ? 'OVERDUE' : 'RUNNING',
            colorIndicator: 'GREEN',
            totalAllocatedMs: totalDurationMs,
            elapsedMs,
            remainingMs,
            pausedDurationMs: 0,
            extensionDurationMs: 0,
            startedAt: startTime,
            scheduledEndAt: deadline,
            actualEndAt: stepInstance.actualEndAt,
            percentageComplete,
            percentageOverdue,
            displayText: this.formatTimerDisplay(remainingMs, isOverdue),
            isOverdue,
            isNegativeCountdown: false,
            stepKey: stepInstance.stepKey,
            stepName: stepInstance.stepName,
            stepOrder: stepInstance.stepOrder,
            assignedRole: stepInstance.assignedRole,
        };
    }

    /**
     * Calculate NEGATIVE_COUNTDOWN timer (-72h, -48h, -24h before deadline)
     */
    private async calculateNegativeCountdownTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): Promise<TimerState> {
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
            stepInstanceId: stepInstance.id,
            status: stepInstance.status,
            timerStatus: isOverdue ? 'OVERDUE' : (isInCriticalZone ? 'RUNNING' : 'RUNNING'),
            colorIndicator: 'GREEN',
            totalAllocatedMs: Math.abs(hoursBeforeDeadline * 60 * 60 * 1000),
            elapsedMs: null,
            remainingMs,
            pausedDurationMs: 0,
            extensionDurationMs: 0,
            startedAt: stepInstance.actualStartAt,
            scheduledEndAt: deadline,
            actualEndAt: stepInstance.actualEndAt,
            percentageComplete,
            percentageOverdue: isOverdue ? 100 : 0,
            displayText,
            isOverdue,
            isNegativeCountdown: true,
            stepKey: stepInstance.stepKey,
            stepName: stepInstance.stepName,
            stepOrder: stepInstance.stepOrder,
            assignedRole: stepInstance.assignedRole,
        };
    }

    /**
     * Calculate DYNAMIC timer (user-defined duration)
     */
    private async calculateDynamicTimer(
        stepInstance: any,
        timerConfig: any,
        now: Date
    ): Promise<TimerState> {
        const customDuration = stepInstance.customDurationHours;

        if (!customDuration) {
            return {
                stepInstanceId: stepInstance.id,
                status: stepInstance.status,
                timerStatus: 'NOT_STARTED',
                colorIndicator: 'GREY',
                totalAllocatedMs: null,
                elapsedMs: null,
                remainingMs: null,
                pausedDurationMs: 0,
                extensionDurationMs: 0,
                startedAt: null,
                scheduledEndAt: null,
                actualEndAt: null,
                percentageComplete: 0,
                percentageOverdue: 0,
                displayText: 'Waiting for duration input',
                isOverdue: false,
                isNegativeCountdown: false,
                stepKey: stepInstance.stepKey,
                stepName: stepInstance.stepName,
                stepOrder: stepInstance.stepOrder,
                assignedRole: stepInstance.assignedRole,
            };
        }

        // Calculate similar to FIXED_DURATION
        return this.calculateFixedDurationTimer(
            stepInstance,
            { ...timerConfig, durationHours: customDuration },
            now
        );
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
