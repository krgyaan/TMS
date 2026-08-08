import { DatabaseModule } from "@/db/database.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { EmployeeImprestController } from "@/modules/employee-imprest/employee-imprest.controller";
import { EmployeeImprestService } from "@/modules/employee-imprest/employee-imprest.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [EmployeeImprestController],
    providers: [EmployeeImprestService],
    exports: [EmployeeImprestService],
})
export class EmployeeImprestModule {}
