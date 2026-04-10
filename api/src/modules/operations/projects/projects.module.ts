import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { DatabaseModule } from "@/db/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [ProjectsService],
    controllers: [ProjectsController],
    exports: [ProjectsService],
})
export class ProjectsModule {}
