import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { PaymentCategoriesController } from "@/modules/master/payment-categories/payment-categories.controller";
import { PaymentCategoriesService } from "@/modules/master/payment-categories/payment-categories.service";

@Module({
    imports: [DatabaseModule],
    controllers: [PaymentCategoriesController],
    providers: [PaymentCategoriesService],
    exports: [PaymentCategoriesService],
})
export class PaymentCategoriesModule {}
