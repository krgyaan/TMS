import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@db';
import { stepInstances, timerEvents } from '@db/schemas/workflow/workflows.schema';
import { TenderInfo, tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { TimerEngineService } from '@/modules/timers/services/timer-engine.service';
import { getWorkflow, getStepDefinition, WorkflowCode } from '@/config/timer.config';

interface StartWorkflowDto {
    workflowCode: WorkflowCode;
    entityType: 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION';
    entityId: string;
    metadata?: Record<string, any>;
}

interface StartStepDto {
    stepKey: string;
    assignedToUserId?: string;
    customDurationHours?: number;
    customDeadline?: Date;
}

interface CompleteStepDto {
    userId: string;
    completedAt?: Date;
    notes?: string;
}

interface PauseStepDto {
    userId: string;
    reason?: string;
}

interface ExtendStepDto {
    userId: string;
    extensionHours: number;
    reason: string;
}

interface RejectStepDto {
    userId: string;
    reason: string;
    shouldResetTimer: boolean;
}

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);

    constructor(
        @Inject('DATABASE_CONNECTION')
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly timerEngine: TimerEngineService,
    ) { }

    // ============================================
    // START WORKFLOW
    // ============================================

    /**
     * Start a complete workflow for an entity
     */
    async startWorkflow(dto: StartWorkflowDto): Promise<{ stepsStarted: number; firstStepId: string | null }> {
        this.logger.log(`Starting workflow ${dto.workflowCode} for ${dto.entityType} ${dto.entityId}`);

        // Get workflow definition
        const workflow = getWorkflow(dto.workflowCode);
        if (!workflow) {
            throw new BadRequestException(`Workflow ${dto.workflowCode} not found`);
        }

        // Verify workflow matches entity type
        if (workflow.entityType !== dto.entityType) {
            throw new BadRequestException(
                `Workflow ${dto.workflowCode} is for ${workflow.entityType}, not ${dto.entityType}`
            );
        }

        // Check if workflow already started for this entity
        const existing = await this.db
            .select({ id: stepInstances.id })
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, dto.entityType),
                    eq(stepInstances.entityId, parseInt(dto.entityId)),
                    eq(stepInstances.workflowCode, dto.workflowCode)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            throw new BadRequestException(`Workflow already started for this entity`);
        }

        // Get entity data for conditional logic
        const entityData = await this.getEntityData(dto.entityType, dto.entityId);

        // Find steps that can start immediately
        const stepsToStart = workflow.steps.filter(step => {
            // Check if has no dependencies
            const noDependencies = !step.dependsOn || step.dependsOn.length === 0;

            // Check conditional logic
            const meetsCondition = this.checkConditionalLogic(step, entityData, dto.metadata);

            return noDependencies && meetsCondition && !step.isOptional;
        });

        let firstStepId: string | null = null;

        // Create step instances for initial steps
        for (const step of stepsToStart) {
            const stepInstanceId = await this.createStepInstance({
                workflowCode: dto.workflowCode,
                entityType: dto.entityType,
                entityId: dto.entityId,
                stepDef: step,
                entityData,
                metadata: dto.metadata,
            });

            if (!firstStepId) {
                firstStepId = stepInstanceId;
            }

            // Auto-start if configured
            if (step.timerConfig.type !== 'NO_TIMER') {
                await this.startStep(stepInstanceId, { stepKey: step.stepKey });
            }
        }

        this.logger.log(`Started ${stepsToStart.length} initial steps for workflow ${dto.workflowCode}`);

        return {
            stepsStarted: stepsToStart.length,
            firstStepId,
        };
    }

    // ============================================
    // START STEP
    // ============================================

    /**
     * Start a step timer
     */
    async startStep(stepInstanceId: string, dto: StartStepDto): Promise<void> {
        this.logger.log(`Starting step ${stepInstanceId}`);

        // Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // Check if already started
        if (stepInstance.timerStatus !== 'NOT_STARTED') {
            throw new BadRequestException(`Step already started (status: ${stepInstance.timerStatus})`);
        }

        // Check if dependencies are met
        const dependenciesMet = await this.checkDependencies(stepInstance);
        if (!dependenciesMet) {
            throw new BadRequestException(`Dependencies not met for step ${stepInstance.stepKey}`);
        }

        const now = new Date();
        const timerConfig = stepInstance.timerConfig as any;

        // Calculate scheduled end time
        let scheduledEndAt: Date | null = null;
        let allocatedTimeMs: number | null = null;
        let customDeadline: Date | null = dto.customDeadline || stepInstance.customDeadline || null;

        switch (timerConfig.type) {
            case 'FIXED_DURATION':
                const durationHours = dto.customDurationHours || timerConfig.durationHours;
                allocatedTimeMs = durationHours * 60 * 60 * 1000;

                if (timerConfig.isBusinessDaysOnly) {
                    // Will be calculated by timer engine
                    scheduledEndAt = null;
                } else {
                    scheduledEndAt = new Date(now.getTime() + allocatedTimeMs);
                }
                break;

            case 'DEADLINE_BASED':
                if (!customDeadline) {
                    throw new BadRequestException('Custom deadline required for deadline-based timer');
                }
                scheduledEndAt = customDeadline;
                allocatedTimeMs = scheduledEndAt.getTime() - now.getTime();
                break;

            case 'NEGATIVE_COUNTDOWN':
                // Deadline should be set from entity (e.g., tender submission deadline)
                if (!customDeadline) {
                    const entityData = await this.getEntityData(stepInstance.entityType, stepInstance.entityId.toString());
                    customDeadline = entityData?.submissionDeadline || null;

                    if (!customDeadline) {
                        throw new BadRequestException('Deadline not found for negative countdown timer');
                    }
                }

                const hoursBeforeDeadline = timerConfig.hoursBeforeDeadline || -72;
                scheduledEndAt = new Date(customDeadline.getTime() + (hoursBeforeDeadline * 60 * 60 * 1000));
                allocatedTimeMs = Math.abs(hoursBeforeDeadline * 60 * 60 * 1000);
                break;

            case 'DYNAMIC':
                if (!dto.customDurationHours) {
                    throw new BadRequestException('Custom duration required for dynamic timer');
                }
                allocatedTimeMs = dto.customDurationHours * 60 * 60 * 1000;
                scheduledEndAt = new Date(now.getTime() + allocatedTimeMs);
                break;

            case 'NO_TIMER':
                // No timer needed
                break;
        }

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                status: 'IN_PROGRESS',
                timerStatus: timerConfig.type === 'NO_TIMER' ? 'NOT_STARTED' : 'RUNNING',
                actualStartAt: now,
                allocatedTimeMs,
                customDeadline,
                assignedToUserId: dto.assignedToUserId ? parseInt(dto.assignedToUserId) : stepInstance.assignedToUserId,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create START event
        if (timerConfig.type !== 'NO_TIMER') {
            await this.db.insert(timerEvents).values({
                stepInstanceId: stepInstance.id as number,
                eventType: 'START',
                performedByUserId: dto.assignedToUserId ? parseInt(dto.assignedToUserId) : undefined,
                previousStatus: null,
                newStatus: 'RUNNING',
                metadata: {
                    scheduledEndAt: scheduledEndAt?.toISOString(),
                    allocatedTimeMs,
                },
                createdAt: now,
            });
        }

        this.logger.log(`Step ${stepInstanceId} started successfully`);
    }

    // ============================================
    // COMPLETE STEP
    // ============================================

    /**
     * Complete a step
     */
    async completeStep(stepInstanceId: string, dto: CompleteStepDto): Promise<void> {
        this.logger.log(`Completing step ${stepInstanceId}`);

        // Get step instance
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // Check if can be completed
        if (stepInstance.status === 'COMPLETED') {
            throw new BadRequestException('Step already completed');
        }

        const now = dto.completedAt || new Date();
        const startTime = stepInstance.actualStartAt;

        // Calculate actual time taken
        let actualTimeMs: number | null = null;
        let remainingTimeMs: number | null = null;

        if (startTime) {
            actualTimeMs = now.getTime() - startTime.getTime() - (stepInstance.totalPausedDurationMs || 0);

            if (stepInstance.allocatedTimeMs) {
                remainingTimeMs = stepInstance.allocatedTimeMs - actualTimeMs;
            }
        }

        // Determine if overdue
        const isOverdue = remainingTimeMs !== null && remainingTimeMs < 0;

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                status: 'COMPLETED',
                timerStatus: isOverdue ? 'OVERDUE' : 'COMPLETED',
                actualEndAt: now,
                actualTimeMs,
                remainingTimeMs,
                metadata: {
                    ...stepInstance.metadata as any,
                    completionNotes: dto.notes,
                    completedEarly: remainingTimeMs !== null && remainingTimeMs > 0,
                },
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create COMPLETE event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'COMPLETE',
            performedByUserId: parseInt(dto.userId),
            previousStatus: stepInstance.timerStatus,
            newStatus: isOverdue ? 'OVERDUE' : 'COMPLETED',
            metadata: {
                actualTimeMs,
                remainingTimeMs,
                completedEarly: remainingTimeMs !== null && remainingTimeMs > 0,
                notes: dto.notes,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} completed`);

        // Trigger dependent steps
        await this.triggerDependentSteps(stepInstance);
    }

    // ============================================
    // PAUSE STEP
    // ============================================

    /**
     * Pause a running timer
     */
    async pauseStep(stepInstanceId: string, dto: PauseStepDto): Promise<void> {
        this.logger.log(`Pausing step ${stepInstanceId}`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        if (stepInstance.timerStatus !== 'RUNNING') {
            throw new BadRequestException(`Cannot pause step with status: ${stepInstance.timerStatus}`);
        }

        const now = new Date();

        // Update step instance
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

        // Create PAUSE event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'PAUSE',
            performedByUserId: parseInt(dto.userId),
            previousStatus: 'RUNNING',
            newStatus: 'PAUSED',
            reason: dto.reason,
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} paused`);
    }

    // ============================================
    // RESUME STEP
    // ============================================

    /**
     * Resume a paused timer
     */
    async resumeStep(stepInstanceId: string, userId: string): Promise<void> {
        this.logger.log(`Resuming step ${stepInstanceId}`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        if (stepInstance.timerStatus !== 'PAUSED') {
            throw new BadRequestException(`Cannot resume step with status: ${stepInstance.timerStatus}`);
        }

        const now = new Date();
        const metadata = stepInstance.metadata as any;
        const lastPausedAt = metadata?.lastPausedAt ? new Date(metadata.lastPausedAt) : null;

        // Calculate paused duration
        let pausedDuration = 0;
        if (lastPausedAt) {
            pausedDuration = now.getTime() - lastPausedAt.getTime();
        }

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                timerStatus: 'RUNNING',
                totalPausedDurationMs: (stepInstance.totalPausedDurationMs || 0) + pausedDuration,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create RESUME event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'RESUME',
            performedByUserId: parseInt(userId),
            previousStatus: 'PAUSED',
            newStatus: 'RUNNING',
            metadata: {
                pausedDurationMs: pausedDuration,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} resumed`);
    }

    // ============================================
    // EXTEND STEP
    // ============================================

    /**
     * Extend timer duration
     */
    async extendStep(stepInstanceId: string, dto: ExtendStepDto): Promise<void> {
        this.logger.log(`Extending step ${stepInstanceId} by ${dto.extensionHours} hours`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        if (!['RUNNING', 'PAUSED', 'OVERDUE'].includes(stepInstance.timerStatus)) {
            throw new BadRequestException(`Cannot extend step with status: ${stepInstance.timerStatus}`);
        }

        const extensionMs = dto.extensionHours * 60 * 60 * 1000;
        const now = new Date();

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                extensionDurationMs: (stepInstance.extensionDurationMs || 0) + extensionMs,
                allocatedTimeMs: stepInstance.allocatedTimeMs
                    ? stepInstance.allocatedTimeMs + extensionMs
                    : null,
                timerStatus: stepInstance.timerStatus === 'OVERDUE' ? 'RUNNING' : stepInstance.timerStatus,
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create EXTEND event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'EXTEND',
            performedByUserId: parseInt(dto.userId),
            durationChangeMs: extensionMs,
            reason: dto.reason,
            metadata: {
                extensionHours: dto.extensionHours,
                totalExtensionMs: (stepInstance.extensionDurationMs || 0) + extensionMs,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} extended by ${dto.extensionHours} hours`);
    }

    // ============================================
    // REJECT STEP
    // ============================================

    /**
     * Reject a step (send back for rework)
     */
    async rejectStep(stepInstanceId: string, dto: RejectStepDto): Promise<void> {
        this.logger.log(`Rejecting step ${stepInstanceId}`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        const now = new Date();

        if (dto.shouldResetTimer) {
            // Reset timer completely
            await this.db
                .update(stepInstances)
                .set({
                    status: 'REJECTED',
                    timerStatus: 'NOT_STARTED',
                    actualStartAt: null,
                    actualEndAt: null,
                    allocatedTimeMs: null,
                    actualTimeMs: null,
                    remainingTimeMs: null,
                    totalPausedDurationMs: 0,
                    extensionDurationMs: 0,
                    rejectedAt: now,
                    rejectionReason: dto.reason,
                    rejectionCount: (stepInstance.rejectionCount || 0) + 1,
                    updatedAt: now,
                })
                .where(eq(stepInstances.id, parseInt(stepInstanceId)));
        } else {
            // Keep timer running from where it was
            await this.db
                .update(stepInstances)
                .set({
                    status: 'REJECTED',
                    rejectedAt: now,
                    rejectionReason: dto.reason,
                    rejectionCount: (stepInstance.rejectionCount || 0) + 1,
                    updatedAt: now,
                })
                .where(eq(stepInstances.id, parseInt(stepInstanceId)));
        }

        // Create REJECT event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'REJECT',
            performedByUserId: parseInt(dto.userId),
            previousStatus: stepInstance.timerStatus,
            newStatus: dto.shouldResetTimer ? 'NOT_STARTED' : stepInstance.timerStatus,
            reason: dto.reason,
            metadata: {
                resetTimer: dto.shouldResetTimer,
                rejectionCount: (stepInstance.rejectionCount || 0) + 1,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} rejected`);
    }

    // ============================================
    // SKIP STEP
    // ============================================

    /**
     * Skip an optional step
     */
    async skipStep(stepInstanceId: string, userId: string, reason?: string): Promise<void> {
        this.logger.log(`Skipping step ${stepInstanceId}`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // Check if step can be skipped
        const stepDef = getStepDefinition(stepInstance.workflowCode as WorkflowCode, stepInstance.stepKey);
        if (!stepDef?.isOptional) {
            throw new BadRequestException('This step cannot be skipped');
        }

        const now = new Date();

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                status: 'SKIPPED',
                timerStatus: 'SKIPPED',
                actualEndAt: now,
                metadata: {
                    ...stepInstance.metadata as any,
                    skipReason: reason,
                },
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create SKIP event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'SKIP',
            performedByUserId: parseInt(userId),
            previousStatus: stepInstance.timerStatus,
            newStatus: 'SKIPPED',
            reason,
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} skipped`);

        // Trigger dependent steps
        await this.triggerDependentSteps(stepInstance);
    }

    // ============================================
    // CANCEL STEP
    // ============================================

    /**
     * Cancel a step
     */
    async cancelStep(stepInstanceId: string, userId: string, reason?: string): Promise<void> {
        this.logger.log(`Cancelling step ${stepInstanceId}`);

        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        const now = new Date();

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                status: 'ON_HOLD',
                timerStatus: 'CANCELLED',
                actualEndAt: now,
                metadata: {
                    ...stepInstance.metadata as any,
                    cancelReason: reason,
                },
                updatedAt: now,
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));

        // Create CANCEL event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'CANCEL',
            performedByUserId: parseInt(userId),
            previousStatus: stepInstance.timerStatus,
            newStatus: 'CANCELLED',
            reason,
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} cancelled`);
    }

    // ============================================
    // GET WORKFLOW STATUS
    // ============================================

    /**
     * Get complete workflow status for an entity
     */
    async getWorkflowStatus(entityType: string, entityId: string): Promise<any> {
        // Get all step instances for this entity
        const steps = await this.db
            .select()
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, entityType as any),
                    eq(stepInstances.entityId, parseInt(entityId))
                )
            )
            .orderBy(stepInstances.stepOrder);

        // Calculate timer states for all steps
        const stepsWithTimers = await Promise.all(
            steps.map(async (step) => {
                const timerState = await this.timerEngine.calculateTimerState(step.id.toString());
                return {
                    ...step,
                    timerState,
                };
            })
        );

        // Calculate overall progress
        const totalSteps = steps.length;
        const completedSteps = steps.filter(s => s.status === 'COMPLETED').length;
        const activeSteps = steps.filter(s => s.status === 'IN_PROGRESS').length;
        const overdueSteps = steps.filter(s => s.timerStatus === 'OVERDUE').length;

        return {
            entityType,
            entityId,
            totalSteps,
            completedSteps,
            activeSteps,
            overdueSteps,
            progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
            steps: stepsWithTimers,
        };
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Create a step instance
     */
    private async createStepInstance(params: {
        workflowCode: WorkflowCode;
        entityType: 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION';
        entityId: string;
        stepDef: any;
        entityData: any;
        metadata?: Record<string, any>;
    }): Promise<string> {
        const { workflowCode, entityType, entityId, stepDef, entityData, metadata } = params;

        // Determine assigned user
        let assignedUserId: string | null = null;
        if (entityType === 'TENDER' && entityData) {
            if (stepDef.assignedRole === 'TE') {
                assignedUserId = entityData.tenderExecutiveId;
            } else if (stepDef.assignedRole === 'TL') {
                assignedUserId = entityData.teamLeaderId;
            }
        }

        // Get custom deadline for negative countdown timers
        let customDeadline: Date | null = null;
        if (stepDef.timerConfig.type === 'NEGATIVE_COUNTDOWN' && entityData?.submissionDeadline) {
            customDeadline = new Date(entityData.submissionDeadline);
        }

        // Create step instance
        const [stepInstance] = await this.db
            .insert(stepInstances)
            .values({
                entityType,
                entityId: parseInt(entityId),
                stepKey: stepDef.stepKey,
                stepName: stepDef.stepName,
                stepOrder: stepDef.stepOrder,
                assignedToUserId: assignedUserId ? parseInt(assignedUserId) : undefined,
                assignedRole: stepDef.assignedRole,
                timerConfig: stepDef.timerConfig,
                status: 'PENDING',
                timerStatus: 'NOT_STARTED',
                workflowCode,
                dependsOnSteps: stepDef.dependsOn || [],
                canRunInParallel: stepDef.canRunInParallel || false,
                customDeadline,
                metadata: {
                    ...metadata,
                    conditional: stepDef.conditional,
                },
            })
            .returning();

        return stepInstance.id.toString();
    }

    /**
     * Trigger dependent steps
     */
    private async triggerDependentSteps(completedStep: any): Promise<void> {
        // Find all steps that depend on this one
        const potentialDependents = await this.db
            .select()
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, completedStep.entityType),
                    eq(stepInstances.entityId, completedStep.entityId),
                    eq(stepInstances.workflowCode, completedStep.workflowCode),
                    eq(stepInstances.status, 'PENDING')
                )
            );

        for (const step of potentialDependents) {
            const dependsOn = step.dependsOnSteps as string[] || [];

            // Check if this step depends on the completed one
            if (dependsOn.includes(completedStep.stepKey)) {
                // Check if all dependencies are met
                const allDepsMet = await this.checkDependencies(step);

                if (allDepsMet) {
                    // Check conditional logic
                    const entityData = await this.getEntityData(step.entityType, step.entityId.toString());
                    const stepDef = getStepDefinition(step.workflowCode as WorkflowCode, step.stepKey);

                    if (stepDef && this.checkConditionalLogic(stepDef, entityData, step.metadata as any)) {
                        // Auto-start this step
                        try {
                            await this.startStep(step.id.toString(), { stepKey: step.stepKey });
                            this.logger.log(`Auto-started dependent step: ${step.stepKey}`);
                        } catch (error) {
                            this.logger.error(`Failed to auto-start step ${step.stepKey}:`, error);
                        }
                    }
                }
            }
        }
    }

    /**
     * Check if dependencies are met
     */
    private async checkDependencies(step: any): Promise<boolean> {
        const dependsOn = step.dependsOnSteps as string[] || [];

        if (dependsOn.length === 0) {
            return true;
        }

        // Get all steps for this entity
        const allSteps = await this.db
            .select()
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, step.entityType),
                    eq(stepInstances.entityId, step.entityId),
                    eq(stepInstances.workflowCode, step.workflowCode)
                )
            );

        // Check if all dependencies are completed or skipped
        for (const depKey of dependsOn) {
            const depStep = allSteps.find(s => s.stepKey === depKey);

            if (!depStep || !['COMPLETED', 'SKIPPED'].includes(depStep.status)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check conditional logic
     */
    private checkConditionalLogic(stepDef: any, entityData: any, metadata?: any): boolean {
        if (!stepDef.conditional) {
            return true;
        }

        const { field, operator, value } = stepDef.conditional;
        const fieldValue = entityData?.[field];

        switch (operator) {
            case 'equals':
                return fieldValue === value;
            case 'notEquals':
                return fieldValue !== value;
            case 'greaterThan':
                return fieldValue > value;
            case 'lessThan':
                return fieldValue < value;
            case 'contains':
                return Array.isArray(fieldValue) && fieldValue.includes(value);
            default:
                return true;
        }
    }

    /**
     * Get entity data
     */
    private async getEntityData(entityType: string, entityId: string): Promise<any> {
        if (entityType === 'TENDER') {
            const [tenderInfo] = await this.db
                .select()
                .from(tenderInfos)
                .where(eq(tenderInfos.id, parseInt(entityId)))
                .limit(1);

            return tenderInfo as TenderInfo | null;
        }

        // Add other entity types as needed
        return null;
    }
}
