import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadEnquiryController } from './lead-enquiry.controller';
import { LeadEnquiryService } from './lead-enquiry.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadEnquiryController],
    providers: [LeadEnquiryService],
    exports: [LeadEnquiryService],
})
export class LeadEnquiryModule {}
