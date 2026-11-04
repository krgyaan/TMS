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
