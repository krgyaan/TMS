import { Module } from '@nestjs/common';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './work-order.service';

@Module({
  controllers: [WorkOrderController],
  providers: [WorkOrderService]
})
export class WorkOrderModule {}
