import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ReverseAuctionController } from '@/modules/tendering/reverse-auction/reverse-auction.controller';
import { ReverseAuctionService } from '@/modules/tendering/reverse-auction/reverse-auction.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ReverseAuctionController],
    providers: [ReverseAuctionService],
    exports: [ReverseAuctionService],
})
export class ReverseAuctionModule { }
