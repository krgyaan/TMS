import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { AnalyticsService } from '@/modules/timers/services/analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ============================================
    // USER PERFORMANCE
    // ============================================

    /**
     * Get current user's performance summary
     * GET /api/analytics/my-performance
     */
    @Get('my-performance')
    async getMyPerformance(
        @CurrentUser() user: any,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;

        return this.analyticsService.getUserPerformanceSummary(user.id, from, to);
    }

    /**
     * Get user's performance on a specific entity
     * GET /api/analytics/users/:userId/entities/:entityType/:entityId
     */
    @Get('users/:userId/entities/:entityType/:entityId')
    async getUserEntityPerformance(
        @Param('userId') userId: string,
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.analyticsService.getUserEntityPerformance(userId, entityType, entityId);
    }

    /**
     * Get user's overall performance summary
     * GET /api/analytics/users/:userId/summary
     */
    @Get('users/:userId/summary')
    async getUserSummary(
        @Param('userId') userId: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;

        return this.analyticsService.getUserPerformanceSummary(userId, from, to);
    }

    // ============================================
    // TEAM PERFORMANCE
    // ============================================

    /**
     * Get team performance comparison
     * GET /api/analytics/team/comparison
     */
    @Get('team/comparison')
    async getTeamComparison(
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;

        return this.analyticsService.getTeamPerformanceComparison(from, to);
    }

    // ============================================
    // STEP PERFORMANCE
    // ============================================

    /**
     * Get performance analytics for a specific step
     * GET /api/analytics/steps/:stepKey
     */
    @Get('steps/:stepKey')
    async getStepAnalytics(@Param('stepKey') stepKey: string) {
        return this.analyticsService.getStepPerformanceAnalytics(stepKey);
    }

    /**
     * Get performance analytics for all steps in a workflow
     * GET /api/analytics/workflows/:workflowCode/steps
     */
    @Get('workflows/:workflowCode/steps')
    async getWorkflowStepAnalytics(@Param('workflowCode') workflowCode: string) {
        return this.analyticsService.getWorkflowStepAnalytics(workflowCode);
    }

    // ============================================
    // ENTITY PERFORMANCE
    // ============================================

    /**
     * Get all users' performance on a specific entity
     * GET /api/analytics/entities/:entityType/:entityId/performance
     */
    @Get('entities/:entityType/:entityId/performance')
    async getEntityPerformance(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.analyticsService.getEntityPerformance(entityType, entityId);
    }

    // ============================================
    // TRENDS
    // ============================================

    /**
     * Get performance trends over time
     * GET /api/analytics/trends
     */
    @Get('trends')
    async getPerformanceTrends(
        @Query('userId') userId?: string,
        @Query('entityType') entityType?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;

        return this.analyticsService.getPerformanceTrends(userId, entityType, from, to);
    }
}
