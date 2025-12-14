import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderStatusHistoryService } from './tender-status-history.service';
import { TenderStatusHistoryController } from './tender-status-history.controller';

@Module({
    imports: [DatabaseModule],
    controllers: [TenderStatusHistoryController],
    providers: [TenderStatusHistoryService],
    exports: [TenderStatusHistoryService],
})
export class TenderStatusHistoryModule {}
