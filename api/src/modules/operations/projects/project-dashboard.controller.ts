import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ProjectDashboardService } from "./project-dashboard.service";

@Controller("projects")
export class ProjectDashboardController {
  constructor(private readonly service: ProjectDashboardService) {}

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