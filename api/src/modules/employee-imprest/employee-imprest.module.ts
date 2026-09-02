import { DatabaseModule } from "@/db/database.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { InsurancePolicyModule } from "@/modules/insurance/insurance-policy.module";
import { ImprestAdminModule } from "@/modules/imprest-admin/imprest-admin.module";
import { EmployeeImprestController } from "@/modules/employee-imprest/employee-imprest.controller";
import { EmployeeImprestService } from "@/modules/employee-imprest/employee-imprest.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [DatabaseModule, AuthModule, InsurancePolicyModule, ImprestAdminModule],
    controllers: [EmployeeImprestController],
    providers: [EmployeeImprestService],
    exports: [EmployeeImprestService],
})
export class EmployeeImprestModule {}
