import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { TendersModule } from '../tenders/tenders.module';
import { TenderApprovalController } from './tender-approval.controller';
import { TenderApprovalService } from './tender-approval.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [TenderApprovalController],
    providers: [TenderApprovalService],
})
export class TenderApprovalModule { }
