import { Module } from "@nestjs/common";
import { FinanceDocTypeService } from "./finance-doc-type.service";
import { FinanceDocTypeController } from "./finance-doc-type.controller";

@Module({
    controllers: [FinanceDocTypeController],
    providers: [FinanceDocTypeService],
})
export class FinanceDocTypeModule { }
