import type { InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";

export const PROJECT_INSURANCE_CATEGORIES: Record<string, string[]> = {
    "Workers Compensation": ["WC"],
    "Contractor All Risk": ["CAR", "EAR"],
    Storage: ["Storage"],
    Transit: ["Transit"],
    Marine: ["Open Marine"],
};

export const ALL_INSURANCE_TYPES = Object.values(PROJECT_INSURANCE_CATEGORIES).flat();
export const TOTAL_INSURANCE_TYPES = ALL_INSURANCE_TYPES.length;

export const TYPE_CATEGORY: Record<string, string> = Object.entries(PROJECT_INSURANCE_CATEGORIES).reduce(
    (acc, [category, types]) => {
        for (const type of types) acc[type] = category;
        return acc;
    },
    {} as Record<string, string>
);

export interface InsuranceChecklistRow {
    typeName: string;
    category: string;
    policies: InsurancePolicyRow[];
}

export interface InsuranceChecklistGroup {
    category: string;
    types: InsuranceChecklistRow[];
}
