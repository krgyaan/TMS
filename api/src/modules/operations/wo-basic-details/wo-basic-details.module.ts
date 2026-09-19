import { Module } from '@nestjs/common';
import { WoBasicDetailsController } from './wo-basic-details.controller';
import { WoBasicDetailsService } from './wo-basic-details.service';
import { DatabaseModule } from '@/db/database.module';
import { ProjectsMasterModule } from '@/modules/shared/projects-master/projects-master.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { PaymentRequestModule } from '../payment-requests/payment-request.module';
import { CashFlowModule } from '@/modules/operations/cash-flows/cash-flow.module';

@Module({
    imports: [DatabaseModule, ProjectsMasterModule, TenderStatusHistoryModule, PaymentRequestModule, CashFlowModule],
    controllers: [WoBasicDetailsController],
    providers: [WoBasicDetailsService]
})
export class WoBasicDetailsModule { }
