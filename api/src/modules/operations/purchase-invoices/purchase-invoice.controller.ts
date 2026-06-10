import { Controller, Get, Post, Put, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { PurchaseInvoiceService } from "./purchase-invoice.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

@Controller("project-purchase-invoices")
export class PurchaseInvoiceController {
    constructor(private readonly service: PurchaseInvoiceService) {}

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
    ) {
        return this.service.update(id, body);
    }

    @Get("next-number")
    getNextNumber(@Query("projectName") projectName: string) {
        return this.service.generateNumber(projectName);
    }

    @Get("project/:projectId")
    getByProject(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getByProject(projectId);
    }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }
}
