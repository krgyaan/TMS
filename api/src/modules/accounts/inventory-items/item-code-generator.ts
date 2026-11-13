import { findCatalogItem } from "./item-catalog";

const safeTokenPattern = /^[A-Z0-9/.+%-]+$/;

export const normalizeCapacityToken = (raw: string): string | undefined => {
    const match = raw.trim().match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) return undefined;
    const integer = match[1].replace(/^0+(?=\d)/, "");
    const fraction = (match[2] || "").replace(/0+$/, "");
    return fraction ? `${integer}.${fraction}` : integer;
};

const optionToken = (category: string, itemName: string, fieldKey: string, raw: string): string | undefined => {
    const item = findCatalogItem(category, itemName);
    const configured = item?.fields.find(candidate => candidate.key === fieldKey)?.options?.find(option => option.value === raw)?.codeToken;
    const token = configured || raw.toUpperCase();
    return safeTokenPattern.test(token) ? token : undefined;
};

export const generateTemplatedItemCode = (
    category: string,
    itemName: string,
    specifications: Record<string, string>,
): string | undefined => {
    const template = findCatalogItem(category, itemName)?.codeTemplate;
    if (!template) return undefined;

    let complete = true;
    const code = template.replace(/\{([A-Za-z0-9_]+)\}/g, (_segment, key: string) => {
        const raw = specifications[key]?.trim();
        if (!raw) {
            complete = false;
            return "";
        }
        const token = key === "capacity" ? normalizeCapacityToken(raw) : optionToken(category, itemName, key, raw);
        if (!token) {
            complete = false;
            return "";
        }
        return token;
    });

    return complete && code.length <= 80 ? code : undefined;
};
