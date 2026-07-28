import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadsQuotationController } from './leads-quotation.controller';
import { LeadsQuotationService } from './leads-quotation.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadsQuotationController],
    providers: [LeadsQuotationService],
    exports: [LeadsQuotationService],
})
export class LeadsQuotationModule {}
