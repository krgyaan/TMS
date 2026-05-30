import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Put,
} from "@nestjs/common";

import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  // ── Parallel dashboard endpoints ──

  @Get(":id/overview")
  getOverview(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOverview(id);
  }

  @Get(":id/work-orders")
  getWorkOrders(@Param("id", ParseIntPipe) id: number) {
    return this.service.getWorkOrders(id);
  }

  @Get(":id/purchase-orders")
  getProjectPurchaseOrders(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPurchaseOrders(id);
  }

  @Get(":id/imprests")
  getImprests(@Param("id", ParseIntPipe) id: number) {
    return this.service.getImprests(id);
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

  @Put("purchase-orders/:id")
  @HttpCode(HttpStatus.OK)
  updatePurchaseOrder(
      @Param("id", ParseIntPipe) id: number,
      @Body() body: any
  ) {
      return this.service.updatePurchaseOrder(id, body);
}
}