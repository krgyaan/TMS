import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { EnquiryCostingController } from './enquirycosting.controller';
import { EnquiryCostingService } from './enquirycosting.service';

@Module({
    imports: [DatabaseModule],
    controllers: [EnquiryCostingController],
    providers: [EnquiryCostingService],
    exports: [EnquiryCostingService],
})
export class EnquiryCostingModule {}
