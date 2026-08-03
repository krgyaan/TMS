import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ProjectDashboardService } from "./project-dashboard.service";

@Controller("projects")
export class ProjectDashboardController {
    constructor(private readonly service: ProjectDashboardService) {}

    @Get("list")
    getProjectList(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("teamName") teamName?: string,
        @Query("teamId") teamId?: string
    ) {
        return this.service.getProjectList({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search: search || undefined,
            teamName: teamName || undefined,
            teamId: teamId ? Number(teamId) : undefined,
        });
    }

    @Get(":id/overview")
    getOverview(@Param("id", ParseIntPipe) id: number) {
        return this.service.getOverview(id);
    }

    @Get(":id/work-orders")
    getWorkOrders(@Param("id", ParseIntPipe) id: number) {
        return this.service.getWorkOrders(id);
    }

    @Get(":id/imprests")
    getImprests(@Param("id", ParseIntPipe) id: number) {
        return this.service.getImprests(id);
    }
}
