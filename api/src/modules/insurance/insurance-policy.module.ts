import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { InsurancePolicyController } from "./insurance-policy.controller";
import { InsurancePolicyService } from "./insurance-policy.service";

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [InsurancePolicyController],
    providers: [InsurancePolicyService],
    exports: [InsurancePolicyService],
})
export class InsurancePolicyModule {}
