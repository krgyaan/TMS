export type ItemCategory = "Housekeeping" | "Pantry" | "Stationery";
export type EquipmentCategory = "Housekeeping" | "Pantry";
export type EquipmentCondition = "Good" | "Needs Repair" | "Needs Replacement";
export type EquipmentMovementType =
    | "New Purchase"
    | "Discard - End of Life"
    | "Discard - Damaged/Lost";
export type ApplianceServiceFrequency =
    | "Monthly"
    | "Quarterly"
    | "Half-Yearly"
    | "Yearly"
    | "As Needed";
export type ApplianceCleaningFrequency =
    | "Daily"
    | "Weekly"
    | "Fortnightly"
    | "Monthly"
    | "Quarterly"
    | "As Needed";
export type ApplianceStatus = "In Service" | "Under Repair" | "Discarded";
export type ApplianceVisitType = "Routine Service" | "AMC" | "Repair" | "Filter Change";
export type ApplianceCleaningType =
    | "Routine Cleaning"
    | "Deep Cleaning"
    | "Descaling"
    | "Sanitization";

export const ITEM_CATEGORIES: ItemCategory[] = ["Housekeeping", "Pantry", "Stationery"];
export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ["Housekeeping", "Pantry"];
export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = [
    "Good",
    "Needs Repair",
    "Needs Replacement",
];
export const EQUIPMENT_MOVEMENT_TYPES: EquipmentMovementType[] = [
    "New Purchase",
    "Discard - End of Life",
    "Discard - Damaged/Lost",
];
export const APPLIANCE_SERVICE_FREQUENCIES: ApplianceServiceFrequency[] = [
    "Monthly",
    "Quarterly",
    "Half-Yearly",
    "Yearly",
    "As Needed",
];
export const APPLIANCE_CLEANING_FREQUENCIES: ApplianceCleaningFrequency[] = [
    "Daily",
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Quarterly",
    "As Needed",
];
export const APPLIANCE_STATUSES: ApplianceStatus[] = ["In Service", "Under Repair", "Discarded"];
export const APPLIANCE_VISIT_TYPES: ApplianceVisitType[] = [
    "Routine Service",
    "AMC",
    "Repair",
    "Filter Change",
];
export const APPLIANCE_CLEANING_TYPES: ApplianceCleaningType[] = [
    "Routine Cleaning",
    "Deep Cleaning",
    "Descaling",
    "Sanitization",
];

export interface OfficeInventoryItem {
    id: number;
    category: ItemCategory;
    itemCode: string;
    itemName: string;
    unit: string;
    minStockLevel: number;
    openingStock: number;
    totalPurchased: number;
    totalConsumed: number;
    currentStock: number;
    status: "LOW STOCK" | "OK";
    createdAt: string;
    updatedAt: string;
}

export interface OfficeInventoryItemPayload {
    category: ItemCategory;
    itemCode?: string;
    itemName: string;
    unit: string;
    minStockLevel: number;
    openingStock: number;
}

export interface OfficeInventoryPurchase {
    id: number;
    purchaseDate: string;
    itemId: number;
    itemCode: string;
    itemName: string;
    category: ItemCategory;
    unit: string;
    qtyPurchased: number;
    rate: number;
    amount: number;
    supplier: string | null;
    notes: string | null;
    createdAt: string;
}

export interface OfficeInventoryPurchasePayload {
    purchaseDate: string;
    itemId: number;
    qtyPurchased: number;
    rate: number;
    supplier?: string | null;
    notes?: string | null;
}

export interface OfficeInventoryConsumption {
    id: number;
    consumptionDate: string;
    itemId: number;
    itemCode: string;
    itemName: string;
    category: ItemCategory;
    unit: string;
    qtyIssued: number;
    issuedTo: string | null;
    notes: string | null;
    createdAt: string;
}

export interface OfficeInventoryConsumptionPayload {
    consumptionDate: string;
    itemId: number;
    qtyIssued: number;
    issuedTo?: string | null;
    notes?: string | null;
}

export interface OfficeEquipment {
    id: number;
    category: EquipmentCategory;
    equipmentCode: string;
    itemName: string;
    unit: string;
    location: string | null;
    openingQty: number;
    qtyAdded: number;
    qtyDiscarded: number;
    currentQty: number;
    unitCost: number;
    condition: EquipmentCondition;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OfficeEquipmentPayload {
    category: EquipmentCategory;
    equipmentCode?: string;
    itemName: string;
    unit: string;
    location?: string | null;
    openingQty: number;
    unitCost: number;
    condition: EquipmentCondition;
    remarks?: string | null;
}

export interface OfficeEquipmentLog {
    id: number;
    logDate: string;
    equipmentId: number;
    equipmentCode: string;
    itemName: string;
    category: EquipmentCategory;
    movementType: EquipmentMovementType;
    qty: number;
    cost: number | null;
    reasonNotes: string | null;
    approvedBy: string | null;
    createdAt: string;
}

export interface OfficeEquipmentLogPayload {
    logDate: string;
    equipmentId: number;
    movementType: EquipmentMovementType;
    qty: number;
    cost?: number | null;
    reasonNotes?: string | null;
    approvedBy?: string | null;
}

export interface OfficeAppliance {
    id: number;
    applianceCode: string;
    applianceName: string;
    brandModel: string | null;
    location: string | null;
    purchaseDate: string | null;
    purchaseCost: number | null;
    warrantyExpiry: string | null;
    serviceFrequency: ApplianceServiceFrequency;
    cleaningFrequency: ApplianceCleaningFrequency;
    status: ApplianceStatus;
    discardDate: string | null;
    notes: string | null;
    serviceVisitsCount: number;
    totalMaintenanceExpense: number;
    lastServiceDate: string | null;
    nextServiceDue: string | null;
    cleaningsCount: number;
    lastCleanedDate: string | null;
    nextCleaningDue: string | null;
    isCleaningOverdue: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OfficeAppliancePayload {
    applianceCode?: string;
    applianceName: string;
    brandModel?: string | null;
    location?: string | null;
    purchaseDate?: string | null;
    purchaseCost?: number | null;
    warrantyExpiry?: string | null;
    serviceFrequency: ApplianceServiceFrequency;
    cleaningFrequency: ApplianceCleaningFrequency;
    status: ApplianceStatus;
    discardDate?: string | null;
    notes?: string | null;
}

export interface OfficeApplianceService {
    id: number;
    serviceDate: string;
    applianceId: number;
    applianceCode: string;
    applianceName: string;
    visitType: ApplianceVisitType;
    vendorTechnician: string | null;
    expense: number;
    nextServiceDue: string | null;
    notes: string | null;
    createdAt: string;
}

export interface OfficeApplianceServicePayload {
    serviceDate: string;
    applianceId: number;
    visitType: ApplianceVisitType;
    vendorTechnician?: string | null;
    expense: number;
    nextServiceDue?: string | null;
    notes?: string | null;
}

export interface OfficeApplianceCleaning {
    id: number;
    cleaningDate: string;
    applianceId: number;
    applianceCode: string;
    applianceName: string;
    cleaningType: ApplianceCleaningType;
    doneBy: string | null;
    cost: number;
    notes: string | null;
    createdAt: string;
}

export interface OfficeApplianceCleaningPayload {
    cleaningDate: string;
    applianceId: number;
    cleaningType: ApplianceCleaningType;
    doneBy?: string | null;
    cost?: number | null;
    notes?: string | null;
}

export interface PeriodReportRow {
    id: number;
    itemCode: string;
    itemName: string;
    category: ItemCategory;
    unit: string;
    qtyPurchased: number;
    purchaseAmount: number;
    qtyConsumed: number;
    currentStock: number;
    minStockLevel: number;
    status: "LOW STOCK" | "OK";
}

export interface PeriodReport {
    startDate: string;
    endDate: string;
    category: string;
    rows: PeriodReportRow[];
    totals: {
        qtyPurchased: number;
        purchaseAmount: number;
        qtyConsumed: number;
    };
}

export interface WeeklyTasksDashboard {
    weekStart: string;
    weekEnd: string;
    today: string;
    dueThisWeek: {
        lowStockCount: number;
        cleaningsDueCount: number;
        servicesDueCount: number;
        lowStockItems: Array<{
            id: number;
            itemCode: string;
            itemName: string;
            category: string;
            unit: string;
            currentStock: number;
            minStockLevel: number;
        }>;
        cleaningsDue: Array<{
            id: number;
            applianceCode: string;
            applianceName: string;
            cleaningFrequency: string;
            lastCleanedDate: string | null;
            dueDate: string;
            isOverdue: boolean;
        }>;
        servicesDue: Array<{
            id: number;
            applianceCode: string;
            applianceName: string;
            serviceFrequency: string;
            nextServiceDue: string;
            isOverdue: boolean;
        }>;
    };
    completedThisWeek: {
        purchasesCount: number;
        purchasesValue: number;
        consumptionsCount: number;
        cleaningsCount: number;
        servicesCount: number;
        servicesExpense: number;
        equipmentPurchasesCount: number;
        equipmentDiscardsCount: number;
    };
}
