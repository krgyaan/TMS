import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BusinessCalendarService } from '@/modules/timers/services/business-calendar.service';
import { TimerEngineService } from '@/modules/timers/services/timer-engine.service';
import { WorkflowService } from '@/modules/timers/services/workflow.service';
import { AnalyticsService } from '@/modules/timers/services/analytics.service';
import { TimersController } from '@/modules/timers/controllers/timers.controller';
import { WorkflowController } from '@/modules/timers/controllers/workflow.controller';
import { AnalyticsController } from '@/modules/timers/controllers/analytics.controller';

@Module({
    imports: [DatabaseModule],
    providers: [
        BusinessCalendarService,
        TimerEngineService,
        WorkflowService,
        AnalyticsService,
    ],
    controllers: [
        TimersController,
        WorkflowController,
        AnalyticsController,
    ],
    exports: [
        BusinessCalendarService,
        TimerEngineService,
        WorkflowService,
        AnalyticsService,
    ],
})
export class TimersModule { }
