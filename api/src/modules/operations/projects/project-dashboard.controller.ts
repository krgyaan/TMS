import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Put,
  Res,
} from "@nestjs/common";
import { createReadStream } from "fs";
import { join } from "path";
import type { Response } from "express";

import { ProjectDashboardService } from "./project-dashboard.service";

@Controller("projects")
export class ProjectDashboardController {
  constructor(private readonly service: ProjectDashboardService) {}

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

  // Get next PO number preview
  @Get("purchase-orders/next-number")
  getNextPONumber(@Query("projectName") projectName: string) {
    return this.service.generatePONumber(projectName);
  }

  // Serve PO PDF
  @Get("purchase-orders/:id/pdf")
  async getPurchaseOrderPdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const { path: relPath, filename } = await this.service.getPurchaseOrderPdf(id);
    const absolutePath = join(process.cwd(), "uploads", "tendering", relPath);
    const fileStream = createReadStream(absolutePath);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    });
    fileStream.pipe(res);
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