import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { TimerDashboardService } from './timer-dashboard.service';
import { TimersService } from '../timers/timers.service';
import { TimerActionInput } from '../timers/timer.types';

@Controller('timer-dashboard')
export class TimerDashboardController {
    constructor(
        private readonly timersService: TimersService,
        private readonly timerDashboardService: TimerDashboardService
    ) { }

    @Get('search')
    async search(
        @Query('by') by: string,
        @Query('value') value: string,
    ) {
        if (!by || !value) {
            throw new BadRequestException('Both "by" and "value" query parameters are required');
        }
        return this.timerDashboardService.search(by, value);
    }

    @Post('stop')
    async stop(
        @Body() body: { entityType: string; entityId: number; stage: string },
    ) {
        if (!body.entityType || !body.entityId || !body.stage) {
            throw new BadRequestException('entityType, entityId, and stage are required');
        }
        const input: TimerActionInput = {
            entityType: body.entityType,
            entityId: body.entityId,
            stage: body.stage,
            userId: 13, 
            reason: "Stopped via Timer Dashboard",
        }
        return this.timersService.stopTimer(input);
    }
}
