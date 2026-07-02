import { Module } from "@nestjs/common";
import { MakerRequestController } from "./maker-request.controller";
import { MakerRequestService } from "./maker-request.service";

@Module({
    controllers: [MakerRequestController],
    providers: [MakerRequestService],
    exports: [MakerRequestService],
})
export class MakerRequestModule {}
