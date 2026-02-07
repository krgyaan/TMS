import { Controller, Get, Post, Param, Body, ParseIntPipe } from "@nestjs/common";

import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
    constructor(private readonly service: ProjectsService) {}

    @Get(":projectId")
    getDashboard(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getDashboardData(projectId);
    }

    // 🔹 Create Purchase Order
    @Post("purchase-orders")
    createPurchaseOrder(@Body() body: any) {
        return this.service.createPurchaseOrder(body);
    }

    // 🔹 View Purchase Order
    @Get("purchase-orders/:id")
    getPurchaseOrder(@Param("id", ParseIntPipe) id: number) {
        return this.service.getPurchaseOrder(id);
    }

    // 🔹 Create Project Party
    @Post("parties")
    createParty(@Body() body: any) {
        return this.service.createParty(body);
    }
}
