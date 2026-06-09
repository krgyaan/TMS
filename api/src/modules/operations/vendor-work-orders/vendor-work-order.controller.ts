import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, Delete, Res } from "@nestjs/common";
import { createReadStream } from "fs";
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

  @Get("parties")
  listParties(@Query("type") type?: string) {
    return this.service.listParties(type);
  }

  @Get("next-number")
  getNextWONumber(@Query("projectName") projectName: string) {
    return this.service.generateWONumber(projectName);
  }

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.service.getById(id);
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
    const fileStream = createReadStream(absolutePath);
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
