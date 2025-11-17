import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { TenderInfoController } from './tenders.controller';
import { TenderInfosService } from './tenders.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TenderInfoController],
    providers: [TenderInfosService],
    exports: [TenderInfosService],
})
export class TendersModule { }
