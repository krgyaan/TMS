import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LoanPartiesController } from '@/modules/master/loan-parties/loan-parties.controller';
import { LoanPartiesService } from '@/modules/master/loan-parties/loan-parties.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LoanPartiesController],
    providers: [LoanPartiesService],
    exports: [LoanPartiesService],
})
export class LoanPartiesModule { }
