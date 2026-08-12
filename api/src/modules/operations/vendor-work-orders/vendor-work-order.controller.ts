import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, Delete, Res, NotFoundException, Patch } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

import { VendorWorkOrderService } from "./vendor-work-order.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

@Controller("vendor-work-orders")
export class VendorWorkOrderController {
  constructor(private readonly service: VendorWorkOrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any, @CurrentUser() user: ValidatedUser) {
    return this.service.create(body, user.id);
  }

  @Put(":id")
  @HttpCode(HttpStatus.OK)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: ValidatedUser,
  ) {
    return this.service.update(id, body, user.id);
  }

  @Post("parties")
  @HttpCode(HttpStatus.CREATED)
  createParty(@Body() body: any) {
    return this.service.createParty(body);
  }

  @Patch("parties/:id")
  @HttpCode(HttpStatus.OK)
  updateParty(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateParty(id, body);
  }

  @Patch("parties/:id/activate")
  @HttpCode(HttpStatus.OK)
  activateParty(@Param("id", ParseIntPipe) id: number) {
    return this.service.activateParty(id);
  }

  @Patch("parties/:id/deactivate")
  @HttpCode(HttpStatus.OK)
  deactivateParty(@Param("id", ParseIntPipe) id: number) {
    return this.service.deactivateParty(id);
  }

  @Get("parties")
  listParties(@Query("type") type?: string) {
    return this.service.listParties(type);
  }

  @Get("next-number")
  getNextWONumber(@Query("projectName") projectName: string) {
    return this.service.generateWONumber(projectName);
  }

  @Get("approval-counts")
  getApprovalCounts(
    @Query("section") section?: string,
    @CurrentUser() user?: ValidatedUser,
  ) {
    return this.service.getApprovalCounts(section, user);
  }

  @Get()
  getAll(
    @Query("status") status?: string,
    @Query("section") section?: string,
    @CurrentUser() user?: ValidatedUser,
  ) {
    return this.service.getAll(status, section, user);
  }

  @Put(":id/approval")
  @HttpCode(HttpStatus.OK)
  setApproval(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { approve: boolean; tdsPercentage?: number; remark?: string },
  ) {
    return this.service.setVwoApproval(id, body);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get(":id/closure-status")
  getClosureStatus(@Param("id", ParseIntPipe) id: number) {
    return this.service.checkClosure(id);
  }

  @Get(":id/closure")
  getClosure(@Param("id", ParseIntPipe) id: number) {
    return this.service.getVendorWorkOrderClosure(id);
  }

  @Post(":id/close")
  @HttpCode(HttpStatus.OK)
  closeVendorWorkOrder(@Param("id", ParseIntPipe) id: number) {
    return this.service.closeVendorWorkOrder(id);
  }

  @Post(":id/bulk-payment-requests")
  @HttpCode(HttpStatus.CREATED)
  bulkCreatePaymentRequests(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { items: any[] },
    @CurrentUser() user: ValidatedUser,
  ) {
    return this.service.bulkCreatePaymentRequests(id, body?.items ?? [], user.id);
  }

  @Post(":id/bulk-purchase-invoices")
  @HttpCode(HttpStatus.CREATED)
  bulkCreatePurchaseInvoices(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { items: any[] },
    @CurrentUser() user: ValidatedUser,
  ) {
    return this.service.bulkCreatePurchaseInvoices(id, body?.items ?? [], user.id);
  }

  @Get("project/:projectId")
  getByProject(@Param("projectId", ParseIntPipe) projectId: number) {
    return this.service.getByProject(projectId);
  }

  @Get(":id/pdf")
  async getPdf(
    @Param("id", ParseIntPipe) id: number,
    @Query("version") version: string | undefined,
    @Res() res: Response,
  ) {
    const { path: relPath, filename } = await this.service.getPdf(id, version);
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

  @Get(":id/pdf/versions")
  getPdfVersions(@Param("id", ParseIntPipe) id: number) {
    return this.service.getPdfVersions(id);
  }

  @Delete(":id/pdf/versions/:version")
  @HttpCode(HttpStatus.OK)
  deletePdfVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("version") version: string,
  ) {
    return this.service.deletePdfVersion(id, version);
  }
}
