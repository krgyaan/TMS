import { Module } from "@nestjs/common";
import { ProjectsMasterController } from "./projects-master.controller";
import { ProjectsMasterService } from "./projects-master.service";

@Module({
    controllers: [ProjectsMasterController],
    providers: [ProjectsMasterService],
})
export class ProjectsMasterModule {}
