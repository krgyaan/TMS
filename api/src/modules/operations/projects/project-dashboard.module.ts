import { DatabaseModule } from "@/db/database.module";
import { Module } from "@nestjs/common";
import { ProjectDashboardController } from "./project-dashboard.controller";
import { ProjectDashboardService } from "./project-dashboard.service";

@Module({
    imports: [DatabaseModule],
    providers: [ProjectDashboardService],
    controllers: [ProjectDashboardController],
    exports: [ProjectDashboardService],
})
export class ProjectDashboardModule {}
