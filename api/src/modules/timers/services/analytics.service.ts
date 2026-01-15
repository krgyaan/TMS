import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, between, desc, SQL } from 'drizzle-orm';
import { stepInstances } from '@db/schemas/workflow/workflows.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@db';

export interface UserStepPerformance {
    userId: string;
    userName: string;
    email: string;

    // Entity info
    entityType: string;
    entityId: string;
    entityName: string; // e.g., tender number

    // Step details
    stepInstanceId: string;
    stepKey: string;
    stepName: string;
    stepOrder: number;

    // Time metrics
    allocatedTimeMs: number | null;
    actualTimeMs: number | null;
    remainingTimeMs: number | null;
    completedOnTime: boolean;
    overdueByMs: number | null;
    percentageTimeUsed: number | null;

    // Dates
    startedAt: Date | null;
    completedAt: Date | null;

    // Status
    status: string;
    timerStatus: string;
    colorAtCompletion: 'GREEN' | 'YELLOW' | 'RED' | 'GREY' | null;
}

export interface UserPerformanceSummary {
    userId: string;
    userName: string;
    email: string;

    // Overall metrics
    totalStepsAssigned: number;
    totalStepsCompleted: number;
    totalStepsInProgress: number;
    totalStepsOverdue: number;
    totalStepsPending: number;

    // Time performance
    stepsCompletedOnTime: number;
    stepsCompletedLate: number;
    onTimeCompletionRate: number; // percentage

    // Average times
    avgPercentageTimeUsed: number;
    avgActualTimeMs: number;
    avgAllocatedTimeMs: number;

    // Breakdown by entity
    entityBreakdown: EntityPerformanceBreakdown[];
}

export interface EntityPerformanceBreakdown {
    entityType: string;
    entityId: string;
    entityName: string;
    totalSteps: number;
    completedSteps: number;
    onTimeSteps: number;
    lateSteps: number;
    inProgressSteps: number;
    overdueSteps: number;
    progress: number; // percentage
}

export interface StepPerformanceAnalytics {
    stepKey: string;
    stepName: string;

    // Execution stats
    totalExecutions: number;
    completedExecutions: number;
    onTimeCompletions: number;
    lateCompletions: number;

    // Time stats
    avgAllocatedTimeMs: number;
    avgActualTimeMs: number;
    avgPercentageTimeUsed: number;

    // Completion rate
    onTimeRate: number;
    completionRate: number;

    // Identifies bottlenecks
    isBottleneck: boolean;
    avgOverdueMs: number | null;
}

export interface TeamPerformanceComparison {
    users: Array<{
        userId: string;
        userName: string;
        email: string;
        totalCompleted: number;
        onTimeRate: number;
        avgTimeUsed: number;
        rank: number;
    }>;
    teamAverage: {
        onTimeRate: number;
        avgTimeUsed: number;
    };
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    /**
     * Get detailed performance for a user on a specific entity
     */
    async getUserEntityPerformance(
        userId: string,
        entityType: string,
        entityId: string
    ): Promise<UserStepPerformance[]> {
        this.logger.log(`Getting performance for user ${userId} on ${entityType} ${entityId}`);

        const results = await this.db
            .select({
                // Step instance info
                stepInstanceId: stepInstances.id,
                stepKey: stepInstances.stepKey,
                stepName: stepInstances.stepName,
                stepOrder: stepInstances.stepOrder,
                status: stepInstances.status,
                timerStatus: stepInstances.timerStatus,

                // Time data
                allocatedTimeMs: stepInstances.allocatedTimeMs,
                actualTimeMs: stepInstances.actualTimeMs,
                remainingTimeMs: stepInstances.remainingTimeMs,
                actualStartAt: stepInstances.actualStartAt,
                actualEndAt: stepInstances.actualEndAt,

                // User info
                userId: users.id,
                userName: users.name,
                userEmail: users.email,

                // Entity info
                entityType: stepInstances.entityType,
                entityId: stepInstances.entityId,
            })
            .from(stepInstances)
            .innerJoin(users, eq(users.id, stepInstances.assignedToUserId))
            .where(
                and(
                    eq(stepInstances.assignedToUserId, parseInt(userId)),
                    eq(stepInstances.entityType, entityType as any),
                    eq(stepInstances.entityId, parseInt(entityId)),
                    eq(stepInstances.timerStatus, 'COMPLETED')
                )
            )
            .orderBy(desc(stepInstances.actualEndAt));

        // Get entity name
        const entityName = await this.getEntityName(entityType, entityId);

        return results.map(row => {
            const allocatedMs = row.allocatedTimeMs as number | null || 0;
            const actualMs = row.actualTimeMs as number | null || 0;
            const remainingMs = row.remainingTimeMs as number | null || 0;

            const completedOnTime = remainingMs >= 0;
            const overdueByMs = completedOnTime ? null : Math.abs(remainingMs);
            const percentageTimeUsed = allocatedMs > 0 ? (actualMs / allocatedMs) * 100 : null;

            const colorAtCompletion = this.getColorForPerformance(percentageTimeUsed, completedOnTime);

            return {
                userId: row.userId.toString(),
                userName: row.userName,
                email: row.userEmail,
                entityType: row.entityType,
                entityId: row.entityId.toString(),
                entityName,
                stepInstanceId: row.stepInstanceId.toString(),
                stepKey: row.stepKey,
                stepName: row.stepName,
                stepOrder: row.stepOrder,
                allocatedTimeMs: row.allocatedTimeMs as number | null || 0,
                actualTimeMs: row.actualTimeMs as number | null || 0,
                remainingTimeMs: row.remainingTimeMs as number | null || 0,
                completedOnTime,
                overdueByMs,
                percentageTimeUsed: percentageTimeUsed as number | null || 0,
                startedAt: row.actualStartAt as Date | null || null,
                completedAt: row.actualEndAt as Date | null || null,
                status: row.status,
                timerStatus: row.timerStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'REJECTED' | 'ON_HOLD',
                colorAtCompletion,
            };
        });
    }

    /**
     * Get comprehensive user performance summary
     */
    async getUserPerformanceSummary(
        userId: string,
        dateFrom?: Date,
        dateTo?: Date
    ): Promise<UserPerformanceSummary> {
        this.logger.log(`Getting performance summary for user ${userId}`);

        // Get user details
        const [user] = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
            })
            .from(users)
            .where(eq(users.id, parseInt(userId)))
            .limit(1);

        if (!user) {
            throw new Error('User not found');
        }

        // Build date filter
        const dateConditions: SQL[] = [];
        if (dateFrom && dateTo) {
            dateConditions.push(between(stepInstances.actualEndAt as any, dateFrom, dateTo));
        }

        // Get all step instances for user
        const allSteps = await this.db
            .select({
                id: stepInstances.id,
                status: stepInstances.status,
                timerStatus: stepInstances.timerStatus,
                allocatedTimeMs: stepInstances.allocatedTimeMs,
                actualTimeMs: stepInstances.actualTimeMs,
                remainingTimeMs: stepInstances.remainingTimeMs,
                actualStartAt: stepInstances.actualStartAt,
                actualEndAt: stepInstances.actualEndAt,
                entityType: stepInstances.entityType,
                entityId: stepInstances.entityId,
            })
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.assignedToUserId, parseInt(userId)),
                    ...(dateConditions.length > 0 ? dateConditions : [])
                )
            );

        // Calculate metrics
        const totalStepsAssigned = allSteps.length;
        const completedSteps = allSteps.filter(s => s.status === 'COMPLETED');
        const inProgressSteps = allSteps.filter(s => s.status === 'IN_PROGRESS');
        const overdueSteps = allSteps.filter(s => s.timerStatus === 'OVERDUE');
        const pendingSteps = allSteps.filter(s => s.status === 'PENDING');

        let stepsCompletedOnTime = 0;
        let stepsCompletedLate = 0;
        let totalPercentageTimeUsed = 0;
        let totalActualTime = 0;
        let totalAllocatedTime = 0;
        let stepsWithTimeData = 0;

        completedSteps.forEach(step => {
            if (step.allocatedTimeMs && step.actualTimeMs !== null) {
                const onTime = (step.remainingTimeMs || 0) >= 0;

                if (onTime) {
                    stepsCompletedOnTime++;
                } else {
                    stepsCompletedLate++;
                }

                const percentageUsed = (step.actualTimeMs / step.allocatedTimeMs) * 100;
                totalPercentageTimeUsed += percentageUsed;
                totalActualTime += step.actualTimeMs;
                totalAllocatedTime += step.allocatedTimeMs;
                stepsWithTimeData++;
            }
        });

        const onTimeCompletionRate = completedSteps.length > 0
            ? (stepsCompletedOnTime / completedSteps.length) * 100
            : 0;

        const avgPercentageTimeUsed = stepsWithTimeData > 0
            ? totalPercentageTimeUsed / stepsWithTimeData
            : 0;

        const avgActualTimeMs = stepsWithTimeData > 0
            ? totalActualTime / stepsWithTimeData
            : 0;

        const avgAllocatedTimeMs = stepsWithTimeData > 0
            ? totalAllocatedTime / stepsWithTimeData
            : 0;

        // Group by entity
        const entityMap = new Map<string, EntityPerformanceBreakdown>();

        for (const step of allSteps) {
            const entityKey = `${step.entityType}:${step.entityId}`;

            if (!entityMap.has(entityKey)) {
                const entityName = await this.getEntityName(step.entityType, step.entityId.toString());

                entityMap.set(entityKey, {
                    entityType: step.entityType,
                    entityId: step.entityId.toString(),
                    entityName,
                    totalSteps: 0,
                    completedSteps: 0,
                    onTimeSteps: 0,
                    lateSteps: 0,
                    inProgressSteps: 0,
                    overdueSteps: 0,
                    progress: 0,
                });
            }

            const breakdown = entityMap.get(entityKey)!;
            breakdown.totalSteps++;

            if (step.status === 'COMPLETED') {
                breakdown.completedSteps++;

                if (step.allocatedTimeMs && step.actualTimeMs !== null) {
                    const onTime = (step.remainingTimeMs || 0) >= 0;
                    if (onTime) {
                        breakdown.onTimeSteps++;
                    } else {
                        breakdown.lateSteps++;
                    }
                }
            } else if (step.status === 'IN_PROGRESS') {
                breakdown.inProgressSteps++;
            }

            if (step.timerStatus === 'OVERDUE') {
                breakdown.overdueSteps++;
            }

            breakdown.progress = breakdown.totalSteps > 0
                ? (breakdown.completedSteps / breakdown.totalSteps) * 100
                : 0;
        }

        return {
            userId,
            userName: user.name,
            email: user.email,
            totalStepsAssigned,
            totalStepsCompleted: completedSteps.length,
            totalStepsInProgress: inProgressSteps.length,
            totalStepsOverdue: overdueSteps.length,
            totalStepsPending: pendingSteps.length,
            stepsCompletedOnTime,
            stepsCompletedLate,
            onTimeCompletionRate: parseFloat(onTimeCompletionRate.toFixed(2)),
            avgPercentageTimeUsed: parseFloat(avgPercentageTimeUsed.toFixed(2)),
            avgActualTimeMs: Math.round(avgActualTimeMs),
            avgAllocatedTimeMs: Math.round(avgAllocatedTimeMs),
            entityBreakdown: Array.from(entityMap.values()),
        };
    }

    /**
     * Get all users performance comparison
     */
    async getTeamPerformanceComparison(
        dateFrom?: Date,
        dateTo?: Date
    ): Promise<TeamPerformanceComparison> {
        this.logger.log('Getting team performance comparison');

        // Get all active users
        const activeUsers = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
            })
            .from(users)
            .where(eq(users.isActive, true));

        const userPerformances = await Promise.all(
            activeUsers.map(async (user) => {
                const summary = await this.getUserPerformanceSummary(user.id.toString(), dateFrom, dateTo);

                return {
                    userId: user.id.toString(),
                    userName: user.name,
                    email: user.email,
                    totalCompleted: summary.totalStepsCompleted,
                    onTimeRate: summary.onTimeCompletionRate,
                    avgTimeUsed: summary.avgPercentageTimeUsed,
                    rank: 0, // Will be calculated
                };
            })
        );

        // Sort by on-time rate (descending)
        userPerformances.sort((a, b) => b.onTimeRate - a.onTimeRate);

        // Assign ranks
        userPerformances.forEach((user, index) => {
            user.rank = index + 1;
        });

        // Calculate team averages
        const totalOnTimeRate = userPerformances.reduce((sum, u) => sum + u.onTimeRate, 0);
        const totalAvgTimeUsed = userPerformances.reduce((sum, u) => sum + u.avgTimeUsed, 0);

        const teamAverage = {
            onTimeRate: userPerformances.length > 0 ? totalOnTimeRate / userPerformances.length : 0,
            avgTimeUsed: userPerformances.length > 0 ? totalAvgTimeUsed / userPerformances.length : 0,
        };

        return {
            users: userPerformances,
            teamAverage,
        };
    }

    // ============================================
    // STEP PERFORMANCE
    // ============================================

    /**
     * Get performance analytics for a specific step
     */
    async getStepPerformanceAnalytics(stepKey: string): Promise<StepPerformanceAnalytics> {
        this.logger.log(`Getting performance analytics for step: ${stepKey}`);

        const executions = await this.db
            .select({
                id: stepInstances.id,
                stepName: stepInstances.stepName,
                status: stepInstances.status,
                timerStatus: stepInstances.timerStatus,
                allocatedTimeMs: stepInstances.allocatedTimeMs,
                actualTimeMs: stepInstances.actualTimeMs,
                remainingTimeMs: stepInstances.remainingTimeMs,
            })
            .from(stepInstances)
            .where(eq(stepInstances.stepKey, stepKey));

        const totalExecutions = executions.length;
        const completedExecutions = executions.filter(e => e.status === 'COMPLETED');

        let onTimeCompletions = 0;
        let lateCompletions = 0;
        let totalAllocated = 0;
        let totalActual = 0;
        let totalPercentage = 0;
        let totalOverdue = 0;
        let overdueCount = 0;
        let validExecutions = 0;

        completedExecutions.forEach(exec => {
            if (exec.allocatedTimeMs && exec.actualTimeMs !== null) {
                validExecutions++;
                totalAllocated += exec.allocatedTimeMs;
                totalActual += exec.actualTimeMs;

                const percentage = (exec.actualTimeMs / exec.allocatedTimeMs) * 100;
                totalPercentage += percentage;

                const onTime = (exec.remainingTimeMs || 0) >= 0;
                if (onTime) {
                    onTimeCompletions++;
                } else {
                    lateCompletions++;
                    totalOverdue += Math.abs(exec.remainingTimeMs || 0);
                    overdueCount++;
                }
            }
        });

        const avgAllocatedTimeMs = validExecutions > 0 ? totalAllocated / validExecutions : 0;
        const avgActualTimeMs = validExecutions > 0 ? totalActual / validExecutions : 0;
        const avgPercentageTimeUsed = validExecutions > 0 ? totalPercentage / validExecutions : 0;
        const avgOverdueMs = overdueCount > 0 ? totalOverdue / overdueCount : null;

        const onTimeRate = completedExecutions.length > 0
            ? (onTimeCompletions / completedExecutions.length) * 100
            : 0;

        const completionRate = totalExecutions > 0
            ? (completedExecutions.length / totalExecutions) * 100
            : 0;

        // A step is a bottleneck if on-time rate < 70% and has significant executions
        const isBottleneck = onTimeRate < 70 && totalExecutions >= 5;

        return {
            stepKey,
            stepName: executions[0]?.stepName || stepKey,
            totalExecutions,
            completedExecutions: completedExecutions.length,
            onTimeCompletions,
            lateCompletions,
            avgAllocatedTimeMs: Math.round(avgAllocatedTimeMs),
            avgActualTimeMs: Math.round(avgActualTimeMs),
            avgPercentageTimeUsed: parseFloat(avgPercentageTimeUsed.toFixed(2)),
            onTimeRate: parseFloat(onTimeRate.toFixed(2)),
            completionRate: parseFloat(completionRate.toFixed(2)),
            isBottleneck,
            avgOverdueMs: avgOverdueMs ? Math.round(avgOverdueMs) : null,
        };
    }

    /**
     * Get performance analytics for all steps in a workflow
     */
    async getWorkflowStepAnalytics(workflowCode: string): Promise<StepPerformanceAnalytics[]> {
        this.logger.log(`Getting step analytics for workflow: ${workflowCode}`);

        // Get all unique step keys for this workflow
        const stepKeys = await this.db
            .selectDistinct({ stepKey: stepInstances.stepKey })
            .from(stepInstances)
            .where(eq(stepInstances.workflowCode, workflowCode));

        const analytics = await Promise.all(
            stepKeys.map(s => this.getStepPerformanceAnalytics(s.stepKey))
        );

        // Sort by on-time rate (ascending) to show bottlenecks first
        return analytics.sort((a, b) => a.onTimeRate - b.onTimeRate);
    }

    // ============================================
    // ENTITY PERFORMANCE
    // ============================================

    /**
     * Get all users' performance on a specific entity
     */
    async getEntityPerformance(entityType: string, entityId: string) {
        this.logger.log(`Getting entity performance for ${entityType} ${entityId}`);

        const allSteps = await this.db
            .select({
                stepInstanceId: stepInstances.id,
                stepKey: stepInstances.stepKey,
                stepName: stepInstances.stepName,
                status: stepInstances.status,
                timerStatus: stepInstances.timerStatus,
                allocatedTimeMs: stepInstances.allocatedTimeMs,
                actualTimeMs: stepInstances.actualTimeMs,
                remainingTimeMs: stepInstances.remainingTimeMs,
                actualStartAt: stepInstances.actualStartAt,
                actualEndAt: stepInstances.actualEndAt,
                userId: users.id,
                userName: users.name,
                userEmail: users.email,
            })
            .from(stepInstances)
            .leftJoin(users, eq(users.id, stepInstances.assignedToUserId))
            .where(
                and(
                    eq(stepInstances.entityType, entityType as any),
                    eq(stepInstances.entityId, parseInt(entityId))
                )
            )
            .orderBy(stepInstances.stepOrder);

        // Group by user
        const userPerformance = new Map();

        allSteps.forEach(step => {
            if (!step.userId) return;

            if (!userPerformance.has(step.userId)) {
                userPerformance.set(step.userId, {
                    userId: step.userId,
                    userName: step.userName,
                    email: step.userEmail,
                    totalSteps: 0,
                    completedSteps: 0,
                    onTimeSteps: 0,
                    lateSteps: 0,
                    inProgressSteps: 0,
                    steps: [],
                });
            }

            const userStats = userPerformance.get(step.userId);
            userStats.totalSteps++;

            if (step.status === 'COMPLETED') {
                userStats.completedSteps++;

                if (step.allocatedTimeMs && step.actualTimeMs !== null) {
                    const onTime = (step.remainingTimeMs || 0) >= 0;

                    if (onTime) {
                        userStats.onTimeSteps++;
                    } else {
                        userStats.lateSteps++;
                    }

                    userStats.steps.push({
                        stepKey: step.stepKey,
                        stepName: step.stepName,
                        allocatedTimeMs: step.allocatedTimeMs,
                        actualTimeMs: step.actualTimeMs,
                        remainingTimeMs: step.remainingTimeMs,
                        completedOnTime: onTime,
                        completedAt: step.actualEndAt,
                    });
                }
            } else if (step.status === 'IN_PROGRESS') {
                userStats.inProgressSteps++;
            }
        });

        // Get entity name
        const entityName = await this.getEntityName(entityType, entityId);

        return {
            entityType,
            entityId,
            entityName,
            totalSteps: allSteps.length,
            completedSteps: allSteps.filter(s => s.status === 'COMPLETED').length,
            userPerformance: Array.from(userPerformance.values()),
        };
    }

    /**
     * Get performance trends over time
     */
    async getPerformanceTrends(
        userId?: string,
        entityType?: string,
        dateFrom?: Date,
        dateTo?: Date
    ) {
        this.logger.log('Getting performance trends');

        const conditions: SQL[] = [];

        if (userId) {
            conditions.push(eq(stepInstances.assignedToUserId, parseInt(userId)));
        }

        if (entityType) {
            conditions.push(eq(stepInstances.entityType, entityType as any));
        }

        if (dateFrom && dateTo) {
            conditions.push(between(stepInstances.actualEndAt, dateFrom, dateTo));
        }

        const completedSteps = await this.db
            .select({
                completedAt: stepInstances.actualEndAt,
                allocatedTimeMs: stepInstances.allocatedTimeMs,
                actualTimeMs: stepInstances.actualTimeMs,
                remainingTimeMs: stepInstances.remainingTimeMs,
            })
            .from(stepInstances)
            .where(
                and(
                    eq(stepInstances.status, 'COMPLETED'),
                    ...(conditions.length > 0 ? conditions : [])
                )
            )
            .orderBy(stepInstances.actualEndAt);

        // Group by week
        const weeklyStats = new Map<string, {
            week: string;
            totalCompleted: number;
            onTime: number;
            late: number;
            avgTimeUsed: number;
        }>();

        completedSteps.forEach(step => {
            if (!step.completedAt || !step.allocatedTimeMs || step.actualTimeMs === null) {
                return;
            }

            const week = this.getWeekKey(step.completedAt);

            if (!weeklyStats.has(week)) {
                weeklyStats.set(week, {
                    week,
                    totalCompleted: 0,
                    onTime: 0,
                    late: 0,
                    avgTimeUsed: 0,
                });
            }

            const stats = weeklyStats.get(week)!;
            stats.totalCompleted++;

            const onTime = (step.remainingTimeMs || 0) >= 0;
            if (onTime) {
                stats.onTime++;
            } else {
                stats.late++;
            }

            const percentageUsed = (step.actualTimeMs / step.allocatedTimeMs) * 100;
            stats.avgTimeUsed = ((stats.avgTimeUsed * (stats.totalCompleted - 1)) + percentageUsed) / stats.totalCompleted;
        });

        return Array.from(weeklyStats.values()).map(week => ({
            ...week,
            onTimeRate: week.totalCompleted > 0 ? (week.onTime / week.totalCompleted) * 100 : 0,
            avgTimeUsed: parseFloat(week.avgTimeUsed.toFixed(2)),
        }));
    }

    /**
     * Get entity name for display
     */
    private async getEntityName(entityType: string, entityId: string): Promise<string> {
        if (entityType === 'TENDER') {
            const [tenderInfo] = await this.db
                .select({ tenderName: tenderInfos.tenderName })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, parseInt(entityId)))
                .limit(1);

            return tenderInfo?.tenderName || entityId;
        }

        // Add other entity types as needed
        return entityId;
    }

    /**
     * Get color for performance
     */
    private getColorForPerformance(
        percentageUsed: number | null,
        completedOnTime: boolean
    ): 'GREEN' | 'YELLOW' | 'RED' | 'GREY' {
        if (percentageUsed === null) return 'GREY';
        if (!completedOnTime) return 'RED';
        if (percentageUsed >= 80 && percentageUsed < 100) return 'YELLOW';
        return 'GREEN';
    }

    /**
     * Get week key for grouping (YYYY-WW)
     */
    private getWeekKey(date: Date): string {
        const year = date.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

        return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    /**
     * Format duration for display
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
