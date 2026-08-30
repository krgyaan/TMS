import type { InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";

export const PROJECT_INSURANCE_CATEGORIES: Record<string, string[]> = {
    WC: ["WC"],
    "EAR/CAR": ["CAR", "EAR"],
    Storage: ["Storage"],
    "Transit/Marine": ["Transit", "Open Marine"],
};

export const CATEGORY_NAMES = Object.keys(PROJECT_INSURANCE_CATEGORIES);
export const TOTAL_CATEGORIES = CATEGORY_NAMES.length;

export const ALL_INSURANCE_TYPES = Object.values(PROJECT_INSURANCE_CATEGORIES).flat();
export const TYPE_CATEGORY: Record<string, string> = Object.entries(PROJECT_INSURANCE_CATEGORIES).reduce(
    (acc, [category, types]) => {
        for (const type of types) acc[type] = category;
        return acc;
    },
    {} as Record<string, string>
);

export interface InsuranceChecklistRow {
    categoryName: string;
    types: string[];
    policies: InsurancePolicyRow[];
}
