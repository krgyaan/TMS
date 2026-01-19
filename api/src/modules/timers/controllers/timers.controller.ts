// src/modules/timers/controllers/timers.controller.ts
import { Controller, Post, Put, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TimerEngineService } from '@/modules/timers/services/timer-engine.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@Controller('timers')
@UseGuards(JwtAuthGuard)
export class TimersController {
    constructor(private readonly timerEngine: TimerEngineService) { }

    /**
     * Start a timer for a step instance
     * POST /timers/:stepInstanceId/start
     */
    @Post(':stepInstanceId/start')
    @HttpCode(HttpStatus.OK)
    async startTimer(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { customDurationHours?: number; customDeadline?: string },
    ) {
        const customDeadline = dto.customDeadline ? new Date(dto.customDeadline) : undefined;
        return this.timerEngine.startTimer({
            stepInstanceId,
            customDurationHours: dto.customDurationHours,
            customDeadline,
        });
    }

    /**
     * Stop a timer
     * POST /timers/:stepInstanceId/stop
     */
    @Post(':stepInstanceId/stop')
    @HttpCode(HttpStatus.OK)
    async stopTimer(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.stopTimer(stepInstanceId);
    }

    /**
     * Pause a timer
     * POST /timers/:stepInstanceId/pause
     */
    @Post(':stepInstanceId/pause')
    @HttpCode(HttpStatus.OK)
    async pauseTimer(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.pauseTimer(stepInstanceId);
    }

    /**
     * Resume a paused timer
     * POST /timers/:stepInstanceId/resume
     */
    @Post(':stepInstanceId/resume')
    @HttpCode(HttpStatus.OK)
    async resumeTimer(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.resumeTimer(stepInstanceId);
    }

    /**
     * Extend a timer
     * POST /timers/:stepInstanceId/extend
     */
    @Post(':stepInstanceId/extend')
    @HttpCode(HttpStatus.OK)
    async extendTimer(
        @Param('stepInstanceId') stepInstanceId: string,
        @Body() dto: { extensionHours: number },
    ) {
        return this.timerEngine.extendTimer(stepInstanceId, dto.extensionHours);
    }

    /**
     * Cancel a timer
     * POST /timers/:stepInstanceId/cancel
     */
    @Post(':stepInstanceId/cancel')
    @HttpCode(HttpStatus.OK)
    async cancelTimer(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.cancelTimer(stepInstanceId);
    }

    /**
     * Get timer state
     * GET /timers/:stepInstanceId/state
     */
    @Get(':stepInstanceId/state')
    async getTimerState(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.calculateTimerState(stepInstanceId);
    }
}
