import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LoanAdvanceController } from './loan-advance.controller';
import { LoanAdvanceService } from './loan-advance.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LoanAdvanceController],
    providers: [LoanAdvanceService],
    exports: [LoanAdvanceService],
})
export class LoanAdvanceModule { }
