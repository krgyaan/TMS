import { BaseApiService } from "@/services/api/base.service";
import type {
    OfficeInventoryItem,
    OfficeInventoryItemPayload,
    OfficeInventoryPurchase,
    OfficeInventoryPurchasePayload,
    OfficeInventoryConsumption,
    OfficeInventoryConsumptionPayload,
    OfficeEquipment,
    OfficeEquipmentPayload,
    OfficeEquipmentLog,
    OfficeEquipmentLogPayload,
    OfficeAppliance,
    OfficeAppliancePayload,
    OfficeApplianceService,
    OfficeApplianceServicePayload,
    OfficeApplianceCleaning,
    OfficeApplianceCleaningPayload,
    PeriodReport,
    WeeklyTasksDashboard,
} from "./types";

class OfficeInventoryApiService extends BaseApiService {
    constructor() {
        super("/hrms/office-inventory");
    }

    // Items
    listItems(): Promise<OfficeInventoryItem[]> {
        return this.get<OfficeInventoryItem[]>("/items");
    }
    getNextItemCode(category: string): Promise<{ code: string }> {
        return this.get<{ code: string }>("/items/next-code", { params: { category } });
    }
    createItem(data: OfficeInventoryItemPayload) {
        return this.post("/items", data);
    }
    updateItem(id: number, data: Partial<OfficeInventoryItemPayload>) {
        return this.patch(`/items/${id}`, data);
    }
    deleteItem(id: number) {
        return this.delete(`/items/${id}`);
    }

    // Purchases
    listPurchases(): Promise<OfficeInventoryPurchase[]> {
        return this.get<OfficeInventoryPurchase[]>("/purchases");
    }
    createPurchase(data: OfficeInventoryPurchasePayload) {
        return this.post("/purchases", data);
    }
    updatePurchase(id: number, data: Partial<OfficeInventoryPurchasePayload>) {
        return this.patch(`/purchases/${id}`, data);
    }
    deletePurchase(id: number) {
        return this.delete(`/purchases/${id}`);
    }

    // Consumptions
    listConsumptions(): Promise<OfficeInventoryConsumption[]> {
        return this.get<OfficeInventoryConsumption[]>("/consumptions");
    }
    createConsumption(data: OfficeInventoryConsumptionPayload) {
        return this.post("/consumptions", data);
    }
    updateConsumption(id: number, data: Partial<OfficeInventoryConsumptionPayload>) {
        return this.patch(`/consumptions/${id}`, data);
    }
    deleteConsumption(id: number) {
        return this.delete(`/consumptions/${id}`);
    }

    // Equipment
    listEquipment(): Promise<OfficeEquipment[]> {
        return this.get<OfficeEquipment[]>("/equipment");
    }
    getNextEquipmentCode(category: string): Promise<{ code: string }> {
        return this.get<{ code: string }>("/equipment/next-code", { params: { category } });
    }
    createEquipment(data: OfficeEquipmentPayload) {
        return this.post("/equipment", data);
    }
    updateEquipment(id: number, data: Partial<OfficeEquipmentPayload>) {
        return this.patch(`/equipment/${id}`, data);
    }
    deleteEquipment(id: number) {
        return this.delete(`/equipment/${id}`);
    }

    // Equipment Logs
    listEquipmentLogs(): Promise<OfficeEquipmentLog[]> {
        return this.get<OfficeEquipmentLog[]>("/equipment-logs");
    }
    createEquipmentLog(data: OfficeEquipmentLogPayload) {
        return this.post("/equipment-logs", data);
    }
    updateEquipmentLog(id: number, data: Partial<OfficeEquipmentLogPayload>) {
        return this.patch(`/equipment-logs/${id}`, data);
    }
    deleteEquipmentLog(id: number) {
        return this.delete(`/equipment-logs/${id}`);
    }

    // Appliances
    listAppliances(): Promise<OfficeAppliance[]> {
        return this.get<OfficeAppliance[]>("/appliances");
    }
    getNextApplianceCode(): Promise<{ code: string }> {
        return this.get<{ code: string }>("/appliances/next-code");
    }
    createAppliance(data: OfficeAppliancePayload) {
        return this.post("/appliances", data);
    }
    updateAppliance(id: number, data: Partial<OfficeAppliancePayload>) {
        return this.patch(`/appliances/${id}`, data);
    }
    deleteAppliance(id: number) {
        return this.delete(`/appliances/${id}`);
    }

    // Appliance Services
    listApplianceServices(): Promise<OfficeApplianceService[]> {
        return this.get<OfficeApplianceService[]>("/appliance-services");
    }
    createApplianceService(data: OfficeApplianceServicePayload) {
        return this.post("/appliance-services", data);
    }
    updateApplianceService(id: number, data: Partial<OfficeApplianceServicePayload>) {
        return this.patch(`/appliance-services/${id}`, data);
    }
    deleteApplianceService(id: number) {
        return this.delete(`/appliance-services/${id}`);
    }

    // Appliance Cleanings
    listApplianceCleanings(): Promise<OfficeApplianceCleaning[]> {
        return this.get<OfficeApplianceCleaning[]>("/appliance-cleanings");
    }
    createApplianceCleaning(data: OfficeApplianceCleaningPayload) {
        return this.post("/appliance-cleanings", data);
    }
    updateApplianceCleaning(id: number, data: Partial<OfficeApplianceCleaningPayload>) {
        return this.patch(`/appliance-cleanings/${id}`, data);
    }
    deleteApplianceCleaning(id: number) {
        return this.delete(`/appliance-cleanings/${id}`);
    }

    // Reports & Weekly Tasks
    getWeeklyReport(startDate?: string, category?: string): Promise<PeriodReport> {
        return this.get<PeriodReport>("/reports/weekly", { params: { startDate, category } });
    }
    getMonthlyReport(startDate?: string, category?: string): Promise<PeriodReport> {
        return this.get<PeriodReport>("/reports/monthly", { params: { startDate, category } });
    }
    getWeeklyTasks(): Promise<WeeklyTasksDashboard> {
        return this.get<WeeklyTasksDashboard>("/reports/weekly-tasks");
    }
}

export const officeInventoryApi = new OfficeInventoryApiService();
