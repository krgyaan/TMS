import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { PaymentCategoriesService } from "@/modules/master/payment-categories/payment-categories.service";
import { ListPaymentCategoriesQuerySchema } from "@/modules/master/payment-categories/dto/payment-categories.dto";

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
}
