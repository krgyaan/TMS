import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import { timerTrackers, timerEvents } from '@db/schemas/workflow/timer.schema';
import { StartTimerInput, TimerActionInput, ExtendTimerInput, TimerWithComputed, hoursToMs } from './timer.types';
import type { TimerTracker, TimerEvent } from '@db/schemas/workflow/timer.schema';
import type { DbInstance } from '@/db';

@Injectable()
export class TimersService {
    private readonly logger = new Logger(TimersService.name);

    constructor(@Inject(DRIZZLE) private db: DbInstance) { }

    async startTimer(input: StartTimerInput): Promise<TimerWithComputed> {
        const { entityId, entityType, stage } = input;

        // Check existing
        const existing = await this.findTimer(entityType, entityId, stage);

        if (existing?.status === 'running') {
            throw new ConflictException('Timer already running');
        }
        if (existing?.status === 'paused') {
            throw new ConflictException('Timer is paused. Use resumeTimer instead');
        }

        // Calculate allocated time
        const allocatedTimeMs = this.calculateAllocatedTime(input);
        if (allocatedTimeMs <= 0) {
            throw new BadRequestException('Allocated time must be greater than 0');
        }

        const now = new Date();
        const deadline = input.deadlineAt || new Date(now.getTime() + allocatedTimeMs);

        // Prepare metadata with optional fields
        const metadata: Record<string, any> = {
            ...(input.metadata ?? {}),
            timerType: input.timerConfig?.type || 'FIXED_DURATION',
            assignedRole: input.assignedRole,
            workflowCode: input.workflowCode,
            stepOrder: input.stepOrder,
            warningThreshold: input.timerConfig?.warningThreshold ?? 80,
            criticalThreshold: input.timerConfig?.criticalThreshold ?? 100,
        };

        // Merge with existing metadata if timer exists
        const existingMetadata = (existing?.metadata ?? {}) as Record<string, any>;
        const mergedMetadata: Record<string, any> = existing
            ? {
                ...existingMetadata,
                ...metadata,
                timerType: input.timerConfig?.type || existingMetadata.timerType || 'FIXED_DURATION',
                assignedRole: input.assignedRole ?? existingMetadata.assignedRole,
                workflowCode: input.workflowCode ?? existingMetadata.workflowCode,
                stepOrder: input.stepOrder ?? existingMetadata.stepOrder,
                warningThreshold: input.timerConfig?.warningThreshold ?? existingMetadata.warningThreshold ?? 80,
                criticalThreshold: input.timerConfig?.criticalThreshold ?? existingMetadata.criticalThreshold ?? 100,
            }
            : metadata;

        // Upsert timer
        const [timer] = await this.db
            .insert(timerTrackers)
            .values({
                entityType,
                entityId,
                stage,
                status: 'running',
                allocatedTimeMs,
                startedAt: now,
                deadlineAt: deadline,
                assignedUserId: input.assignedUserId,
                totalPausedDurationMs: 0,
                totalExtensionMs: 0,
                createdByUserId: input.userId,
                metadata,
            })
            .onConflictDoUpdate({
                target: [timerTrackers.entityType, timerTrackers.entityId, timerTrackers.stage],
                set: {
                    status: 'running',
                    allocatedTimeMs,
                    startedAt: now,
                    deadlineAt: deadline,
                    endedAt: null,
                    pausedAt: null,
                    totalPausedDurationMs: 0,
                    totalExtensionMs: 0,
                    assignedUserId: input.assignedUserId,
                    metadata: mergedMetadata,
                    updatedAt: now,
                },
            })
            .returning();

        // Log event
        await this.logEvent(timer.id, 'started', existing?.status, 'running', input.userId);

        return this.computeTimer(timer);
    }

    async stopTimer(input: TimerActionInput): Promise<TimerWithComputed> {
        const timer = await this.getTimerOrThrow(input.entityType, input.entityId, input.stage);

        if (timer.status === 'completed') {
            throw new ConflictException('Timer already completed');
        }
        if (timer.status === 'cancelled') {
            throw new ConflictException('Timer was cancelled');
        }

        const now = new Date();
        let totalPaused = timer.totalPausedDurationMs;

        // Add final pause duration if paused
        if (timer.status === 'paused' && timer.pausedAt) {
            totalPaused += now.getTime() - new Date(timer.pausedAt).getTime();
        }

        const [updated] = await this.db
            .update(timerTrackers)
            .set({
                status: 'completed',
                endedAt: now,
                pausedAt: null,
                totalPausedDurationMs: totalPaused,
                updatedAt: now,
            })
            .where(eq(timerTrackers.id, timer.id))
            .returning();

        await this.logEvent(timer.id, 'stopped', timer.status, 'completed', input.userId, input.reason);

        return this.computeTimer(updated);
    }

    async pauseTimer(input: TimerActionInput): Promise<TimerWithComputed> {
        const timer = await this.getTimerOrThrow(input.entityType, input.entityId, input.stage);

        if (timer.status !== 'running') {
            throw new ConflictException(`Cannot pause timer with status: ${timer.status}`);
        }

        const now = new Date();

        const [updated] = await this.db
            .update(timerTrackers)
            .set({
                status: 'paused',
                pausedAt: now,
                updatedAt: now,
            })
            .where(eq(timerTrackers.id, timer.id))
            .returning();

        await this.logEvent(timer.id, 'paused', 'running', 'paused', input.userId, input.reason);

        return this.computeTimer(updated);
    }

    async resumeTimer(input: TimerActionInput): Promise<TimerWithComputed> {
        const timer = await this.getTimerOrThrow(input.entityType, input.entityId, input.stage);

        if (timer.status !== 'paused') {
            throw new ConflictException(`Cannot resume timer with status: ${timer.status}`);
        }

        if (!timer.pausedAt) {
            throw new BadRequestException('Timer pausedAt is not set');
        }

        const now = new Date();
        const pauseDuration = now.getTime() - new Date(timer.pausedAt).getTime();
        const newTotalPaused = timer.totalPausedDurationMs + pauseDuration;

        // Extend deadline by pause duration
        const newDeadline = timer.deadlineAt
            ? new Date(new Date(timer.deadlineAt).getTime() + pauseDuration)
            : null;

        const [updated] = await this.db
            .update(timerTrackers)
            .set({
                status: 'running',
                pausedAt: null,
                totalPausedDurationMs: newTotalPaused,
                deadlineAt: newDeadline,
                updatedAt: now,
            })
            .where(eq(timerTrackers.id, timer.id))
            .returning();

        await this.logEvent(timer.id, 'resumed', 'paused', 'running', input.userId, input.reason, pauseDuration);

        return this.computeTimer(updated);
    }

    async cancelTimer(input: TimerActionInput): Promise<TimerWithComputed> {
        const timer = await this.getTimerOrThrow(input.entityType, input.entityId, input.stage);

        if (['completed', 'cancelled'].includes(timer.status)) {
            throw new ConflictException(`Cannot cancel timer with status: ${timer.status}`);
        }

        const now = new Date();

        const [updated] = await this.db
            .update(timerTrackers)
            .set({
                status: 'cancelled',
                endedAt: now,
                pausedAt: null,
                updatedAt: now,
            })
            .where(eq(timerTrackers.id, timer.id))
            .returning();

        await this.logEvent(timer.id, 'cancelled', timer.status, 'cancelled', input.userId, input.reason || 'Cancelled');

        return this.computeTimer(updated);
    }

    async extendTimer(input: ExtendTimerInput): Promise<TimerWithComputed> {
        const timer = await this.getTimerOrThrow(input.entityType, input.entityId, input.stage);

        if (['completed', 'cancelled'].includes(timer.status)) {
            throw new ConflictException(`Cannot extend timer with status: ${timer.status}`);
        }

        if (input.extensionMs <= 0) {
            throw new BadRequestException('Extension time must be greater than 0');
        }

        const newTotalExtension = timer.totalExtensionMs + input.extensionMs;
        const newDeadline = timer.deadlineAt
            ? new Date(new Date(timer.deadlineAt).getTime() + input.extensionMs)
            : null;

        const [updated] = await this.db
            .update(timerTrackers)
            .set({
                totalExtensionMs: newTotalExtension,
                deadlineAt: newDeadline,
                updatedAt: new Date(),
            })
            .where(eq(timerTrackers.id, timer.id))
            .returning();

        await this.logEvent(timer.id, 'extended', timer.status, timer.status, input.userId, input.reason, input.extensionMs);

        return this.computeTimer(updated);
    }

    async getTimer(entityType: string, entityId: number, stage?: string): Promise<TimerWithComputed | null> {
        const timer = await this.findTimer(entityType, entityId, stage);
        return timer ? this.computeTimer(timer) : null;
    }

    async getTimers(entityType: string, entityId: number): Promise<TimerWithComputed[]> {
        const timers = await this.db
            .select()
            .from(timerTrackers)
            .where(and(
                eq(timerTrackers.entityType, entityType),
                eq(timerTrackers.entityId, entityId),
            ))
            .orderBy(timerTrackers.createdAt);

        return timers.map(t => this.computeTimer(t));
    }

    async getActiveTimers(entityType: string, entityId: number): Promise<TimerWithComputed[]> {
        const timers = await this.db
            .select()
            .from(timerTrackers)
            .where(and(
                eq(timerTrackers.entityType, entityType),
                eq(timerTrackers.entityId, entityId),
                sql`${timerTrackers.status} IN ('running', 'paused')`,
            ))
            .orderBy(timerTrackers.createdAt);

        return timers.map(t => this.computeTimer(t));
    }

    async getTimerEvents(entityType: string, entityId: number, stage: string) {
        const timer = await this.findTimer(entityType, entityId, stage);
        if (!timer) {
            throw new NotFoundException('Timer not found');
        }

        return this.db
            .select()
            .from(timerEvents)
            .where(eq(timerEvents.trackerId, timer.id))
            .orderBy(timerEvents.createdAt);
    }

    private async findTimer(entityType: string, entityId: number, stage?: string): Promise<TimerTracker | null> {
        const conditions = [
            eq(timerTrackers.entityType, entityType),
            eq(timerTrackers.entityId, entityId),
        ];

        if (stage) {
            conditions.push(eq(timerTrackers.stage, stage));
        }

        const [timer] = await this.db
            .select()
            .from(timerTrackers)
            .where(and(...conditions))
            .limit(1);

        return timer || null;
    }

    private async getTimerOrThrow(entityType: string, entityId: number, stage?: string): Promise<TimerTracker> {
        const timer = await this.findTimer(entityType, entityId, stage);
        if (!timer) {
            throw new NotFoundException(`Timer not found for ${entityType}:${entityId}${stage ? `:${stage}` : ''}`);
        }
        return timer;
    }

    private calculateAllocatedTime(input: StartTimerInput): number {
        // Priority 1: Explicit allocatedTimeMs
        if (input.allocatedTimeMs && input.allocatedTimeMs > 0) {
            return input.allocatedTimeMs;
        }

        // Priority 2: Timer config
        if (input.timerConfig) {
            const { type, durationHours, hoursBeforeDeadline } = input.timerConfig;

            switch (type) {
                case 'FIXED_DURATION':
                    return hoursToMs(durationHours ?? 24);

                case 'DEADLINE_BASED':
                    if (input.deadlineAt) {
                        return new Date(input.deadlineAt).getTime() - Date.now();
                    }
                    break;

                case 'NEGATIVE_COUNTDOWN':
                    if (input.deadlineAt && hoursBeforeDeadline) {
                        const targetTime = new Date(input.deadlineAt).getTime() + hoursToMs(hoursBeforeDeadline);
                        return targetTime - Date.now();
                    }
                    break;

                case 'NO_TIMER':
                    return 0;
            }
        }

        // Default: 24 hours
        return hoursToMs(24);
    }

    private async logEvent(
        trackerId: number,
        eventType: string,
        previousStatus: string | undefined,
        newStatus: string,
        userId?: number,
        reason?: string,
        durationChangeMs?: number,
    ) {
        await this.db.insert(timerEvents).values({
            trackerId,
            eventType,
            previousStatus: previousStatus as any,
            newStatus: newStatus as any,
            performedByUserId: userId,
            reason,
            durationChangeMs,
            snapshot: { timestamp: new Date().toISOString() },
        });
    }

    private computeTimer(timer: TimerTracker): TimerWithComputed {
        const now = Date.now();
        const effectiveAllocatedTimeMs = timer.allocatedTimeMs + timer.totalExtensionMs;

        let elapsedTimeMs = 0;
        let remainingTimeMs = effectiveAllocatedTimeMs;
        let currentPauseDurationMs = 0;

        if (timer.status === 'paused' && timer.pausedAt) {
            currentPauseDurationMs = now - new Date(timer.pausedAt).getTime();
        }

        if (timer.startedAt) {
            elapsedTimeMs = now - new Date(timer.startedAt).getTime()
                - timer.totalPausedDurationMs
                - currentPauseDurationMs;
        }

        // Calculate remaining time
        if (timer.status === 'completed' || timer.status === 'cancelled') {
            if (timer.endedAt && timer.startedAt) {
                elapsedTimeMs = new Date(timer.endedAt).getTime()
                    - new Date(timer.startedAt).getTime()
                    - timer.totalPausedDurationMs;
            }
            // Calculate actual remaining time at completion (can be positive or negative)
            if (timer.deadlineAt && timer.endedAt) {
                // Use deadlineAt to get exact remaining time at completion
                const deadlineMs = new Date(timer.deadlineAt).getTime();
                const endedMs = new Date(timer.endedAt).getTime();
                const diffMs = deadlineMs - endedMs;

                // If deadlineAt equals endedAt (or very close, within 1 second), it might have been set during migration
                // In that case, fall back to calculating from allocated time
                if (Math.abs(diffMs) < 1000 && timer.startedAt) {
                    // Fallback: calculate from allocated time
                    const startedMs = new Date(timer.startedAt).getTime();
                    const actualElapsedMs = endedMs - startedMs - timer.totalPausedDurationMs;
                    remainingTimeMs = effectiveAllocatedTimeMs - actualElapsedMs;

                    // this.logger.debug(`Completed timer ${timer.id}: deadlineAt equals endedAt, using fallback calculation. remainingTimeMs=${remainingTimeMs}`);
                } else {
                    remainingTimeMs = diffMs;
                    // this.logger.debug(`Completed timer ${timer.id}: deadlineAt=${timer.deadlineAt}, endedAt=${timer.endedAt}, remainingTimeMs=${remainingTimeMs}`);
                }
            } else if (timer.endedAt && timer.startedAt) {
                // Fallback: calculate from allocated time
                const endedMs = new Date(timer.endedAt).getTime();
                const startedMs = new Date(timer.startedAt).getTime();
                const actualElapsedMs = endedMs - startedMs - timer.totalPausedDurationMs;
                remainingTimeMs = effectiveAllocatedTimeMs - actualElapsedMs;

                // Debug logging for fallback calculation
                // this.logger.debug(`Completed timer ${timer.id} (fallback): startedAt=${timer.startedAt}, endedAt=${timer.endedAt}, allocatedTimeMs=${effectiveAllocatedTimeMs}, elapsedMs=${actualElapsedMs}, remainingTimeMs=${remainingTimeMs}`);
            } else {
                remainingTimeMs = 0;
                // this.logger.debug(`Completed timer ${timer.id}: Missing deadlineAt or endedAt, setting remainingTimeMs=0`);
            }
        } else if (timer.deadlineAt && (timer.status === 'running' || timer.status === 'paused')) {
            // Use deadlineAt if available for running/paused timers
            // The deadlineAt already accounts for pauses (extended when paused)
            // If currently paused, add the current pause duration back
            const deadlineMs = new Date(timer.deadlineAt).getTime();
            remainingTimeMs = Math.max(0, deadlineMs - now + currentPauseDurationMs);
        } else if (timer.startedAt) {
            // Fallback to allocatedTimeMs calculation
            remainingTimeMs = Math.max(0, effectiveAllocatedTimeMs - elapsedTimeMs);
        }

        const progressPercent = effectiveAllocatedTimeMs > 0
            ? Math.min(100, Math.round((elapsedTimeMs / effectiveAllocatedTimeMs) * 100))
            : 0;

        // Extract fields from metadata with defaults
        const metadata = (timer.metadata ?? {}) as Record<string, any>;
        const warningThreshold = metadata.warningThreshold ?? 80;
        const criticalThreshold = metadata.criticalThreshold ?? 100;

        return {
            id: timer.id,
            entityType: timer.entityType,
            entityId: timer.entityId,
            stage: timer.stage,
            status: timer.status,
            timerType: metadata.timerType || 'FIXED_DURATION',
            allocatedTimeMs: timer.allocatedTimeMs,
            totalExtensionMs: timer.totalExtensionMs,
            totalPausedDurationMs: timer.totalPausedDurationMs,
            effectiveAllocatedTimeMs,
            remainingTimeMs,
            elapsedTimeMs,
            progressPercent,
            warningThreshold,
            criticalThreshold,
            isWarning: progressPercent >= warningThreshold && progressPercent < criticalThreshold,
            isCritical: progressPercent >= criticalThreshold,
            isOverdue: timer.status === 'running' && remainingTimeMs <= 0,
            startedAt: timer.startedAt,
            endedAt: timer.endedAt,
            pausedAt: timer.pausedAt,
            deadlineAt: timer.deadlineAt,
            assignedUserId: timer.assignedUserId,
            assignedRole: metadata.assignedRole ?? null,
            workflowCode: metadata.workflowCode ?? null,
            stepOrder: metadata.stepOrder ?? null,
            metadata: timer.metadata ?? {},
            createdAt: timer.createdAt,
            updatedAt: timer.updatedAt,
        };
    }
}
