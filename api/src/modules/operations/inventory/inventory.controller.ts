import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { InventoryService, type InventoryWarehouseFilter } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
    constructor(private readonly service: InventoryService) {}

    @Get("project/:projectId")
    getProjectInventory(@Param("projectId", ParseIntPipe) projectId: number, @Query("includeZero") includeZero?: string, @Query("warehouseType") warehouseType?: string) {
        const validWarehouses: InventoryWarehouseFilter[] = ["all", "ho_main", "ho_sub", "ho_depot", "project_location"];
        return this.service.getProjectInventory(projectId, {
            includeZero: includeZero === "true",
            warehouseType: validWarehouses.includes(warehouseType as InventoryWarehouseFilter) ? (warehouseType as InventoryWarehouseFilter) : "all",
        });
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

    @Get("movements")
    getMovements(@Query("projectId") projectId?: string, @Query("inventoryId") inventoryId?: string) {
        return this.service.getMovements(projectId ? Number(projectId) : undefined, inventoryId ? Number(inventoryId) : undefined);
    }
}
