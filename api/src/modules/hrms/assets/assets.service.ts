import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, count, desc } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { employeeAssets, type NewEmployeeAsset, type EmployeeAsset } from "@/db/schemas/hrms/employee-assets.schema";
import { assetTrackingHistory, type NewAssetTrackingHistory } from "@/db/schemas/hrms/asset-tracking-history.schema";
import { users } from "@/db/schemas/auth/users.schema";

// ─── Label Maps ───────────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<string, string> = {
  laptop: "Laptop", desktop: "Desktop", mobile: "Mobile", monitor: "Monitor",
  keyboard: "Keyboard", mouse: "Mouse", printer: "Printer",
  id_card: "ID Card", access_card: "Access Card", sim_card: "SIM Card", other: "Other",
  car: "Car", bike: "Bike", scooter: "Scooter", bus: "Bus",
};

const ASSET_CATEGORY_LABELS: Record<string, string> = {
  it_equipment: "IT Equipment", vehicle: "Vehicle", documents: "Documents",
};

const ASSET_CONDITION_LABELS: Record<string, string> = {
  new: "New", good: "Good", fair: "Fair", poor: "Poor", damaged: "Damaged",
};

const ASSET_LOCATION_LABELS: Record<string, string> = {
  office: "Office", home: "Home", field: "Field", warehouse: "Warehouse", repair_center: "Repair Center",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned", available: "Available", under_repair: "Under Repair",
  damaged: "Damaged", lost: "Lost", returned: "Returned", disposed: "Disposed",
};

const ASSET_TYPE_PREFIXES: Record<string, string> = {
  laptop: "LAP", desktop: "DSK", mobile: "MOB", monitor: "MON", keyboard: "KEY",
  mouse: "MOU", printer: "PRT", id_card: "IDC", access_card: "ACC",
  sim_card: "SIM", other: "OTH",
  car: "CAR", bike: "BIK", scooter: "SCO", bus: "BUS",
};

const ACTION_TYPE_MAP: Record<string, string> = {
  assigned: "ASSIGN", available: "AVAILABLE", under_repair: "REPAIR",
  damaged: "DAMAGE", lost: "LOSS", returned: "RETURN", disposed: "DISPOSAL",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface StatusUpdateDto {
  assetStatus: string;
  
  // Assignment fields
  userId?: number | null;
  assignedDate?: string | null;
  expectedReturnDate?: string | null;
  purpose?: string | null;
  assetLocation?: string | null;
  
  // Return fields
  returnDate?: string | null;
  returnCondition?: string | null;
  
  // Damage fields
  damageDate?: string | null;
  damageType?: string | null;
  damageDescription?: string | null;
  isRepairable?: string | null;
  assetCondition?: string | null;
  
  // Loss fields
  lostDate?: string | null;
  lostLocation?: string | null;
  lostCircumstances?: string | null;
  policeReportNumber?: string | null;
  policeReportDate?: string | null;
  
  // Repair fields
  repairStartDate?: string | null;
  repairEndDate?: string | null;
  repairEstimatedCost?: string | null;
  repairActualCost?: string | null;
  repairVendor?: string | null;
  repairDescription?: string | null;
  
  // Financial
  deductionAmount?: string | null;
  deductionReason?: string | null;
  
  // Disposal fields
  disposalDate?: string | null;
  disposalType?: string | null;
  disposalReason?: string | null;
  disposalAmount?: string | null;
  disposalApprovedBy?: string | null;

  // General
  remarks?: string | null;
  changedByUserId?: number | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AssetsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // Resolves numeric string codes → human-readable labels.
  private resolveLabels(asset: EmployeeAsset) {
    return {
      ...asset,
      assetTypeLabel: ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType,
      assetCategoryLabel: ASSET_CATEGORY_LABELS[asset.assetCategory ?? ""] ?? asset.assetCategory,
      assetConditionLabel: ASSET_CONDITION_LABELS[asset.assetCondition ?? ""] ?? asset.assetCondition,
      assetLocationLabel: ASSET_LOCATION_LABELS[asset.assetLocation ?? ""] ?? asset.assetLocation,
      assetStatusLabel: ASSET_STATUS_LABELS[asset.assetStatus ?? ""] ?? asset.assetStatus,
      returnConditionLabel: ASSET_CONDITION_LABELS[asset.returnCondition ?? ""] ?? asset.returnCondition,
    };
  }

  private resolveHistoryLabels(history: any) {
    return {
      ...history,
      previousStatusLabel: history.previousStatus ? ASSET_STATUS_LABELS[history.previousStatus] ?? history.previousStatus : null,
      newStatusLabel: ASSET_STATUS_LABELS[history.newStatus] ?? history.newStatus,
      // assetLocationLabel: history.assetLocation ? ASSET_LOCATION_LABELS[history.assetLocation] ?? history.assetLocation : null,
      // returnConditionLabel: history.returnCondition ? ASSET_CONDITION_LABELS[history.returnCondition] ?? history.returnCondition : null,
      // assetConditionAfterLabel: history.assetConditionAfter ? ASSET_CONDITION_LABELS[history.assetConditionAfter] ?? history.assetConditionAfter : null,
    };
  }

  private async generateAssetCode(assetType?: string | null): Promise<string> {
    const prefix = ASSET_TYPE_PREFIXES[assetType ?? ""] ?? "AST";
    const result = await this.db
      .select({ count: count() })
      .from(employeeAssets)
      .where(eq(employeeAssets.assetType, assetType ?? ""));
    const total = Number(result[0]?.count ?? 0);
    return `${prefix}-${total + 1}`;
  }

  async findAll(): Promise<any[]> {
    const rows = await this.db
      .select({
        asset: employeeAssets,
        assignedTo: users.name,
      })
      .from(employeeAssets)
      .leftJoin(users, eq(employeeAssets.userId, users.id));

    return rows.map(row => {
      // Merge user name into the asset object for labels resolution
      return this.resolveLabels({
        ...row.asset,
        assignedTo: row.assignedTo
      } as any);
    });
  }

  async findByUserId(userId: number): Promise<any[]> {
    const rows = await this.db
      .select()
      .from(employeeAssets)
      .where(eq(employeeAssets.userId, userId));
    return rows.map(row => this.resolveLabels(row));
  }

  // Returns raw values (for forms/edits)
  async findById(id: number): Promise<EmployeeAsset | null> {
    const rows = await this.db
      .select()
      .from(employeeAssets)
      .where(eq(employeeAssets.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  // Returns with labels (for display)
  async findByIdWithLabels(id: number): Promise<any | null> {
    const rows = await this.db
      .select()
      .from(employeeAssets)
      .where(eq(employeeAssets.id, id))
      .limit(1);
    return rows[0] ? this.resolveLabels(rows[0]) : null;
  }

  async create(data: NewEmployeeAsset): Promise<EmployeeAsset> {
    const cleanData = stripUndefined(data);
    const assetCode = await this.generateAssetCode((cleanData as any).assetType);

    const rows = await this.db
      .insert(employeeAssets)
      .values({ ...cleanData, assetCode } as any)
      .returning();

    // Log initial assignment
    if (cleanData.assetStatus === "assigned" && cleanData.userId) {
      await this.createHistoryRecord(rows[0].id, null, "assigned", {
        userId: cleanData.userId as number,
        assignedDate: cleanData.assignedDate as string,
        expectedReturnDate: cleanData.expectedReturnDate as string,
        purpose: cleanData.purpose as string,
        assetLocation: cleanData.assetLocation as string,
        changedByUserId: cleanData.assignedBy as number,
      });
    }

    return rows[0];
  }

  async update(id: number, data: Partial<NewEmployeeAsset>): Promise<EmployeeAsset> {
    const cleanData = stripUndefined(data);

    if (Object.keys(cleanData).length === 0) {
      throw new Error("No fields provided for update");
    }

    const rows = await this.db
      .update(employeeAssets)
      .set({ ...cleanData, updatedAt: new Date() })
      .where(eq(employeeAssets.id, id))
      .returning();

    if (!rows[0]) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return rows[0];
  }

  async updateStatus(id: number, data: StatusUpdateDto): Promise<EmployeeAsset> {
    // Get current asset
    const currentAsset = await this.findById(id);
    if (!currentAsset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const previousStatus = currentAsset.assetStatus;
    const newStatus = data.assetStatus;

    // Build update payload for main asset table
    const assetUpdate: Partial<NewEmployeeAsset> = {
      assetStatus: newStatus,
      updatedAt: new Date(),
    };

    // Status-specific updates
    switch (newStatus) {
      case "assigned":
        assetUpdate.userId = data.userId;
        assetUpdate.assignedDate = data.assignedDate;
        assetUpdate.expectedReturnDate = data.expectedReturnDate || null;
        assetUpdate.purpose = data.purpose || null;
        assetUpdate.assetLocation = data.assetLocation || null;
        break;

      case "available":
        assetUpdate.userId = null;
        assetUpdate.returnDate = data.returnDate || new Date().toISOString().split('T')[0];
        break;

      case "under_repair":
        assetUpdate.assetLocation = "repair_center";
        assetUpdate.damageRemarks = data.repairDescription || null;
        break;

      case "damaged":
        assetUpdate.assetCondition = data.assetCondition || "damaged";
        assetUpdate.damageRemarks = data.damageDescription || null;
        assetUpdate.deductionAmount = data.deductionAmount || null;
        break;

      case "lost":
        assetUpdate.damageRemarks = data.lostCircumstances || null;
        assetUpdate.deductionAmount = data.deductionAmount || null;
        break;

      case "returned":
        assetUpdate.userId = null;
        assetUpdate.returnDate = data.returnDate;
        assetUpdate.returnCondition = data.returnCondition || null;
        assetUpdate.assetCondition = data.assetCondition || null;
        assetUpdate.deductionAmount = data.deductionAmount || null;
        break;

      case "disposed":
        assetUpdate.userId = null;
        assetUpdate.assetLocation = null;
        assetUpdate.disposalDate = data.disposalDate || null;
        assetUpdate.disposalType = data.disposalType || null;
        assetUpdate.disposalReason = data.disposalReason || null;
        assetUpdate.disposalAmount = data.disposalAmount || null;
        assetUpdate.disposalApprovedBy = data.disposalApprovedBy || null;
        break;
    }

    // Update asset
    const cleanUpdate = stripUndefined(assetUpdate);
    const rows = await this.db
      .update(employeeAssets)
      .set(cleanUpdate as any)
      .where(eq(employeeAssets.id, id))
      .returning();

    if (!rows[0]) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    // Create history record
    await this.createHistoryRecord(id, previousStatus, newStatus, data);

    return rows[0];
  }

  private async createHistoryRecord(
    assetId: number,
    previousStatus: string | null | undefined,
    newStatus: string,
    data: Partial<StatusUpdateDto>
  ): Promise<void> {
    const historyRecord: NewAssetTrackingHistory = {
      assetId,
      previousStatus: previousStatus ?? null,
      newStatus,
      actionType: ACTION_TYPE_MAP[newStatus] ?? "UPDATE",
      
      // Assignment
      assignedToUserId: data.userId ?? null,
      assignedByUserId: data.changedByUserId ?? null,
      assignedDate: data.assignedDate ?? null,
      expectedReturnDate: data.expectedReturnDate ?? null,
      purpose: data.purpose ?? null,
      assetLocation: data.assetLocation ?? null,
      
      // Return
      returnDate: data.returnDate ?? null,
      returnCondition: data.returnCondition ?? null,
      
      // Damage
      damageDate: data.damageDate ?? null,
      damageType: data.damageType ?? null,
      damageDescription: data.damageDescription ?? null,
      isRepairable: data.isRepairable ?? null,
      
      // Loss
      lostDate: data.lostDate ?? null,
      lostLocation: data.lostLocation ?? null,
      lostCircumstances: data.lostCircumstances ?? null,
      policeReportNumber: data.policeReportNumber ?? null,
      policeReportDate: data.policeReportDate ?? null,
      
      // Repair
      repairStartDate: data.repairStartDate ?? null,
      repairEndDate: data.repairEndDate ?? null,
      repairEstimatedCost: data.repairEstimatedCost ?? null,
      repairActualCost: data.repairActualCost ?? null,
      repairVendor: data.repairVendor ?? null,
      repairDescription: data.repairDescription ?? null,
      
      // Financial
      deductionAmount: data.deductionAmount ?? null,
      deductionReason: data.deductionReason ?? null,
      assetConditionAfter: data.assetCondition ?? null,
      
      // Disposal
      disposalDate: data.disposalDate ?? null,
      disposalType: data.disposalType ?? null,
      disposalReason: data.disposalReason ?? null,
      disposalAmount: data.disposalAmount ?? null,
      disposalApprovedBy: data.disposalApprovedBy ?? null,
      
      // General
      remarks: data.remarks ?? null,
      changedByUserId: data.changedByUserId ?? null,
    };

    await this.db.insert(assetTrackingHistory).values(historyRecord);
  }

  async getAssetHistory(assetId: number): Promise<any[]> {
    const rows = await this.db
      .select({
        previousStatus: assetTrackingHistory.previousStatus,
        newStatus: assetTrackingHistory.newStatus,
        createdAt : assetTrackingHistory.createdAt,
        assignedTo: users.name,
      })
      .from(assetTrackingHistory)
      .where(eq(assetTrackingHistory.assetId, assetId))
      .innerJoin(users, eq(assetTrackingHistory.assignedToUserId, users.id))
      .orderBy(desc(assetTrackingHistory.createdAt));
    
    return rows.map(row => this.resolveHistoryLabels(row));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(employeeAssets).where(eq(employeeAssets.id, id));
  }
}