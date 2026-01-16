import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { stepInstances, timerEvents } from '@db/schemas/workflow/workflows.schema';
import { TenderInfo, tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { TimerEngineService } from '@/modules/timers/services/timer-engine.service';
import { getWorkflow, getStepDefinition, WorkflowCode, WorkflowStep } from '@/config/timer.config';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@db';

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
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly timerEngine: TimerEngineService,
    ) { }

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

        // CREATE ALL STEP INSTANCES UPFRONT
        const createdStepIds: string[] = [];
        let firstStepId: string | null = null;
        let stepsStarted = 0;

        this.logger.log(`Creating ${workflow.steps.length} step instances for workflow ${dto.workflowCode}`);

        // First pass: Create all step instances
        for (const step of workflow.steps) {
            try {
                const stepInstanceId = await this.createStepInstance({
                    workflowCode: dto.workflowCode,
                    entityType: dto.entityType,
                    entityId: dto.entityId,
                    stepDef: step,
                    entityData,
                    metadata: dto.metadata,
                });

                createdStepIds.push(stepInstanceId);

                // Track the first step that can be started
                if (!firstStepId) {
                    const noDependencies = !step.dependsOn || step.dependsOn.length === 0;
                    const meetsCondition = this.checkConditionalLogic(step, entityData, dto.metadata);
                    if (noDependencies && meetsCondition && !step.isOptional) {
                        firstStepId = stepInstanceId;
                    }
                }

                this.logger.debug(`Created step instance ${stepInstanceId} for step ${step.stepKey}`);
            } catch (error) {
                this.logger.error(`Failed to create step instance for step ${step.stepKey}:`, error);
                throw new Error(`Failed to create step instance: ${error.message}`);
            }
        }

        // Second pass: Start steps that can run immediately
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            const noDependencies = !step.dependsOn || step.dependsOn.length === 0;
            const meetsCondition = this.checkConditionalLogic(step, entityData, dto.metadata);

            if (noDependencies && meetsCondition && !step.isOptional && step.timerConfig.type !== 'NO_TIMER') {
                const stepInstanceId = createdStepIds[i];

                try {
                    await this.startStep(stepInstanceId, {
                        stepKey: step.stepKey,
                        customDurationHours: step.timerConfig.durationHours,
                        customDeadline: this.calculateDeadline(step, entityData)
                    });
                    stepsStarted++;
                    this.logger.debug(`Started step ${step.stepKey} (${stepInstanceId})`);
                } catch (error) {
                    this.logger.error(`Failed to start step ${step.stepKey}:`, error);
                    // Continue with other steps even if one fails
                }
            }
        }

        this.logger.log(`Created ${workflow.steps.length} step instances, started ${stepsStarted} initial steps for workflow ${dto.workflowCode}`);

        return {
            stepsStarted,
            firstStepId,
        };
    }

    /**
     * Calculate deadline for negative countdown timers
     */
    private calculateDeadline(step: WorkflowStep, entityData: any): Date | undefined {
        if (step.timerConfig.type === 'NEGATIVE_COUNTDOWN' && entityData?.dueDate) {
            const dueDate = new Date(entityData.dueDate);
            const hoursBeforeDeadline = step.timerConfig.hoursBeforeDeadline || -72;
            return new Date(dueDate.getTime() + hoursBeforeDeadline * 60 * 60 * 1000);
        }
        return undefined;
    }

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

        // Start the timer
        await this.timerEngine.startTimer({
            stepInstanceId,
            customDurationHours: dto.customDurationHours,
            customDeadline: dto.customDeadline
        });

        this.logger.log(`Step ${stepInstanceId} started successfully`);
    }

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

        // Stop the timer
        await this.timerEngine.stopTimer(stepInstanceId);

        // Determine if overdue
        const timerState = await this.timerEngine.calculateTimerState(stepInstanceId);
        const isOverdue = timerState.isOverdue;

        // Update step instance
        await this.db
            .update(stepInstances)
            .set({
                status: 'COMPLETED',
                timerStatus: isOverdue ? 'OVERDUE' : 'COMPLETED',
                actualEndAt: now,
                metadata: {
                    ...stepInstance.metadata as any,
                    completionNotes: dto.notes,
                    completedEarly: timerState.remainingMs !== null && timerState.remainingMs > 0,
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
                actualTimeMs: timerState.elapsedMs,
                remainingTimeMs: timerState.remainingMs,
                completedEarly: timerState.remainingMs !== null && timerState.remainingMs > 0,
                notes: dto.notes,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} completed`);

        await this.triggerDependentSteps(stepInstance);
    }

    /**
     * Pause a running timer
     */
    async pauseStep(stepInstanceId: string, dto: PauseStepDto): Promise<void> {
        this.logger.log(`Pausing step ${stepInstanceId}`);

        // Pause the timer
        await this.timerEngine.pauseTimer(stepInstanceId);

        const now = new Date();

        // Get step instance for event creation
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

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

    /**
     * Resume a paused timer
     */
    async resumeStep(stepInstanceId: string, userId: string): Promise<void> {
        this.logger.log(`Resuming step ${stepInstanceId}`);

        // Resume the timer
        await this.timerEngine.resumeTimer(stepInstanceId);

        const now = new Date();

        // Get step instance for event creation
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // Create RESUME event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'RESUME',
            performedByUserId: parseInt(userId),
            previousStatus: 'PAUSED',
            newStatus: 'RUNNING',
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} resumed`);
    }

    /**
     * Extend timer duration
     */
    async extendStep(stepInstanceId: string, dto: ExtendStepDto): Promise<void> {
        this.logger.log(`Extending step ${stepInstanceId} by ${dto.extensionHours} hours`);

        // Extend the timer
        await this.timerEngine.extendTimer(stepInstanceId, dto.extensionHours);

        const now = new Date();

        // Get step instance for event creation
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

        // Create EXTEND event
        await this.db.insert(timerEvents).values({
            stepInstanceId: stepInstance.id as number,
            eventType: 'EXTEND',
            performedByUserId: parseInt(dto.userId),
            durationChangeMs: dto.extensionHours * 60 * 60 * 1000,
            reason: dto.reason,
            metadata: {
                extensionHours: dto.extensionHours,
            },
            createdAt: now,
        });

        this.logger.log(`Step ${stepInstanceId} extended by ${dto.extensionHours} hours`);
    }

    /**
     * Reject a step (send back for rework)
     */
    async rejectStep(stepInstanceId: string, dto: RejectStepDto): Promise<void> {
        this.logger.log(`Rejecting step ${stepInstanceId}`);

        const now = new Date();

        if (dto.shouldResetTimer) {
            // Cancel the timer
            await this.timerEngine.cancelTimer(stepInstanceId);
        }

        // Get step instance for event creation
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

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

        // Cancel any active timer
        if (stepInstance.timerStatus !== 'NOT_STARTED') {
            await this.timerEngine.cancelTimer(stepInstanceId);
        }

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

    /**
     * Cancel a step
     */
    async cancelStep(stepInstanceId: string, userId: string, reason?: string): Promise<void> {
        this.logger.log(`Cancelling step ${stepInstanceId}`);

        // Cancel the timer
        await this.timerEngine.cancelTimer(stepInstanceId);

        const now = new Date();

        // Get step instance for event creation
        const [stepInstance] = await this.db
            .select()
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        if (!stepInstance) {
            throw new NotFoundException(`Step instance ${stepInstanceId} not found`);
        }

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

    /**
     * Create a step instance
     */
    private async createStepInstance(params: {
        workflowCode: WorkflowCode;
        entityType: 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION';
        entityId: string;
        stepDef: WorkflowStep;
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
        if (stepDef.timerConfig.type === 'NEGATIVE_COUNTDOWN' && entityData?.dueDate) {
            const dueDate = new Date(entityData.dueDate);
            const hoursBeforeDeadline = stepDef.timerConfig.hoursBeforeDeadline || -72;
            customDeadline = new Date(dueDate.getTime() + hoursBeforeDeadline * 60 * 60 * 1000);
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
        this.logger.log(`Triggering dependent steps for completed step ${completedStep.stepKey} (${completedStep.id})`);

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

        this.logger.debug(`Found ${potentialDependents.length} potential dependent steps`);

        for (const step of potentialDependents) {
            const dependsOn = step.dependsOnSteps as string[] || [];

            // Check if this step depends on the completed one
            if (dependsOn.includes(completedStep.stepKey)) {
                this.logger.debug(`Step ${step.stepKey} depends on ${completedStep.stepKey}`);

                // Check if all dependencies are met
                const allDepsMet = await this.checkDependencies(step);

                if (allDepsMet) {
                    this.logger.debug(`All dependencies met for step ${step.stepKey}`);

                    // Check conditional logic
                    const entityData = await this.getEntityData(step.entityType, step.entityId.toString());
                    const stepDef = getStepDefinition(step.workflowCode as WorkflowCode, step.stepKey);

                    if (stepDef && this.checkConditionalLogic(stepDef, entityData, step.metadata as any)) {
                        this.logger.log(`Auto-starting dependent step: ${step.stepKey} (${step.id})`);

                        try {
                            await this.startStep(step.id.toString(), { stepKey: step.stepKey });
                        } catch (error) {
                            this.logger.error(`Failed to auto-start step ${step.stepKey}:`, error);
                        }
                    } else {
                        this.logger.debug(`Conditional logic not met for step ${step.stepKey}`);
                    }
                } else {
                    this.logger.debug(`Dependencies not met for step ${step.stepKey}`);
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
    private checkConditionalLogic(stepDef: WorkflowStep, entityData: any, metadata?: any): boolean {
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

    /**
     * Update step deadline for negative countdown timers
     */
    async updateStepDeadline(stepInstanceId: string, deadline: Date, hoursBeforeDeadline: number): Promise<void> {
        this.logger.log(`Updating deadline for step ${stepInstanceId} to ${deadline.toISOString()}`);

        await this.db
            .update(stepInstances)
            .set({
                customDeadline: deadline,
                timerConfig: {
                    ...(await this.getStepTimerConfig(stepInstanceId)),
                    type: 'NEGATIVE_COUNTDOWN',
                    hoursBeforeDeadline: hoursBeforeDeadline
                }
            })
            .where(eq(stepInstances.id, parseInt(stepInstanceId)));
    }

    /**
     * Get timer config for a step
     */
    private async getStepTimerConfig(stepInstanceId: string): Promise<any> {
        const [step] = await this.db
            .select({ timerConfig: stepInstances.timerConfig })
            .from(stepInstances)
            .where(eq(stepInstances.id, parseInt(stepInstanceId)))
            .limit(1);

        return step?.timerConfig || {};
    }

    /**
     * Get all pending steps for a tender
     */
    async getPendingSteps(tenderId: number, workflowCode: WorkflowCode): Promise<any[]> {
        return this.db
            .select()
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, 'TENDER'),
                    eq(stepInstances.entityId, tenderId),
                    eq(stepInstances.workflowCode, workflowCode),
                    eq(stepInstances.status, 'PENDING')
                )
            );
    }

    /**
     * Get all steps for a tender
     */
    async getAllSteps(tenderId: number, workflowCode: WorkflowCode): Promise<any[]> {
        return this.db
            .select()
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.entityType, 'TENDER'),
                    eq(stepInstances.entityId, tenderId),
                    eq(stepInstances.workflowCode, workflowCode)
                )
            )
            .orderBy(stepInstances.stepOrder);
    }
}
