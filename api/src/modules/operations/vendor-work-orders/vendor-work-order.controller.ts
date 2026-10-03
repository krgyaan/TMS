import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus, Delete, Res, NotFoundException, Patch, UseGuards } from "@nestjs/common";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import type { Response } from "express";

import { VendorWorkOrderService } from "./vendor-work-order.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAnyPermission } from "@/modules/auth/decorators";
import type { PermissionRequirement } from "@/modules/auth/guards/permission.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

// Same dual-module situation as PurchaseOrderController: this serves /operations
// and /accounts (picked by the `section` query param), so a permission has to
// accept either module string. PermissionGuard is a no-op without metadata, so
// the remaining routes stay unguarded until they opt in.
const eitherModule = (accounts: string, ops: string, action: string): PermissionRequirement[] => [
    { module: accounts, action },
    { module: ops, action },
];

const PAYMENT_REQUESTS = ["accounts.payment-requests", "ops.payment-requests"] as const;
const PURCHASE_INVOICES = ["accounts.purchase-invoices", "ops.purchase-invoices"] as const;
const WORK_ORDER_MODULES = ["accounts.vendor-work-orders", "ops.vendor-work-orders"] as const;

@Controller("vendor-work-orders")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VendorWorkOrderController {
    constructor(private readonly service: VendorWorkOrderService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.create(body, user.id);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: ValidatedUser) {
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
    activateParty(@Param("id", ParseIntPipe) id: number, @Query("source") source?: string) {
        return this.service.activateParty(id, source);
    }

    @Patch("parties/:id/deactivate")
    @HttpCode(HttpStatus.OK)
    deactivateParty(@Param("id", ParseIntPipe) id: number, @Query("source") source?: string) {
        return this.service.deactivateParty(id, source);
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
    getApprovalCounts(@Query("section") section?: string, @CurrentUser() user?: ValidatedUser) {
        return this.service.getApprovalCounts(section, user);
    }

    @Get()
    getAll(@Query("status") status?: string, @Query("section") section?: string, @CurrentUser() user?: ValidatedUser) {
        return this.service.getAll(status, section, user);
    }

    @Put(":id/approval")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...WORK_ORDER_MODULES, "approve"))
    setApproval(@Param("id", ParseIntPipe) id: number, @Body() body: { approve: boolean; tdsPercentage?: number; remark?: string }, @CurrentUser() user: ValidatedUser) {
        return this.service.setVwoApproval(id, body, user?.id);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Get(":id/closure-status")
    @RequireAnyPermission(...eitherModule(...WORK_ORDER_MODULES, "read"))
    getClosureStatus(@Param("id", ParseIntPipe) id: number) {
        return this.service.checkClosure(id);
    }

    @Get(":id/closure")
    @RequireAnyPermission(...eitherModule(...WORK_ORDER_MODULES, "read"))
    getClosure(@Param("id", ParseIntPipe) id: number) {
        return this.service.getVendorWorkOrderClosure(id);
    }

    @Post(":id/close")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...WORK_ORDER_MODULES, "close"))
    closeVendorWorkOrder(@Param("id", ParseIntPipe) id: number) {
        return this.service.closeVendorWorkOrder(id);
    }

    @Post(":id/bulk-payment-requests")
    @HttpCode(HttpStatus.CREATED)
    @RequireAnyPermission(...eitherModule(...PAYMENT_REQUESTS, "create"))
    bulkCreatePaymentRequests(@Param("id", ParseIntPipe) id: number, @Body() body: { items: any[] }, @CurrentUser() user: ValidatedUser) {
        return this.service.bulkCreatePaymentRequests(id, body?.items ?? [], user.id);
    }

    @Post(":id/bulk-purchase-invoices")
    @HttpCode(HttpStatus.CREATED)
    @RequireAnyPermission(...eitherModule(...PURCHASE_INVOICES, "create"))
    bulkCreatePurchaseInvoices(@Param("id", ParseIntPipe) id: number, @Body() body: { items: any[] }, @CurrentUser() user: ValidatedUser) {
        return this.service.bulkCreatePurchaseInvoices(id, body?.items ?? [], user.id);
    }

    @Put(":id/payment-requests/:prId")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PAYMENT_REQUESTS, "update"))
    updatePaymentRequest(@Param("id", ParseIntPipe) id: number, @Param("prId", ParseIntPipe) prId: number, @Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.updatePaymentRequest(id, prId, body, user.id);
    }

    @Delete(":id/payment-requests/:prId")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PAYMENT_REQUESTS, "delete"))
    deletePaymentRequest(@Param("id", ParseIntPipe) id: number, @Param("prId", ParseIntPipe) prId: number, @CurrentUser() user: ValidatedUser) {
        return this.service.deletePaymentRequest(id, prId, user.id);
    }

    @Put(":id/purchase-invoices/:piId")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PURCHASE_INVOICES, "update"))
    updatePurchaseInvoice(@Param("id", ParseIntPipe) id: number, @Param("piId", ParseIntPipe) piId: number, @Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.updatePurchaseInvoice(id, piId, body, user.id);
    }

    @Delete(":id/purchase-invoices/:piId")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PURCHASE_INVOICES, "delete"))
    deletePurchaseInvoice(@Param("id", ParseIntPipe) id: number, @Param("piId", ParseIntPipe) piId: number, @CurrentUser() user: ValidatedUser) {
        return this.service.deletePurchaseInvoice(id, piId, user.id);
    }

    @Get("project/:projectId")
    getByProject(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getByProject(projectId);
    }

    @Get(":id/pdf")
    async getPdf(@Param("id", ParseIntPipe) id: number, @Query("version") version: string | undefined, @Res() res: Response) {
        const { path: relPath, filename } = await this.service.getPdf(id, version);
        const absolutePath = join(process.cwd(), "uploads", relPath);

        if (!existsSync(absolutePath)) {
            throw new NotFoundException("PDF file not found on disk");
        }

        const fileStream = createReadStream(absolutePath);
        fileStream.on("error", err => {
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
    deletePdfVersion(@Param("id", ParseIntPipe) id: number, @Param("version") version: string) {
        return this.service.deletePdfVersion(id, version);
    }
}
