import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TimerDashboardController } from './timer-dashboard.controller';
import { TimerDashboardService } from './timer-dashboard.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [TimerDashboardController],
    providers: [TimerDashboardService],
    exports: [TimerDashboardService],
})
export class TimerDashboardModule { }
