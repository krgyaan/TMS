import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadsQuotationModule } from '@/modules/crm/leads-quotation/leads-quotation.module';
import { EnquiryCostingController } from './enquirycosting.controller';
import { EnquiryCostingService } from './enquirycosting.service';

@Module({
    imports: [DatabaseModule, LeadsQuotationModule],
    controllers: [EnquiryCostingController],
    providers: [EnquiryCostingService],
    exports: [EnquiryCostingService],
})
export class EnquiryCostingModule {}
