import { fieldIsVisible, findCatalogItem } from "./item-catalog";

const isBlank = (value: string | undefined) => value === undefined || value.trim() === "";

export const validateCatalogItemValues = (
    category: string,
    itemName: string,
    itemType: string | null | undefined,
    specifications: Record<string, string>,
    existingSpecificationKeys: string[] = [],
): string | undefined => {
    const item = findCatalogItem(category, itemName);
    if (!item) return `Item "${itemName}" is not configured in category "${category}"`;

    if (item.legacyTypes?.length && itemType && !item.legacyTypes.includes(itemType)) {
        return `Type "${itemType}" is not valid for ${itemName}`;
    }

    const allowedKeys = new Set([...item.fields.map(itemField => itemField.key), ...existingSpecificationKeys]);
    for (const key of Object.keys(specifications)) {
        if (!allowedKeys.has(key)) return `Unknown specification key "${key}" for ${itemName}`;
    }

    for (const itemField of item.fields) {
        const value = specifications[itemField.key];
        if (!fieldIsVisible(specifications, itemField)) {
            if (!isBlank(value)) return `${itemField.label} is not available for the selected options`;
            continue;
        }
        if (itemField.required && isBlank(value)) return `${itemField.label} is required`;
        if (isBlank(value)) continue;

        const trimmed = value.trim();
        if (itemName === "Torque Wrench" && itemField.key === "torqueRange" && (trimmed.length > 12 || !/^\d+(?:-\d+)?$/.test(trimmed))) return "Torque Range must be a number or number-number, up to 12 characters";
        if (itemName === "Battery Stand" && itemField.key === "colourCode" && trimmed && (trimmed.length > 12 || !/^[A-Za-z0-9 -]+$/.test(trimmed))) return "Colour Code must be at most 12 letters, numbers, spaces or hyphens";
        if (itemField.kind === "select" && !itemField.options?.some(option => option.value === trimmed)) {
            return `${itemField.label} has an invalid option`;
        }
        if (itemField.kind === "number") {
            if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return `${itemField.label} must be a number`;
            const number = Number(trimmed);
            if (!Number.isFinite(number)) return `${itemField.label} must be a finite number`;
            if (itemField.min !== undefined && (itemField.minExclusive ? number <= itemField.min : number < itemField.min)) {
                return `${itemField.label} must be ${itemField.minExclusive ? "greater than" : "at least"} ${itemField.min}`;
            }
            if (itemField.max !== undefined && number > itemField.max) return `${itemField.label} must be at most ${itemField.max}`;
            if (itemField.integer && !Number.isInteger(number)) return `${itemField.label} must be a whole number`;
        }
        if (itemField.kind === "text" && trimmed.length > 200) return `${itemField.label} must be at most 200 characters`;
    }

    return undefined;
};
