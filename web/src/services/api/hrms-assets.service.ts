// src/services/api/hrms-assets.service.ts
import { BaseApiService } from "./base.service";

export interface EmployeeAsset {
    id: number;
    userId: number;
    assetCode: string;
    assetType: string;
    assetTypeLabel?: string;
    assetCategory?: string;
    assetCategoryLabel?: string;
    brand?: string;
    model?: string;
    specifications?: string;
    serialNumber?: string;
    imeiNumber?: string;
    licenseKey?: string;
    assetValue?: string;
    assetCondition?: string;
    assetConditionLabel?: string;
    assignedDate: string;
    assignedBy?: number;
    expectedReturnDate?: string;
    purpose?: string;
    assetLocation?: string;
    assetLocationLabel?: string;
    warrantyFrom?: string;
    warrantyTo?: string;
    insuranceDetails?: string;
    accessories?: string[];
    assetPhotos?: string[];
    purchaseInvoiceUrl?: string;
    warrantyCardUrl?: string;
    assignmentFormUrl?: string;
    assetStatus?: string;
    assetStatusLabel?: string;
    returnDate?: string;
    returnCondition?: string;
    damageRemarks?: string;
    deductionAmount?: string;
    purchaseDate?: string;
    purchasePrice?: string;
    purchaseFrom?: string;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
}

export interface StatusUpdatePayload {
    assetStatus: string;
    
    // Assignment fields
    userId?: number;
    assignedDate?: string;
    expectedReturnDate?: string;
    purpose?: string;
    assetLocation?: string;
    
    // Return fields
    returnDate?: string;
    returnCondition?: string;
    assetCondition?: string;
    
    // Damage fields
    damageDate?: string;
    damageType?: string;
    damageDescription?: string;
    isRepairable?: string;
    
    // Loss fields
    lostDate?: string;
    lostLocation?: string;
    lostCircumstances?: string;
    policeReportNumber?: string;
    policeReportDate?: string;
    
    // Repair fields
    repairStartDate?: string;
    repairEndDate?: string;
    repairEstimatedCost?: string;
    repairActualCost?: string;
    repairVendor?: string;
    repairDescription?: string;
    
    // Financial
    deductionAmount?: string;
    deductionReason?: string;
    
    // General
    remarks?: string;
}

export interface AssetHistoryEntry {
    id: number;
    assetId: number;
    previousStatus?: string | null;
    previousStatusLabel?: string | null;
    newStatus: string;
    newStatusLabel?: string;
    actionType: string;
    assignedToUserId?: number | null;
    assignedByUserId?: number | null;
    assignedDate?: string | null;
    expectedReturnDate?: string | null;
    purpose?: string | null;
    assetLocation?: string | null;
    assetLocationLabel?: string | null;
    returnDate?: string | null;
    returnCondition?: string | null;
    returnConditionLabel?: string | null;
    damageDate?: string | null;
    damageType?: string | null;
    damageDescription?: string | null;
    isRepairable?: string | null;
    lostDate?: string | null;
    lostLocation?: string | null;
    lostCircumstances?: string | null;
    policeReportNumber?: string | null;
    policeReportDate?: string | null;
    repairStartDate?: string | null;
    repairEndDate?: string | null;
    repairEstimatedCost?: string | null;
    repairActualCost?: string | null;
    repairVendor?: string | null;
    repairDescription?: string | null;
    deductionAmount?: string | null;
    deductionReason?: string | null;
    assetConditionAfter?: string | null;
    assetConditionAfterLabel?: string | null;
    remarks?: string | null;
    changedByUserId?: number | null;
    createdAt: string;
}

class HrmsAssetsService extends BaseApiService {
    constructor() {
        super("/assets");
    }

    // ─── Read Operations ──────────────────────────────────────────────────────

    /**
     * Get all assets with labels (for display in tables)
     */
    async getAll(): Promise<EmployeeAsset[]> {
        return this.get<EmployeeAsset[]>("");
    }

    /**
     * Get assets by user ID
     */
    async getByUserId(userId: number): Promise<EmployeeAsset[]> {
        return this.get<EmployeeAsset[]>(`/user/${userId}`);
    }

    /**
     * Get single asset (raw values - for edit forms)
     */
    async getById(id: number): Promise<EmployeeAsset> {
        return this.get<EmployeeAsset>(`/${id}`);
    }

    /**
     * Get single asset with labels (for display/view pages)
     */
    async getByIdWithLabels(id: number): Promise<EmployeeAsset> {
        return this.get<EmployeeAsset>(`/${id}/details`);
    }

    /**
     * Get asset history timeline
     */
    async getHistory(id: number): Promise<AssetHistoryEntry[]> {
        return this.get<AssetHistoryEntry[]>(`/${id}/history`);
    }

    // ─── Write Operations ─────────────────────────────────────────────────────

    /**
     * Create new asset (supports both JSON and FormData)
     */
    async create(data: Partial<EmployeeAsset> | FormData): Promise<EmployeeAsset> {
        return this.post<EmployeeAsset>("", data);
    }

    /**
     * Update asset (general edit)
     */
    async update(id: number, data: Partial<EmployeeAsset>): Promise<EmployeeAsset> {
        return this.patch<EmployeeAsset>(`/${id}`, data);
    }

    /**
     * Update asset status (creates history entry)
     */
    async updateStatus(id: number, data: StatusUpdatePayload): Promise<EmployeeAsset> {
        return this.patch<EmployeeAsset>(`/${id}/status`, data);
    }

    /**
     * Delete asset
     */
    async deleteAsset(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const hrmsAssetsService = new HrmsAssetsService();
export type { HrmsAssetsService };