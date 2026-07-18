import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";

import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { PurchaseOrderService } from "./purchase-order.service";

@Controller("purchase-orders")
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}

  @Get("project/:projectId")
  getProjectPurchaseOrders(@Param("projectId", ParseIntPipe) projectId: number) {
    return this.service.getPurchaseOrders(projectId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPurchaseOrder(@Body() body: any, @CurrentUser() user: ValidatedUser) {
    return this.service.createPurchaseOrder(body, user.id);
  }

  @Post("parties")
  @HttpCode(HttpStatus.CREATED)
  createParty(@Body() body: any) {
    return this.service.createParty(body);
  }

  @Get("parties")
  listParties(@Query("type") type?: string) {
    return this.service.listParties(type);
  }

  @Get("next-number")
  getNextPONumber(@Query("projectName") projectName: string) {
    return this.service.generatePONumber(projectName);
  }

  @Get()
  getAllPurchaseOrders() {
    return this.service.getAllPurchaseOrders();
  }

  @Get(":id/pdf/versions")
  getPurchaseOrderPdfVersions(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPurchaseOrderPdfVersions(id);
  }

  @Delete(":id/pdf/versions/:version")
  @HttpCode(HttpStatus.OK)
  deletePdfVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("version") version: string,
  ) {
    return this.service.deletePdfVersion(id, version);
  }

  @Get(":id/pdf")
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

  @Get(":id")
  getPurchaseOrder(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPurchaseOrder(id);
  }

  @Put(":id/tds")
  @HttpCode(HttpStatus.OK)
  setTdsPercentage(
      @Param("id", ParseIntPipe) id: number,
      @Body() body: { approve: boolean; tdsPercentage?: number; remark?: string },
  ) {
      return this.service.setTdsPercentage(id, body);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  updatePurchaseOrder(
      @Param("id", ParseIntPipe) id: number,
      @Body() body: any,
      @CurrentUser() user: ValidatedUser,
  ) {
      return this.service.updatePurchaseOrder(id, body, user.id);
  }
}
