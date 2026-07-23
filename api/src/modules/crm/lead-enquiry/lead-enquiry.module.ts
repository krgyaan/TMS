import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { GoogleIntegrationModule } from '@/modules/integrations/google/google.module';
import { LeadEnquiryController } from './lead-enquiry.controller';
import { LeadEnquiryService } from './lead-enquiry.service';

@Module({
    imports: [DatabaseModule, GoogleIntegrationModule],
    controllers: [LeadEnquiryController],
    providers: [LeadEnquiryService],
    exports: [LeadEnquiryService],
})
export class LeadEnquiryModule {}
