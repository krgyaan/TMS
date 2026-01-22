import { Module } from "@nestjs/common";
import { TenderExecutiveController } from "./tender-executive-performance.controller";
import { TenderExecutiveService } from "./tender-executive-performance.service";
@Module({
    controllers: [TenderExecutiveController],
    providers: [TenderExecutiveService],
})
export class TenderExecutivePerformanceModule {}
