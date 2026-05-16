import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";

import { ProjectsMasterService } from "./projects-master.service";
import { CreateProjectSchema, UpdateProjectSchema, type CreateProjectDto, type UpdateProjectDto } from "./dto/projects-master.dto";

@Controller("document-dashboard/projects")
export class ProjectsMasterController {
    constructor(private readonly service: ProjectsMasterService) { }

    @Get()
    async list(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @Query("search") search?: string,
        @Query("teamName") teamName?: string,
        @Query("organisationId") organisationId?: string,
        @Query("itemId") itemId?: string,
        @Query("locationId") locationId?: string,
        @Query("fromDate") fromDate?: string,
        @Query("toDate") toDate?: string,
    ) {
        return this.service.findAll({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
            teamName,
            organisationId: organisationId ? parseInt(organisationId, 10) : undefined,
            itemId: itemId ? parseInt(itemId, 10) : undefined,
            locationId: locationId ? parseInt(locationId, 10) : undefined,
            fromDate,
            toDate,
        });
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateProjectSchema.parse(body) as CreateProjectDto;
        return this.service.create(parsed);
    }

    @Patch(":id")
    async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateProjectSchema.parse(body) as UpdateProjectDto;
        return this.service.update(id, parsed);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) {
        await this.service.delete(id);
    }
}
