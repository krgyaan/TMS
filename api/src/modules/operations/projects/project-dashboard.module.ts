import { Module } from "@nestjs/common";
import { ProjectDashboardService } from "./project-dashboard.service";
import { ProjectDashboardController } from "./project-dashboard.controller";
import { DatabaseModule } from "@/db/database.module";
import { PdfGeneratorService } from "@/modules/pdf/pdf-generator.service";
import { ClientDirectoryModule } from "@/modules/shared/client-directory/client-directory.module";

@Module({
    imports: [DatabaseModule, ClientDirectoryModule],
    providers: [ProjectDashboardService, PdfGeneratorService],
    controllers: [ProjectDashboardController],
    exports: [ProjectDashboardService],
})
export class ProjectDashboardModule {}
