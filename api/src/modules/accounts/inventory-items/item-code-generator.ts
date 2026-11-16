import { fieldIsVisible, findCatalogItem } from "./item-catalog";

const safeTokenPattern = /^[A-Za-z0-9.+%-]+$/;
export const normalizeCapacityToken = (raw: string): string | undefined => {
    const match = raw.trim().match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) return undefined;
    const integer = match[1].replace(/^0+(?=\d)/, "");
    const fraction = (match[2] || "").replace(/0+$/, "");
    return fraction ? `${integer}.${fraction}` : integer;
};

const tokenFor = (category: string, itemName: string, key: string, raw: string): string | undefined => {
    const configured = findCatalogItem(category, itemName)?.fields.find(candidate => candidate.key === key)?.options?.find(option => option.value === raw)?.codeToken;
    const token = configured || (key === "colourCode" ? raw.trim().replace(/[^a-z0-9-]/gi, "").toUpperCase() : raw.trim().replace(/\s+/g, "-").toUpperCase());
    return safeTokenPattern.test(token) ? token : undefined;
};

export const generateTemplatedItemCode = (category: string, itemName: string, specifications: Record<string, string>): string | undefined => {
    const item = findCatalogItem(category, itemName);
    if (!item?.codeTemplate) return undefined;
    let complete = true;
    const segments = item.codeTemplate.split("/").flatMap(segment => {
        const keys = [...segment.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]);
        if (keys.length && keys.every(key => {
            const configured = item.fields.find(candidate => candidate.key === key);
            return configured && !fieldIsVisible(specifications, configured);
        })) return [];
        const missing = keys.filter(key => !specifications[key]?.trim());
        if (missing.length) {
            const optional = missing.every(key => {
                const configured = item.fields.find(candidate => candidate.key === key);
                return configured && !configured.required;
            });
            if (optional) return [];
            complete = false;
            return [];
        }
        return [segment.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
            const raw = specifications[key].trim();
            const configured = item.fields.find(candidate => candidate.key === key);
            const token = configured?.kind === "number" ? normalizeCapacityToken(raw) : tokenFor(category, itemName, key, raw);
            if (!token) { complete = false; return ""; }
            return token;
        })];
    });
    const code = segments.join("/");
    return complete && code.length > 0 && code.length <= 80 ? code : undefined;
};

export const getItemCodePreview = (category: string, itemName: string, specifications: Record<string, string>): string => {
    const item = findCatalogItem(category, itemName);
    if (!item) return "Select all options to generate the code";
    if (!item.codeTemplate) return "ITM sequence assigned on save";
    return generateTemplatedItemCode(category, itemName, specifications) || "Select all options to generate the code";
};
