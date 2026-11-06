import { getCategory } from "./item-config";

export function formatKeySpecification(itemName: string, specifications: Record<string, string> = {}): string {
    const labels = new Map((getCategory(itemName)?.fields || []).map(field => [field.key, field.label]));
    return Object.entries(specifications).flatMap(([key, raw]) => {
        const value = raw?.trim();
        if (!value) return [];
        const label = labels.get(key);
        if (!label) return [value];
        const displayLabel = label.replace(/\s*\([^)]*\)$/, "").trim();
        const unit = label.match(/\((?:in\s+)?([^)]*)\)$/i)?.[1];
        if (key === "strength") return [value];
        if (/gauge/i.test(unit || "")) return [`Gauge ${value}`];
        const suffix = unit && !/^in\s+(gauge|mil)$/i.test(unit) && !value.toLowerCase().includes(unit.toLowerCase()) ? ` ${unit}` : "";
        return [`${displayLabel} ${value}${suffix}`];
    }).join(" · ") || "—";
}

export function itemMasterColumnsForViewport(width: number, isSettings: boolean) {
    return {
        mobile: width < 768,
        hsn: width > 1280,
        compact: width <= 1024,
        createdAt: width >= 1536,
        selection: isSettings,
    };
}
