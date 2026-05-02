import { Module } from '@nestjs/common';
import { CustomerPerformanceController } from './customer-performance.controller';
import { CustomerPerformanceService } from './customer-performance.service';

@Module({
  controllers: [CustomerPerformanceController],
  providers: [CustomerPerformanceService]
})
export class CustomerPerformanceModule {}
