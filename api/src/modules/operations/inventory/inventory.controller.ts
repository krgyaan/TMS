import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
    constructor(private readonly service: InventoryService) {}

    @Get("project/:projectId")
    getProjectInventory(@Param("projectId", ParseIntPipe) projectId: number, @Query("includeZero") includeZero?: string) {
        return this.service.getProjectInventory(projectId, { includeZero: includeZero === "true" });
    }

    @Post("transfer")
    @HttpCode(HttpStatus.CREATED)
    transfer(@Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.transfer(body, user.id);
    }

    @Get("all")
    getAllInventory(@Query("includeZero") includeZero?: string) {
        return this.service.getAllInventory({ includeZero: includeZero === "true" });
    }

    @Get("projects")
    getProjectSummaries(@Query("page") page?: string, @Query("limit") limit?: string, @Query("search") search?: string) {
        return this.service.getProjectSummaries({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search: search || undefined,
        });
    }

    @Get("transfers")
    getTransfers(@Query("fromProject") fromProject?: string, @Query("toProject") toProject?: string) {
        return this.service.getTransfers(fromProject ? Number(fromProject) : undefined, toProject ? Number(toProject) : undefined);
    }

    @Get("movements")
    getMovements(@Query("projectId") projectId?: string, @Query("inventoryId") inventoryId?: string) {
        return this.service.getMovements(projectId ? Number(projectId) : undefined, inventoryId ? Number(inventoryId) : undefined);
    }
}
