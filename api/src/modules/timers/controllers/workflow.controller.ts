import { Controller, Post, Put, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowService } from '@/modules/timers/services/workflow.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@Controller('api/workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
    constructor(private readonly workflowService: WorkflowService) { }

    /**
     * Start a workflow for an entity
     * POST /api/workflows/start
     */
    @Post('start')
    @HttpCode(HttpStatus.CREATED)
    async startWorkflow(@Body() dto: any) {
        return this.workflowService.startWorkflow(dto);
    }

    /**
     * Get workflow status for an entity
     * GET /api/workflows/entity/:entityType/:entityId
     */
    @Get('entity/:entityType/:entityId')
    async getWorkflowStatus(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.workflowService.getWorkflowStatus(entityType, entityId);
    }

    /**
     * Start a step
     * POST /api/workflows/steps/:stepInstanceId/start
     */
    @Post('steps/:stepInstanceId/start')
    async startStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: any,
    ) {
        await this.workflowService.startStep(stepInstanceId, dto);
        return { message: 'Step started successfully' };
    }

    /**
     * Complete a step
     * POST /api/workflows/steps/:stepInstanceId/complete
     */
    @Post('steps/:stepInstanceId/complete')
    async completeStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: any,
        @CurrentUser() user: any,
    ) {
        await this.workflowService.completeStep(stepInstanceId, {
            ...dto,
            userId: user.id,
        });
        return { message: 'Step completed successfully' };
    }

    /**
     * Pause a step
     * POST /api/workflows/steps/:stepInstanceId/pause
     */
    @Post('steps/:stepInstanceId/pause')
    async pauseStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: any,
        @CurrentUser() user: any,
    ) {
        await this.workflowService.pauseStep(stepInstanceId, {
            ...dto,
            userId: user.id,
        });
        return { message: 'Step paused successfully' };
    }

    /**
     * Resume a step
     * POST /api/workflows/steps/:stepInstanceId/resume
     */
    @Post('steps/:stepInstanceId/resume')
    async resumeStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @CurrentUser() user: any,
    ) {
        await this.workflowService.resumeStep(stepInstanceId, user.id);
        return { message: 'Step resumed successfully' };
    }

    /**
     * Extend a step
     * POST /api/workflows/steps/:stepInstanceId/extend
     */
    @Post('steps/:stepInstanceId/extend')
    async extendStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { extensionHours: number; reason: string },
        @CurrentUser() user: any,
    ) {
        await this.workflowService.extendStep(stepInstanceId, {
            ...dto,
            userId: user.id,
        });
        return { message: 'Step extended successfully' };
    }

    /**
     * Reject a step
     * POST /api/workflows/steps/:stepInstanceId/reject
     */
    @Post('steps/:stepInstanceId/reject')
    async rejectStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { reason: string; shouldResetTimer: boolean },
        @CurrentUser() user: any,
    ) {
        await this.workflowService.rejectStep(stepInstanceId, {
            ...dto,
            userId: user.id,
        });
        return { message: 'Step rejected successfully' };
    }

    /**
     * Skip a step
     * POST /api/workflows/steps/:stepInstanceId/skip
     */
    @Post('steps/:stepInstanceId/skip')
    async skipStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { reason?: string },
        @CurrentUser() user: any,
    ) {
        await this.workflowService.skipStep(stepInstanceId, user.id, dto.reason);
        return { message: 'Step skipped successfully' };
    }

    /**
     * Cancel a step
     * POST /api/workflows/steps/:stepInstanceId/cancel
     */
    @Post('steps/:stepInstanceId/cancel')
    async cancelStep(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { reason?: string },
        @CurrentUser() user: any,
    ) {
        await this.workflowService.cancelStep(stepInstanceId, user.id, dto.reason);
        return { message: 'Step cancelled successfully' };
    }
}
