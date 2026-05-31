import { Module } from "@nestjs/common";
import { ProjectDashboardService } from "./project-dashboard.service";
import { ProjectDashboardController } from "./project-dashboard.controller";
import { DatabaseModule } from "@/db/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [ProjectDashboardService],
    controllers: [ProjectDashboardController],
    exports: [ProjectDashboardService],
})
export class ProjectDashboardModule {}
