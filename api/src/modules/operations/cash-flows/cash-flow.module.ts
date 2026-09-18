import { Module } from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';

@Module({
  providers: [CashFlowService],
  exports: [CashFlowService],
})
export class CashFlowModule {}