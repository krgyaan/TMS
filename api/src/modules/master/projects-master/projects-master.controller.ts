import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";

import { ProjectsMasterService } from "./projects-master.service";

@Controller("projects-master")
export class ProjectsMasterController {
    constructor(private readonly service: ProjectsMasterService) {}

    @Get()
    async getAllProjectsMaster() {
        return this.service.getAllProjectsMaster();
    }

    @Get(":id")
    async getProjectMasterById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getProjectMasterById(id);
    }
}
