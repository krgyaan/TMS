import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { PaymentCategoriesService } from "@/modules/master/payment-categories/payment-categories.service";
import { CreatePaymentCategorySchema, ListPaymentCategoriesQuerySchema } from "@/modules/master/payment-categories/dto/payment-categories.dto";

@Controller("payment-categories")
export class PaymentCategoriesController {
    constructor(private readonly paymentCategoriesService: PaymentCategoriesService) {}

    @Get()
    async list(@Query("purpose") purpose?: string, @Query("status") status?: string, @Query("q") q?: string) {
        const parsed = ListPaymentCategoriesQuerySchema.parse({ purpose, status, q });
        return this.paymentCategoriesService.findAll(parsed);
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.paymentCategoriesService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown, @CurrentUser("id") userId: number) {
        const parsed = CreatePaymentCategorySchema.parse(body);
        return this.paymentCategoriesService.create(parsed, userId);
    }
}
