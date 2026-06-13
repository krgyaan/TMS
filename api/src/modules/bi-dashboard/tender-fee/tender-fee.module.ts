import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderFeeController } from './tender-fee.controller';
import { TenderFeeService } from './tender-fee.service';
import { DemandDraftModule } from '@/modules/bi-dashboard/demand-draft/demand-draft.module';
import { PayOnPortalModule } from '@/modules/bi-dashboard/pay-on-portal/pay-on-portal.module';
import { BankTransferModule } from '@/modules/bi-dashboard/bank-transfer/bank-transfer.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, DemandDraftModule, PayOnPortalModule, BankTransferModule],
    controllers: [TenderFeeController],
    providers: [TenderFeeService],
    exports: [TenderFeeService],
})
export class TenderFeeModule { }
