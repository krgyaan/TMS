import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderApprovalController } from '@/modules/tendering/tender-approval/tender-approval.controller';
import { TenderApprovalService } from '@/modules/tendering/tender-approval/tender-approval.service';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule],
    controllers: [TenderApprovalController],
    providers: [TenderApprovalService],
})
export class TenderApprovalModule { }
