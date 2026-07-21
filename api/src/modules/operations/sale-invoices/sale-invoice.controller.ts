import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
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

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }
}
