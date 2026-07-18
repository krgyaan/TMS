import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
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

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }
}
