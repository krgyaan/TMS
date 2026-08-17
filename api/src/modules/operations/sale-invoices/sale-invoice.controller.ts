import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { SaleInvoiceService } from "./sale-invoice.service";

@Controller("sale-invoices")
export class SaleInvoiceController {
    constructor(private readonly service: SaleInvoiceService) {}

    @Get("wo-billing-data/:projectId")
    getWoBillingData(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getWoBillingData(projectId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.create(body, user.id);
    }

    @Get("project/:projectId")
    getByProject(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getByProject(projectId);
    }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Post(":id/create-draft")
    @HttpCode(HttpStatus.OK)
    createDraft(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: ValidatedUser) {
        return this.service.createDraft(id, user.id);
    }

    @Post(":id/approve")
    @HttpCode(HttpStatus.OK)
    approve(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: ValidatedUser) {
        return this.service.approve(id, user.id);
    }

    @Post(":id/request-changes")
    @HttpCode(HttpStatus.OK)
    requestChanges(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: { remark?: string },
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.service.requestChanges(id, body.remark ?? "", user.id);
    }

    @Post(":id/reject")
    @HttpCode(HttpStatus.OK)
    reject(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: { remark?: string },
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.service.reject(id, body.remark ?? "", user.id);
    }

    @Post(":id/finalize")
    @HttpCode(HttpStatus.OK)
    finalize(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: ValidatedUser) {
        return this.service.finalize(id, user.id);
    }

    @Patch(":id/status")
    updateStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: { status: string; invoiceDocPaths?: string[] },
    ) {
        return this.service.updateStatus(id, body);
    }

    @Patch(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: Record<string, any>,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.service.update(id, body, user.id);
    }

    @Get(":id/pdf/versions")
    getPdfVersions(@Param("id", ParseIntPipe) id: number) {
        return this.service.getSaleInvoicePdfVersions(id);
    }

    @Delete(":id/pdf/versions/:version")
    @HttpCode(HttpStatus.OK)
    deletePdfVersion(@Param("id", ParseIntPipe) id: number, @Param("version") version: string) {
        return this.service.deletePdfVersion(id, version);
    }

    @Get(":id/pdf")
    async getPdf(
        @Param("id", ParseIntPipe) id: number,
        @Query("version") version: string | undefined,
        @Res() res: Response,
    ) {
        const { path: relPath, filename } = await this.service.getSaleInvoicePdf(id, version);
        const absolutePath = join(process.cwd(), "uploads", relPath);

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
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }
}