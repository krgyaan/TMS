import { Module } from "@nestjs/common";
import { LocationPerformanceController } from "./location-performance.controller";
import { LocationPerformanceService } from "./location-performance.service";

@Module({
    controllers: [LocationPerformanceController],
    providers: [LocationPerformanceService],
})
export class LocationPerformanceModule {}
