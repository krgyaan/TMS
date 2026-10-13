import { Controller, Get, Query } from "@nestjs/common";
import type { ChecklistListFilters } from "./tds-checklist.service";
import { TdsChecklistService } from "./tds-checklist.service";

@Controller("accounts/tds-checklists")
export class TdsChecklistController {
    constructor(private readonly tdsChecklistService: TdsChecklistService) {}

    @Get()
    list(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @Query("year") year?: string,
        @Query("month") month?: string
    ) {
        const filters: ChecklistListFilters = {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
            sortBy,
            sortOrder,
            year: year ? parseInt(year, 10) : undefined,
            month: month ? parseInt(month, 10) : undefined,
        };
        return this.tdsChecklistService.findAll(filters);
    }
}
