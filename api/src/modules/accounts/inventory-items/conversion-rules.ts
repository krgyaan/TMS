export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."] as const;
export type Unit = typeof UNIT_OPTIONS[number];

type ConversionRule = {
    from: Unit;
    to: Unit;
    factor: number | null;
};

export const CONVERSION_RULES: ConversionRule[] = [
    { from: "Kg", to: "Mtr", factor: null },
    { from: "Mtr", to: "Kg", factor: null },
    { from: "Kg", to: "Ft", factor: null },
    { from: "Ft", to: "Kg", factor: null },
    { from: "Mtr", to: "Ft", factor: 3.28084 },
    { from: "Ft", to: "Mtr", factor: 0.3048 },
    { from: "RMtr", to: "Sq. Mtr.", factor: null },
    { from: "Sq. Mtr.", to: "RMtr", factor: null },
];

export const getConversionRule = (from: string, to: string) =>
    CONVERSION_RULES.find(rule => rule.from === from && rule.to === to);

export const conversionLabel = (from: Unit, to: Unit) => `${from} -> ${to}`;

export type ConversionResolution = {
    conversionUnit: Unit | null;
    conversionFactor: string | null;
    conversion: Record<string, string>;
};

export type ConversionOption = {
    to: Unit;
    factor: number | null;
    factorMode: "fixed" | "width" | "manual";
};

const parseWidthMillimetres = (specifications: Record<string, string>) => {
    const width = specifications.width?.trim().match(/^(\d+(?:\.\d+)?)\s*mm$/i);
    if (!width) return undefined;
    const parsed = Number(width[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const getConversionOptions = (from: string, specifications: Record<string, string>): ConversionOption[] => {
    const width = (from === "RMtr" || from === "Sq. Mtr.") ? parseWidthMillimetres(specifications) : undefined;
    return CONVERSION_RULES.filter(rule => rule.from === from).map(rule => {
        if (rule.factor !== null) return { to: rule.to, factor: rule.factor, factorMode: "fixed" };
        if (width !== undefined) {
            return {
                to: rule.to,
                factor: from === "RMtr" ? width / 1000 : 1000 / width,
                factorMode: "width",
            };
        }
        return { to: rule.to, factor: null, factorMode: "manual" };
    });
};

const parseManualFactor = (value: unknown) => {
    if (typeof value !== "number" && typeof value !== "string") return undefined;
    const rawValue = String(value).trim();
    const raw = rawValue.includes(".") ? rawValue.replace(/0+$/, "").replace(/\.$/, "") : rawValue;
    if (!/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(raw)) return undefined;
    const factor = Number(raw);
    return Number.isFinite(factor) && factor > 0 ? factor : undefined;
};

export const resolveConversion = (
    from: string,
    to: string | null | undefined,
    factor: unknown,
    specifications: Record<string, string>,
): ConversionResolution => {
    if (!to) {
        if (factor !== undefined && factor !== null && factor !== "") {
            throw new Error("Conversion factor requires a conversion unit");
        }
        return { conversionUnit: null, conversionFactor: null, conversion: {} };
    }

    if (from === to) throw new Error("Unit and conversion unit must differ");
    const option = getConversionOptions(from, specifications).find(candidate => candidate.to === to);
    if (!option) throw new Error("This unit conversion is not allowed");

    let resolvedFactor = option.factor;
    if (option.factorMode === "manual") {
        resolvedFactor = parseManualFactor(factor) ?? null;
        if (resolvedFactor === null) {
            throw new Error("A positive conversion factor with up to 6 decimals is required");
        }
    }

    return {
        conversionUnit: to as Unit,
        conversionFactor: String(resolvedFactor),
        conversion: { value: conversionLabel(from as Unit, to as Unit) },
    };
};
