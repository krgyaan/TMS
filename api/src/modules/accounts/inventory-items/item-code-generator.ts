import { fieldIsVisible, findCatalogItem } from "./item-catalog";

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
    const item = findCatalogItem(category, itemName);
    const template = item?.codeTemplate;
    if (!template) return undefined;

    let complete = true;
    const segments = template.split("/").flatMap(segment => {
        const keys = [...segment.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]);
        const fields = keys.map(key => item.fields.find(candidate => candidate.key === key));
        if (fields.some(field => field && !fieldIsVisible(specifications, field))) return [];
        if (keys.some(key => !specifications[key]?.trim())) {
            if (fields.every(field => field && !field.required)) return [];
            complete = false;
            return [""];
        }
        const rendered = segment.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
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
        return [rendered];
    });
    const code = segments.join("/");

    return complete && code.length <= 80 ? code : undefined;
};

export const getItemCodePreview = (category: string, itemName: string, specifications: Record<string, string>): string => {
    const item = findCatalogItem(category, itemName);
    if (!item) return "Select all options to generate the code";
    if (item.codePrefix) return `${item.codePrefix}-### (number assigned on save)`;
    if (!item.codeTemplate) return "ITM sequence assigned on save";
    return generateTemplatedItemCode(category, itemName, specifications) || "Select all options to generate the code";
};
