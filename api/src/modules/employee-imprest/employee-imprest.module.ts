import { Module } from "@nestjs/common";
import { EmployeeImprestController } from "@/modules/employee-imprest/employee-imprest.controller";
import { EmployeeImprestService } from "@/modules/employee-imprest/employee-imprest.service";
import { DatabaseModule } from "@/db/schemas/shared/database.module";

@Module({
    imports: [DatabaseModule],
    controllers: [EmployeeImprestController],
    providers: [EmployeeImprestService],
    exports: [EmployeeImprestService],
})
export class EmployeeImprestModule {}
