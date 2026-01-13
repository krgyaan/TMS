import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { BankTransferController } from './bank-transfer.controller';
import { BankTransferService } from './bank-transfer.service';

@Module({
    imports: [DatabaseModule, FollowUpModule],
    controllers: [BankTransferController],
    providers: [BankTransferService],
    exports: [BankTransferService],
})
export class BankTransferModule { }
