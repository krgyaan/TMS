import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderApprovalController } from '@/modules/tendering/tender-approval/tender-approval.controller';
import { TenderApprovalService } from '@/modules/tendering/tender-approval/tender-approval.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [TenderApprovalController],
    providers: [TenderApprovalService],
})
export class TenderApprovalModule { }
