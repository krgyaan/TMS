import { normalizeMasterName } from "../masters/name.util";

export interface CategoryLedgerMapping {
    ledger: string;
    group: string;
}

export interface ImprestTallyConfig {
    employeePayableGroup: string;
    categoryLedgers: Readonly<Record<number, CategoryLedgerMapping>>;
    blockedCategoryIds: readonly number[];
    employeeLedgers: Readonly<Record<number, string>>;
}

export const IMPREST_TALLY_CONFIG: ImprestTallyConfig = {
    employeePayableGroup: "Sundry Creditors",
    categoryLedgers: {
        
    },
    blockedCategoryIds: [22, 8],
    employeeLedgers: {},
};

export function resolveCostCentre(projectCode: string | null | undefined): string | null {
    const normalized = normalizeMasterName(projectCode ?? "");

    return normalized.length > 0 ? normalized : null;
}

export function isBlockedCategory(config: ImprestTallyConfig, categoryId: number | null | undefined): boolean {
    return categoryId !== null && categoryId !== undefined && config.blockedCategoryIds.includes(Number(categoryId));
}

export function resolveCategoryLedger(config: ImprestTallyConfig, categoryId: number | null | undefined): CategoryLedgerMapping | null {
    if (categoryId === null || categoryId === undefined) {
        return null;
    }

    const mapping = config.categoryLedgers[Number(categoryId)];

    if (!mapping) {
        return null;
    }

    const ledger = normalizeMasterName(mapping.ledger);
    const group = normalizeMasterName(mapping.group);

    return ledger.length > 0 && group.length > 0 ? { ledger, group } : null;
}

export function resolveEmployeeLedger(config: ImprestTallyConfig, employeeId: number | null | undefined, employeeName: string | null | undefined): string | null {
    const override = employeeId !== null && employeeId !== undefined ? config.employeeLedgers[Number(employeeId)] : undefined;
    const normalized = normalizeMasterName(override ?? employeeName ?? "");

    return normalized.length > 0 ? normalized : null;
}

export function resolveEmployeePayableGroup(config: ImprestTallyConfig): string {
    return normalizeMasterName(config.employeePayableGroup) || "Employee Payables";
}
