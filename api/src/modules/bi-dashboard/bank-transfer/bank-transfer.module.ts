import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BankTransferController } from './bank-transfer.controller';
import { BankTransferService } from './bank-transfer.service';

@Module({
    imports: [DatabaseModule],
    controllers: [BankTransferController],
    providers: [BankTransferService],
    exports: [BankTransferService],
})
export class BankTransferModule {}
