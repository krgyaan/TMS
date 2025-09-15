import { Module } from '@nestjs/common';
import { TenderStatusService } from './tender-status.service';
import { TenderStatusController } from './tender-status.controller';
import { DatabaseModule } from '../../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TenderStatusController],
  providers: [TenderStatusService],
})
export class TenderStatusModule {}
