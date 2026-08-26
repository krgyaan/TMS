import { DatabaseModule } from "@/db/database.module";
import { Module } from "@nestjs/common";
import { FileUploadModule } from "@/modules/file-upload/file-upload.module";
import { ProjectClosureController } from "./project-closure.controller";
import { ProjectClosureService } from "./project-closure.service";
import { ProjectDashboardController } from "./project-dashboard.controller";
import { ProjectDashboardService } from "./project-dashboard.service";

@Module({
    imports: [DatabaseModule, FileUploadModule],
    providers: [ProjectDashboardService, ProjectClosureService],
    controllers: [ProjectDashboardController, ProjectClosureController],
    exports: [ProjectDashboardService, ProjectClosureService],
})
export class ProjectDashboardModule {}
