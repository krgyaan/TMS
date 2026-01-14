import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { TimerEngineService } from '@/modules/timers/services/timer-engine.service';

@Controller('api/timers')
@UseGuards(JwtAuthGuard)
export class TimersController {
    constructor(private readonly timerEngine: TimerEngineService) { }

    /**
     * Get timer state for a step instance
     * GET /api/timers/:stepInstanceId/state
     */
    @Get(':stepInstanceId/state')
    async getTimerState(@Param('stepInstanceId') stepInstanceId: string) {
        return this.timerEngine.calculateTimerState(stepInstanceId);
    }
}
