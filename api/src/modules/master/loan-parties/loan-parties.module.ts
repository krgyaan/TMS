import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { LoanPartiesController } from './loan-parties.controller';
import { LoanPartiesService } from './loan-parties.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LoanPartiesController],
  providers: [LoanPartiesService],
})
export class LoanPartiesModule {}
