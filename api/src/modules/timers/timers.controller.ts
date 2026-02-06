import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { TimersService } from './timers.service';
import type { StartTimerInput, TimerActionInput, ExtendTimerInput } from './timer.types';

@Controller('timers')
export class TimersController {
    constructor(private readonly timersService: TimersService) { }

    @Post('start')
    async startTimer(@Body() body: StartTimerInput) {
        const timer = await this.timersService.startTimer(body);
        return { success: true, message: 'Timer started', timer };
    }

    @Post('stop')
    async stopTimer(@Body() body: TimerActionInput) {
        const timer = await this.timersService.stopTimer(body);
        return { success: true, message: 'Timer stopped', timer };
    }

    @Post('pause')
    async pauseTimer(@Body() body: TimerActionInput) {
        const timer = await this.timersService.pauseTimer(body);
        return { success: true, message: 'Timer paused', timer };
    }

    @Post('resume')
    async resumeTimer(@Body() body: TimerActionInput) {
        const timer = await this.timersService.resumeTimer(body);
        return { success: true, message: 'Timer resumed', timer };
    }

    @Post('cancel')
    async cancelTimer(@Body() body: TimerActionInput) {
        const timer = await this.timersService.cancelTimer(body);
        return { success: true, message: 'Timer cancelled', timer };
    }

    @Post('extend')
    async extendTimer(@Body() body: ExtendTimerInput) {
        const timer = await this.timersService.extendTimer(body);
        return { success: true, message: 'Timer extended', timer };
    }

    @Get(':entityType/:entityId')
    async getTimers(
        @Param('entityType') entityType: string,
        @Param('entityId', ParseIntPipe) entityId: number,
        @Query('stage') stage?: string,
    ) {
        if (stage) {
            const timer = await this.timersService.getTimer(entityType, entityId, stage);
            return timer || { message: 'Timer not found' };
        }
        return this.timersService.getTimers(entityType, entityId);
    }

    @Get(':entityType/:entityId/active')
    async getActiveTimers(
        @Param('entityType') entityType: string,
        @Param('entityId', ParseIntPipe) entityId: number,
    ) {
        return this.timersService.getActiveTimers(entityType, entityId);
    }

    @Get(':entityType/:entityId/:stage/events')
    async getTimerEvents(
        @Param('entityType') entityType: string,
        @Param('entityId', ParseIntPipe) entityId: number,
        @Param('stage') stage: string,
    ) {
        return this.timersService.getTimerEvents(entityType, entityId, stage);
    }
}
