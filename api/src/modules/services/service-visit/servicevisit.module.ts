import { Module } from "@nestjs/common";
import { ServiceVisitController } from "./servicevisit.controller";
import { ServiceVisitService } from "./servicevisit.service";

@Module({
    controllers: [ServiceVisitController],
    providers: [ServiceVisitService],
    exports: [ServiceVisitService],
})
export class ServiceVisitModule {}
