import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BankGuaranteeController } from './bank-guarantee.controller';
import { BankGuaranteeService } from './bank-guarantee.service';

@Module({
    imports: [DatabaseModule],
    controllers: [BankGuaranteeController],
    providers: [BankGuaranteeService],
    exports: [BankGuaranteeService],
})
export class BankGuaranteeModule {}
