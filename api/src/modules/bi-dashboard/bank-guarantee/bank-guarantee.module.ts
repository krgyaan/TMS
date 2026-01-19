import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BankGuaranteeController } from './bank-guarantee.controller';
import { BankGuaranteeService } from './bank-guarantee.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';

@Module({
    imports: [DatabaseModule, FollowUpModule],
    controllers: [BankGuaranteeController],
    providers: [BankGuaranteeService],
    exports: [BankGuaranteeService],
})
export class BankGuaranteeModule {}
