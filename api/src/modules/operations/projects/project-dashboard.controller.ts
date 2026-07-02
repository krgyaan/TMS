import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, Put, Delete, Res, NotFoundException } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

import { ProjectDashboardService } from "./project-dashboard.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

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
  createPurchaseOrder(@Body() body: any, @CurrentUser() user: ValidatedUser) {
    return this.service.createPurchaseOrder(body, user.id);
  }

  // Create Party
  @Post("purchase-orders/parties")
  @HttpCode(HttpStatus.CREATED)
  createParty(@Body() body: any) {
    return this.service.createParty(body);
  }

  // List Parties
  @Get("purchase-orders/parties")
  listParties(@Query("type") type?: string) {
    return this.service.listParties(type);
  }

  // Get next PO number preview
  @Get("purchase-orders/next-number")
  getNextPONumber(@Query("projectName") projectName: string) {
    return this.service.generatePONumber(projectName);
  }

  // List all POs (cross-project)
  @Get("purchase-orders")
  getAllPurchaseOrders() {
    return this.service.getAllPurchaseOrders();
  }

  // List PDF versions
  @Get("purchase-orders/:id/pdf/versions")
  getPurchaseOrderPdfVersions(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPurchaseOrderPdfVersions(id);
  }

  // Delete a PDF version
  @Delete("purchase-orders/:id/pdf/versions/:version")
  @HttpCode(HttpStatus.OK)
  deletePdfVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("version") version: string,
  ) {
    return this.service.deletePdfVersion(id, version);
  }

  // Serve PO PDF (optional version query param)
  @Get("purchase-orders/:id/pdf")
  async getPurchaseOrderPdf(
    @Param("id", ParseIntPipe) id: number,
    @Query("version") version: string | undefined,
    @Res() res: Response,
  ) {
    const { path: relPath, filename } = await this.service.getPurchaseOrderPdf(id, version);
    const absolutePath = join(process.cwd(), "uploads", "tendering", relPath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException("PDF file not found on disk");
    }

    const fileStream = createReadStream(absolutePath);
    fileStream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error streaming PDF");
      }
    });

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
      @Body() body: any,
      @CurrentUser() user: ValidatedUser,
  ) {
      return this.service.updatePurchaseOrder(id, body, user.id);
}
}