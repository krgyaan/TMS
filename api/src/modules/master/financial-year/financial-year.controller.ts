import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { FinancialYearService } from "./financial-year.service";

@Controller("financial-year")
export class FinancialYearController {
    constructor(private readonly financialYearService: FinancialYearService) { }

    @Get()
    async list() {
        return this.financialYearService.findAll();
    }

    @Get(":id")
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.financialYearService.findById(id);
    }
}
