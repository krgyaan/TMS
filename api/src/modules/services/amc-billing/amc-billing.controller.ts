import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from "@nestjs/common";
import { AmcBillingService } from "./amc-billing.service";

@Controller("amc-billing")
export class AmcBillingController {
    constructor(private readonly service: AmcBillingService) {}

    @Get("bills")
    list(@Query("amcId") amcId?: string) {
        return this.service.list(amcId ? Number(amcId) : undefined);
    }

    @Get("bills/:id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post("bills/:id/invoices")
    async addInvoices(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: { paths: string[] },
    ) {
        if (!body?.paths || body.paths.length === 0) {
            throw new BadRequestException("At least one file path is required");
        }
        return this.service.addInvoices(id, body.paths);
    }

    @Post("bills/:id/receipts")
    async addReceipts(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: { paths: string[] },
    ) {
        if (!body?.paths || body.paths.length === 0) {
            throw new BadRequestException("At least one file path is required");
        }
        return this.service.addReceipts(id, body.paths);
    }

    @Delete("bills/:id/invoices/:index")
    async removeInvoice(
        @Param("id", ParseIntPipe) id: number,
        @Param("index", ParseIntPipe) index: number,
    ) {
        return this.service.removeInvoice(id, index);
    }

    @Delete("bills/:id/receipts/:index")
    async removeReceipt(
        @Param("id", ParseIntPipe) id: number,
        @Param("index", ParseIntPipe) index: number,
    ) {
        return this.service.removeReceipt(id, index);
    }

    @Post("bills/:id/followup")
    followup(@Param("id", ParseIntPipe) id: number) {
        return this.service.followup(id);
    }
}