import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TenderResultController } from '@/modules/tendering/tender-result/tender-result.controller';
import { TenderResultService } from '@/modules/tendering/tender-result/tender-result.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TenderResultController],
    providers: [TenderResultService],
    exports: [TenderResultService],
})
export class TenderResultModule { }
