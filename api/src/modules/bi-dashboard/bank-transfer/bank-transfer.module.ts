import { Module } from '@nestjs/common';
import { BankTransferController } from './bank-transfer.controller';
import { BankTransferService } from './bank-transfer.service';

@Module({
    controllers: [BankTransferController],
    providers: [BankTransferService],
    exports: [BankTransferService],
})
export class BankTransferModule {}
