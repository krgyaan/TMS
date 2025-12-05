import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderInfoController } from '@/modules/tendering/tenders/tenders.controller';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TenderInfoController],
    providers: [TenderInfosService],
    exports: [TenderInfosService],
})
export class TendersModule { }
