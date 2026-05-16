import { Module } from "@nestjs/common";
import { BusinessPerformanceController } from "./business-performance.controller";
import { BusinessPerformanceService } from "./business-performance.service";

@Module({
    controllers: [BusinessPerformanceController],
    providers: [BusinessPerformanceService],
})
export class BusinessPerformanceModule {}
