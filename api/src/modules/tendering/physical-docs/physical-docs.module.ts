import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { PhysicalDocsController } from '@/modules/tendering/physical-docs/physical-docs.controller';
import { PhysicalDocsService } from '@/modules/tendering/physical-docs/physical-docs.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';
import { TimersModule } from '@/modules/timers/timers.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule, TimersModule],
    controllers: [PhysicalDocsController],
    providers: [PhysicalDocsService],
    exports: [PhysicalDocsService],
})
export class PhysicalDocsModule { }
