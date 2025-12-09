import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BidSubmissionsController } from '@/modules/tendering/bid-submissions/bid-submissions.controller';
import { BidSubmissionsService } from '@/modules/tendering/bid-submissions/bid-submissions.service';

@Module({
    imports: [DatabaseModule],
    controllers: [BidSubmissionsController],
    providers: [BidSubmissionsService],
    exports: [BidSubmissionsService],
})
export class BidSubmissionsModule { }
