import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CostingApprovalsController } from '@/modules/tendering/costing-approvals/costing-approvals.controller';
import { CostingApprovalsService } from '@/modules/tendering/costing-approvals/costing-approvals.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CostingApprovalsController],
    providers: [CostingApprovalsService],
    exports: [CostingApprovalsService],
})
export class CostingApprovalsModule { }
