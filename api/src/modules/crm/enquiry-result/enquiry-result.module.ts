import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { EnquiryResultController } from './enquiry-result.controller';
import { EnquiryResultService } from './enquiry-result.service';

@Module({
    imports: [DatabaseModule],
    controllers: [EnquiryResultController],
    providers: [EnquiryResultService],
    exports: [EnquiryResultService],
})
export class EnquiryResultModule {}
