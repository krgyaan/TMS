// src/modules/projects/projects.controller.ts

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get("/details/:projectId")
  getDashboard(@Param("projectId", ParseIntPipe) projectId: number) {
    return this.service.getDashboardData(projectId);
  }

  // Create Purchase Order
  @Post("purchase-orders")
  @HttpCode(HttpStatus.CREATED)
  createPurchaseOrder(@Body() body: any) {
    return this.service.createPurchaseOrder(body);
  }

  // Create Party
  @Post("purchase-orders/parties")
  @HttpCode(HttpStatus.CREATED)
  createParty(@Body() body: any) {
    return this.service.createParty(body);
  }

  // List Parties
  @Get("purchase-orders/parties")
  listParties() {
    return this.service.listParties();
  }

  // Get Purchase Order by ID
  @Get("purchase-orders/:id")
  getPurchaseOrder(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPurchaseOrder(id);
  }
}