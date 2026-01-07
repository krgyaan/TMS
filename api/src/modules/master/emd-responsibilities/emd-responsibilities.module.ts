import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { EmdResponsibilityController } from "@/modules/master/emd-responsibilities/emd-responsibilities.controller";
import { EmdResponsibilityService } from "@/modules/master/emd-responsibilities/emd-responsibilities.service";

@Module({
    imports: [DatabaseModule],
    controllers: [EmdResponsibilityController],
    providers: [EmdResponsibilityService],
    exports: [EmdResponsibilityService],
})
export class EmdResponsibilitiesModule {}
