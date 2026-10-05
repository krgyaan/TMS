import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Res, Patch, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";

import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { RequireAnyPermission } from "@/modules/auth/decorators";
import type { PermissionRequirement } from "@/modules/auth/guards/permission.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { PurchaseOrderService } from "./purchase-order.service";

// This controller serves both the /accounts and the /operations section (the
// `section` query param picks which rows come back), so a permission has to
// accept either module string — otherwise gating one route would lock out the
// other section. PermissionGuard is a no-op on routes without metadata, so the
// ~38 routes annotated further down the line stay unguarded until they opt in.
const eitherModule = (accounts: string, ops: string, action: string): PermissionRequirement[] => [
    { module: accounts, action },
    { module: ops, action },
];

const PAYMENT_REQUESTS = ["accounts.payment-requests", "ops.payment-requests"] as const;
const PURCHASE_INVOICES = ["accounts.purchase-invoices", "ops.purchase-invoices"] as const;
const PURCHASE_ORDER_MODULES = ["accounts.purchase-orders", "ops.purchase-orders"] as const;

@Controller("purchase-orders")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchaseOrderController {
    constructor(private readonly service: PurchaseOrderService) {}

    @Get("project/:projectId")
    getProjectPurchaseOrders(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getPurchaseOrders(projectId);
    }

    @Get("project/:projectId/inventory")
    getProjectInventory(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getProjectInventory(projectId);
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

    @Get("parties/sellers")
    listSellerOptions() {
        return this.service.listSellerOptions();
    }

    @Get("parties/ship-to")
    listShipToOptions() {
        return this.service.listShipToOptions();
    }

    @Get("next-number")
    getNextPONumber(@Query("projectName") projectName: string) {
        return this.service.generatePONumber(projectName);
    }

    @Get()
    getAllPurchaseOrders(@Query("status") status?: string, @Query("section") section?: string, @CurrentUser() user?: ValidatedUser) {
        return this.service.getAllPurchaseOrders(status, section, user);
    }

    @Get("approval-counts")
    getApprovalCounts(@Query("section") section?: string, @CurrentUser() user?: ValidatedUser) {
        return this.service.getApprovalCounts(section, user);
    }
    @Get(":id/pdf/versions")
    getPurchaseOrderPdfVersions(@Param("id", ParseIntPipe) id: number) {
        return this.service.getPurchaseOrderPdfVersions(id);
    }

    @Delete(":id/pdf/versions/:version")
    @HttpCode(HttpStatus.OK)
    deletePdfVersion(@Param("id", ParseIntPipe) id: number, @Param("version") version: string) {
        return this.service.deletePdfVersion(id, version);
    }

    @Get(":id/pdf")
    async getPurchaseOrderPdf(@Param("id", ParseIntPipe) id: number, @Query("version") version: string | undefined, @Res() res: Response) {
        const { path: relPath, filename } = await this.service.getPurchaseOrderPdf(id, version);
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

    @Get(":id")
    getPurchaseOrder(@Param("id", ParseIntPipe) id: number) {
        return this.service.getPurchaseOrder(id);
    }

    @Get(":id/closure-status")
    @RequireAnyPermission(...eitherModule(...PURCHASE_ORDER_MODULES, "read"))
    getClosureStatus(@Param("id", ParseIntPipe) id: number) {
        return this.service.checkClosure(id);
    }

    @Get(":id/closure")
    @RequireAnyPermission(...eitherModule(...PURCHASE_ORDER_MODULES, "read"))
    getClosure(@Param("id", ParseIntPipe) id: number) {
        return this.service.getPurchaseOrderClosure(id);
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

    @Put(":id/tds")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PURCHASE_ORDER_MODULES, "approve"))
    setTdsPercentage(@Param("id", ParseIntPipe) id: number, @Body() body: { approve: boolean; tdsPercentage?: number; remark?: string }, @CurrentUser() user: ValidatedUser) {
        return this.service.setTdsPercentage(id, body, user?.id);
    }

    @Post(":id/close")
    @HttpCode(HttpStatus.OK)
    @RequireAnyPermission(...eitherModule(...PURCHASE_ORDER_MODULES, "close"))
    closePurchaseOrder(@Param("id", ParseIntPipe) id: number, @Body() body: { closureNote?: string }, @CurrentUser() user: ValidatedUser) {
        return this.service.closePurchaseOrder(id, body?.closureNote, user?.id);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    updatePurchaseOrder(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.updatePurchaseOrder(id, body, user.id);
    }
}
