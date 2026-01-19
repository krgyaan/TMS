import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CostingApprovalsController } from '@/modules/tendering/costing-approvals/costing-approvals.controller';
import { CostingApprovalsService } from '@/modules/tendering/costing-approvals/costing-approvals.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule],
    controllers: [CostingApprovalsController],
    providers: [CostingApprovalsService],
    exports: [CostingApprovalsService],
})
export class CostingApprovalsModule { }
