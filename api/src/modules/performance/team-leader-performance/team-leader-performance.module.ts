import { Module } from "@nestjs/common";
import { TeamLeaderPerformanceController } from "./team-leader-performance.controller";
import { TeamLeaderPerformanceService } from "./team-leader-performance.service";

@Module({
    controllers: [TeamLeaderPerformanceController],
    providers: [TeamLeaderPerformanceService],
})
export class TeamLeaderPerformanceModule {}
