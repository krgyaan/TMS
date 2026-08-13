import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { MakerRequestController } from "./maker-request.controller";
import { MakerRequestService } from "./maker-request.service";

@Module({
    imports: [DatabaseModule, InsurancePolicyModule],
    controllers: [MakerRequestController],
    providers: [MakerRequestService],
    exports: [MakerRequestService],
})
export class MakerRequestModule {}
