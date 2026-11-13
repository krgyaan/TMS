import { findCatalogItem } from "./item-catalog";

export type KeySpecificationAttribute = { key: string; label: string; value: string };

export function keySpecificationAttributes(
    category: string | null | undefined,
    itemName: string,
    specifications: Record<string, string> = {},
    itemType?: string | null,
): KeySpecificationAttribute[] {
    const item = findCatalogItem(category || "Legacy", itemName);
    const configured = item?.fields || [];
    const result: KeySpecificationAttribute[] = configured.flatMap(field => {
        const rawValue = specifications[field.key]?.trim();
        const value = rawValue && field.suffix && !rawValue.toLowerCase().endsWith(field.suffix.toLowerCase()) ? `${rawValue} ${field.suffix}` : rawValue;
        return value ? [{ key: field.key, label: field.listColumn === "type" ? "Type" : field.label.replace(/\s*\([^)]*\)$/, "").trim(), value }] : [];
    });
    const knownKeys = new Set(configured.map(field => field.key));
    if (itemType?.trim() && !configured.some(field => field.listColumn === "type" && specifications[field.key]?.trim())) {
        result.unshift({ key: "itemType", label: "Type", value: itemType.trim() });
    }
    for (const [key, raw] of Object.entries(specifications)) {
        const value = raw?.trim();
        if (value && !knownKeys.has(key)) result.push({ key, label: key, value });
    }
    return result;
}

export function formatKeySpecification(category: string | null | undefined, itemName: string, specifications: Record<string, string> = {}, itemType?: string | null): string {
    return keySpecificationAttributes(category, itemName, specifications, itemType)
        .map(attribute => `${attribute.label}: ${attribute.value}`).join("\n") || "—";
}

export function itemMasterColumnsForViewport(width: number) {
    return {
        mobile: width < 768,
        createdBy: width >= 1280,
        category: width >= 1120,
        unit: width >= 960,
    };
}
