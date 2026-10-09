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
        @Query("sortOrder") sortOrder?: "asc" | "desc"
    ) {
        const filters: ChecklistListFilters = {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
            sortBy,
            sortOrder,
        };
        return this.tdsChecklistService.findAll(filters);
    }
}
