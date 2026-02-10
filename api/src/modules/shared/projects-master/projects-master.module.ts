import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { ProjectsMasterController } from "./projects-master.controller";
import { ProjectsMasterService } from "./projects-master.service";

@Module({
    imports: [DatabaseModule],
    controllers: [ProjectsMasterController],
    providers: [ProjectsMasterService],
    exports: [ProjectsMasterService],
})
export class ProjectsMasterModule { }
