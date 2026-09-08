import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderApprovalController } from '@/modules/tendering/tender-approval/tender-approval.controller';
import { TenderApprovalService } from '@/modules/tendering/tender-approval/tender-approval.service';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';
import { TenderInfoSheetsModule } from '../info-sheets/info-sheets.module';
import { ClientDirectoryModule } from '@/modules/shared/client-directory/client-directory.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule, ClientDirectoryModule, TenderInfoSheetsModule],
    controllers: [TenderApprovalController],
    providers: [TenderApprovalService],
})
export class TenderApprovalModule { }
