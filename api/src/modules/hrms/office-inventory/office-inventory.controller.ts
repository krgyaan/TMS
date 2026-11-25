import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { OfficeInventoryService } from "./office-inventory.service";
import {
    CreateItemSchema,
    UpdateItemSchema,
    CreatePurchaseSchema,
    UpdatePurchaseSchema,
    CreateConsumptionSchema,
    UpdateConsumptionSchema,
    CreateEquipmentSchema,
    UpdateEquipmentSchema,
    CreateEquipmentLogSchema,
    UpdateEquipmentLogSchema,
    CreateApplianceSchema,
    UpdateApplianceSchema,
    CreateApplianceServiceSchema,
    UpdateApplianceServiceSchema,
    CreateApplianceCleaningSchema,
    UpdateApplianceCleaningSchema,
} from "./dto/office-inventory.dto";

@Controller("hrms/office-inventory")
export class OfficeInventoryController {
    constructor(private readonly service: OfficeInventoryService) {}

    // --- 1. Item Master ---
    @Get("items")
    listItems() {
        return this.service.listItems();
    }

    @Get("items/next-code")
    getNextItemCode(@Query("category") category: string) {
        return this.service.getNextItemCode(category);
    }

    @Post("items")
    createItem(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createItem(userId, CreateItemSchema.parse(body));
    }

    @Patch("items/:id")
    updateItem(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateItem(id, UpdateItemSchema.parse(body));
    }

    @Delete("items/:id")
    deleteItem(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteItem(id);
    }

    // --- 2. Purchases ---
    @Get("purchases")
    listPurchases() {
        return this.service.listPurchases();
    }

    @Post("purchases")
    createPurchase(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createPurchase(userId, CreatePurchaseSchema.parse(body));
    }

    @Patch("purchases/:id")
    updatePurchase(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updatePurchase(id, UpdatePurchaseSchema.parse(body));
    }

    @Delete("purchases/:id")
    deletePurchase(@Param("id", ParseIntPipe) id: number) {
        return this.service.deletePurchase(id);
    }

    // --- 3. Consumptions ---
    @Get("consumptions")
    listConsumptions() {
        return this.service.listConsumptions();
    }

    @Post("consumptions")
    createConsumption(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createConsumption(userId, CreateConsumptionSchema.parse(body));
    }

    @Patch("consumptions/:id")
    updateConsumption(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateConsumption(id, UpdateConsumptionSchema.parse(body));
    }

    @Delete("consumptions/:id")
    deleteConsumption(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteConsumption(id);
    }

    // --- 4. Equipment Register ---
    @Get("equipment")
    listEquipment() {
        return this.service.listEquipment();
    }

    @Get("equipment/next-code")
    getNextEquipmentCode(@Query("category") category: string) {
        return this.service.getNextEquipmentCode(category);
    }

    @Post("equipment")
    createEquipment(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createEquipment(userId, CreateEquipmentSchema.parse(body));
    }

    @Patch("equipment/:id")
    updateEquipment(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateEquipment(id, UpdateEquipmentSchema.parse(body));
    }

    @Delete("equipment/:id")
    deleteEquipment(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteEquipment(id);
    }

    // --- 5. Equipment Movement Log ---
    @Get("equipment-logs")
    listEquipmentLogs() {
        return this.service.listEquipmentLogs();
    }

    @Post("equipment-logs")
    createEquipmentLog(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createEquipmentLog(userId, CreateEquipmentLogSchema.parse(body));
    }

    @Patch("equipment-logs/:id")
    updateEquipmentLog(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateEquipmentLog(id, UpdateEquipmentLogSchema.parse(body));
    }

    @Delete("equipment-logs/:id")
    deleteEquipmentLog(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteEquipmentLog(id);
    }

    // --- 6. Pantry Appliances ---
    @Get("appliances")
    listAppliances() {
        return this.service.listAppliances();
    }

    @Get("appliances/next-code")
    getNextApplianceCode() {
        return this.service.getNextApplianceCode();
    }

    @Post("appliances")
    createAppliance(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createAppliance(userId, CreateApplianceSchema.parse(body));
    }

    @Patch("appliances/:id")
    updateAppliance(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateAppliance(id, UpdateApplianceSchema.parse(body));
    }

    @Delete("appliances/:id")
    deleteAppliance(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteAppliance(id);
    }

    // --- 7. Appliance Service Visits ---
    @Get("appliance-services")
    listApplianceServices() {
        return this.service.listApplianceServices();
    }

    @Post("appliance-services")
    createApplianceService(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createApplianceService(
            userId,
            CreateApplianceServiceSchema.parse(body)
        );
    }

    @Patch("appliance-services/:id")
    updateApplianceService(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateApplianceService(id, UpdateApplianceServiceSchema.parse(body));
    }

    @Delete("appliance-services/:id")
    deleteApplianceService(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteApplianceService(id);
    }

    // --- 8. Appliance Cleaning Log ---
    @Get("appliance-cleanings")
    listApplianceCleanings() {
        return this.service.listApplianceCleanings();
    }

    @Post("appliance-cleanings")
    createApplianceCleaning(@CurrentUser("id") userId: number, @Body() body: unknown) {
        return this.service.createApplianceCleaning(
            userId,
            CreateApplianceCleaningSchema.parse(body)
        );
    }

    @Patch("appliance-cleanings/:id")
    updateApplianceCleaning(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        return this.service.updateApplianceCleaning(
            id,
            UpdateApplianceCleaningSchema.parse(body)
        );
    }

    @Delete("appliance-cleanings/:id")
    deleteApplianceCleaning(@Param("id", ParseIntPipe) id: number) {
        return this.service.deleteApplianceCleaning(id);
    }

    // --- 9. Reports & Weekly Tasks ---
    @Get("reports/weekly")
    getWeeklyReport(
        @Query("startDate") startDate?: string,
        @Query("category") category?: string
    ) {
        return this.service.getWeeklyReport(startDate, category);
    }

    @Get("reports/monthly")
    getMonthlyReport(
        @Query("startDate") startDate?: string,
        @Query("category") category?: string
    ) {
        return this.service.getMonthlyReport(startDate, category);
    }

    @Get("reports/weekly-tasks")
    getWeeklyTasksDashboard() {
        return this.service.getWeeklyTasksDashboard();
    }
}
