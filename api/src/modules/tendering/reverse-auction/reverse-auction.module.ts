import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ReverseAuctionController } from '@/modules/tendering/reverse-auction/reverse-auction.controller';
import { ReverseAuctionService } from '@/modules/tendering/reverse-auction/reverse-auction.service';
import { TendersModule } from '@/modules/tendering/tenders/tenders.module';
import { TenderStatusHistoryModule } from '@/modules/tendering/tender-status-history/tender-status-history.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
    imports: [DatabaseModule, TendersModule, TenderStatusHistoryModule, EmailModule],
    controllers: [ReverseAuctionController],
    providers: [ReverseAuctionService],
    exports: [ReverseAuctionService],
})
export class ReverseAuctionModule { }
