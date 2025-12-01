import { Module } from "@nestjs/common";
import { CourierController } from "./courier.controller";
import { CourierService } from "./courier.service";

@Module({
    controllers: [CourierController],
    providers: [CourierService],
    exports: [CourierService],
})
export class CourierModule {}
