import { Module } from '@nestjs/common';
import { BankGuaranteeController } from './bank-guarantee.controller';
import { BankGuaranteeService } from './bank-guarantee.service';

@Module({
    controllers: [BankGuaranteeController],
    providers: [BankGuaranteeService],
    exports: [BankGuaranteeService],
})
export class BankGuaranteeModule {}
