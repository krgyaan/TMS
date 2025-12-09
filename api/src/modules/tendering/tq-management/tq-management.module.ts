import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TqManagementController } from '@/modules/tendering/tq-management/tq-management.controller';
import { TqManagementService } from '@/modules/tendering/tq-management/tq-management.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TqManagementController],
    providers: [TqManagementService],
    exports: [TqManagementService],
})
export class TqManagementModule { }
