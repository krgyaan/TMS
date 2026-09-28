import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { CashFlowModule } from "@/modules/operations/cash-flows/cash-flow.module";
import { ProjectsMasterController } from "./projects-master.controller";
import { ProjectsMasterService } from "./projects-master.service";

@Module({
    imports: [DatabaseModule, CashFlowModule],
    controllers: [ProjectsMasterController],
    providers: [ProjectsMasterService],
    exports: [ProjectsMasterService],
})
export class ProjectsMasterModule { }
