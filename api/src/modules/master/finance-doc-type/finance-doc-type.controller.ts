import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { FinanceDocTypeService } from "./finance-doc-type.service";

@Controller("finance-doc-type")
export class FinanceDocTypeController {
    constructor(private readonly financeDocTypeService: FinanceDocTypeService) { }

    @Get()
    async list() {
        return this.financeDocTypeService.findAll();
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.financeDocTypeService.findById(id);
    }
}
