import { normalizeMasterName } from "../masters/name.util";

export type TallyLedgerRole = "imprest" | "salary" | "salary_payable";

export const LEDGER_ROLE_SUFFIX: Record<TallyLedgerRole, string> = {
    imprest: "Imprest",
    salary: "Salary A/c",
    salary_payable: "Salary Payable A/c",
};

const EMPLOYEE_LEDGER_PATTERN = /^(.+?)\s*\((VEP\d+)\)\s*(Imprest|Salary Payable A\/c|Salary A\/c)$/i;

export interface ParsedEmployeeLedger {
    displayName: string;
    employeeCode: string;
    normalizedEmployeeCode: string;
    role: TallyLedgerRole;
}

export function normalizeLedgerName(name: string): string {
    return normalizeMasterName(name).toLowerCase();
}

export function normalizeEmployeeCode(code: string): string {
    return code
        .trim()
        .toUpperCase()
        .replace(/^VEP(?=\d)/, "VE");
}

export function roleFromSuffix(suffix: string): TallyLedgerRole | null {
    switch (normalizeMasterName(suffix).toLowerCase()) {
        case "imprest":
            return "imprest";
        case "salary a/c":
            return "salary";
        case "salary payable a/c":
            return "salary_payable";
        default:
            return null;
    }
}

export function parseEmployeeLedgerName(name: string): ParsedEmployeeLedger | null {
    const match = EMPLOYEE_LEDGER_PATTERN.exec(normalizeMasterName(name));

    if (!match) {
        return null;
    }

    const [, displayName, employeeCode, suffix] = match;
    const role = roleFromSuffix(suffix);

    if (!role) {
        return null;
    }

    return {
        displayName: normalizeMasterName(displayName),
        employeeCode: employeeCode.toUpperCase(),
        normalizedEmployeeCode: normalizeEmployeeCode(employeeCode),
        role,
    };
}
