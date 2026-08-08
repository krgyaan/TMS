import { Module } from "@nestjs/common";
import { AmcServicesController } from "./amc-services.controller";
import { AmcServicesService } from "./amc-services.service";

@Module({
    controllers: [AmcServicesController],
    providers: [AmcServicesService],
    exports: [AmcServicesService],
})
export class AmcServicesModule {}
