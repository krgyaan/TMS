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

export function itemMasterColumnsForViewport(width: number, isSettings = false) {
    const visible = new Set(["itemCode", "itemName", "hsnCode", "unit", "status", "actions"]);
    const minimumWidth = isSettings ? 708 : 660;
    let usedWidth = minimumWidth;
    const priorities = [
        { key: "itemType", width: 120 },
        { key: "specifications", width: 200 },
        { key: "conversion", width: 150 },
    ];
    for (const column of priorities) {
        if (usedWidth + column.width <= width) {
            visible.add(column.key);
            usedWidth += column.width;
        } else break;
    }
    if (width >= 1536 && usedWidth + 130 <= width) visible.add("createdAt");
    return {
        mobile: width < 768,
        itemType: visible.has("itemType"),
        specifications: visible.has("specifications"),
        conversion: visible.has("conversion"),
        createdAt: visible.has("createdAt"),
        hsn: true,
    };
}
