export type ItemField = { key: string; label: string; options?: string[] };
export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."] as const;
export type Unit = typeof UNIT_OPTIONS[number];
export type ConversionRule = { from: Unit; to: Unit; factor: number | null };
export const CONVERSION_RULES: ConversionRule[] = [
    { from: "Kg", to: "Mtr", factor: null }, { from: "Mtr", to: "Kg", factor: null },
    { from: "Kg", to: "Ft", factor: null }, { from: "Ft", to: "Kg", factor: null },
    { from: "Mtr", to: "Ft", factor: 3.28084 }, { from: "Ft", to: "Mtr", factor: 0.3048 },
    { from: "RMtr", to: "Sq. Mtr.", factor: null }, { from: "Sq. Mtr.", to: "RMtr", factor: null },
];
export const getConversionRules = (unit?: string) =>
    CONVERSION_RULES.filter(rule => rule.from === unit);

export type ItemCategory = {
    name: string;
    types?: string[];
    fields: ItemField[];
};

const common = (label: string, key: string, options?: string[]): ItemField => ({ key, label, options });

export const ITEM_CATEGORIES: ItemCategory[] = [
    { name: "Copper", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (in Gauge)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "PVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (kg/psi)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "UPVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (kg/psi)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "CPVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (SDR)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "Sleeve Insulation", fields: [common("Diameter (in mm)", "diameter"), common("Thickness (in mm)", "thickness"), common("Class", "class", ["0", "1"])] },
    { name: "Round Duct with Aluminium Foil", fields: [common("Diameter (in mm)", "diameter"), common("Construction", "construction", ["Rigid", "Soft"]), common("Finish", "finish", ["Plain", "With Insulation"]), common("Insulation Thickness", "insulationThickness", ["25 mm", "50 mm"])] },
    { name: "GI Duct / MS Duct", fields: [common("Shape", "shape", ["Round", "Oval", "Rectangular"]), common("Fabrication", "fabrication", ["Hand", "Factory"]), common("Thickness of Sheet (in Gauge)", "thickness")] },
    { name: "GI Sheet / MS Sheet", fields: [common("Width", "width", ["900 mm", "1000 mm", "1200 mm"]), common("Coating (in GSM)", "coating"), common("Thickness (in Gauge)", "thickness")] },
    { name: "Canvas", fields: [common("Type", "type", ["Cloth", "Readymade", "Roll"])] },
    { name: "Nitrile Insulation Sheet / XLPE Insulation Sheet", fields: [common("Thickness (in mm)", "thickness"), common("Coating", "coating", ["Plain", "Aluminium Foil"]), common("Class", "class", ["0", "1"])] },
    { name: "Acoustic Insulation", fields: [common("Type", "type", ["Open Cell (Accousound)", "Glasswool", "Rigid Board"]), common("Thickness", "thickness", ["10 mm", "12 mm", "15 mm", "19 mm", "25 mm"])] },
    { name: "Underdeck Insulation", fields: [common("Type", "type", ["Nitrile", "PUF", "Glasswool (Roll)", "Glasswool (Bag)", "Rigid Board", "Sheet"]), common("Thickness (in mm)", "thickness")] },
    { name: "Aluminium Perforated Sheet", fields: [common("Thickness (in Gauge)", "thickness")] },
    { name: "Tissue Paper", fields: [common("Thickness (in Mil)", "thickness")] },
    { name: "AC Stand", fields: [common("Type", "type", ["Powder Coated", "MS"]), common("Mounting", "mounting", ["Wall", "Floor"]), common("Size", "size", ["18", "24", "26"])] },
    { name: "Rubber Pad", fields: [common("Thickness (in mm)", "thickness"), common("Size (in Inches)", "size")] },
];

export const categoryOptions = ITEM_CATEGORIES.map(category => ({ id: category.name, name: category.name }));
export const getCategory = (name?: string) => ITEM_CATEGORIES.find(category => category.name === name);
