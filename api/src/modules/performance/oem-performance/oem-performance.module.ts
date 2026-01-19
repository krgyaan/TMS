import { Module } from "@nestjs/common";
import { OemPerformanceController } from "./oem-performance.controller";
import { OemPerformanceService } from "./oem-performance.service";

@Module({
    controllers: [OemPerformanceController],
    providers: [OemPerformanceService],
})
export class OemDashboardModule {}
