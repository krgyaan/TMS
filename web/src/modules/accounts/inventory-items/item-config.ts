export type ItemField = { key: string; label: string; options?: string[] };
export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."] as const;
export type Unit = typeof UNIT_OPTIONS[number];
export const ITEM_GROUPS = ["Raw Materials", "Finished Goods", "Supplies"] as const;
export type ItemGroup = typeof ITEM_GROUPS[number];

export type ItemCategory = {
    name: string;
    types?: string[];
    fields: ItemField[];
    unitOptions?: string[];
    conversionOptions?: string[];
};

const common = (label: string, key: string, options?: string[]): ItemField => ({ key, label, options });

export const ITEM_CATEGORIES: ItemCategory[] = [
    { name: "Copper", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (in Gauge)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "PVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (kg/psi)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "UPVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (kg/psi)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "CPVC Pipe", types: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [common("Diameter (in mm)", "diameter"), common("Thickness (SDR)", "thickness"), common("Strength", "strength", ["Hard", "Soft"])] },
    { name: "Sleeve Insulation", fields: [common("Diameter (in mm)", "diameter"), common("Thickness (in mm)", "thickness"), common("Class", "class", ["0", "1"])], conversionOptions: ["NA"] },
    { name: "Round Duct with Aluminium Foil", fields: [common("Diameter (in mm)", "diameter"), common("Construction", "construction", ["Rigid", "Soft"]), common("Finish", "finish", ["Plain", "With Insulation"]), common("Insulation Thickness", "insulationThickness", ["25 mm", "50 mm"])], conversionOptions: ["NA"] },
    { name: "GI Duct / MS Duct", fields: [common("Shape", "shape", ["Round", "Oval", "Rectangular"]), common("Fabrication", "fabrication", ["Hand", "Factory"]), common("Thickness of Sheet (in Gauge)", "thickness")], conversionOptions: ["NA"] },
    { name: "GI Sheet / MS Sheet", fields: [common("Width", "width", ["900 mm", "1000 mm", "1200 mm"]), common("Coating (in GSM)", "coating"), common("Thickness (in Gauge)", "thickness")], conversionOptions: ["NA"] },
    { name: "Canvas", fields: [common("Type", "type", ["Cloth", "Readymade", "Roll"])], unitOptions: ["RMtr", "Sq. Mtr."], conversionOptions: ["RMtr to Sq. Mtr."] },
    { name: "Nitrile Insulation Sheet / XLPE Insulation Sheet", fields: [common("Thickness (in mm)", "thickness"), common("Coating", "coating", ["Plain", "Aluminium Foil"]), common("Class", "class", ["0", "1"])], unitOptions: ["Sq. Mtr."], conversionOptions: ["NA"] },
    { name: "Acoustic Insulation", fields: [common("Type", "type", ["Open Cell (Accousound)", "Glasswool", "Rigid Board"]), common("Thickness", "thickness", ["10 mm", "12 mm", "15 mm", "19 mm", "25 mm"])], unitOptions: ["Sq. Mtr."], conversionOptions: ["NA"] },
    { name: "Underdeck Insulation", fields: [common("Type", "type", ["Nitrile", "PUF", "Glasswool (Roll)", "Glasswool (Bag)", "Rigid Board", "Sheet"]), common("Thickness (in mm)", "thickness")], unitOptions: ["Sq. Mtr."], conversionOptions: ["NA"] },
    { name: "Aluminium Perforated Sheet", fields: [common("Thickness (in Gauge)", "thickness")], unitOptions: ["Sq. Mtr."], conversionOptions: ["NA"] },
    { name: "Tissue Paper", fields: [common("Thickness (in Mil)", "thickness")], unitOptions: ["Sq. Mtr."], conversionOptions: ["NA"] },
    { name: "AC Stand", fields: [common("Type", "type", ["Powder Coated", "MS"]), common("Mounting", "mounting", ["Wall", "Floor"]), common("Size", "size", ["18", "24", "26"])], unitOptions: ["Nos.", "Kgs."], conversionOptions: ["NA"] },
    { name: "Rubber Pad", fields: [common("Thickness (in mm)", "thickness"), common("Size (in Inches)", "size")], unitOptions: ["Nos."], conversionOptions: ["NA"] },
];

export const ITEM_GROUP_FAMILIES: Record<ItemGroup, string[]> = {
    "Raw Materials": [
        "Copper", "PVC Pipe", "UPVC Pipe", "CPVC Pipe", "Sleeve Insulation",
        "Round Duct with Aluminium Foil", "GI Duct / MS Duct", "GI Sheet / MS Sheet",
        "Nitrile Insulation Sheet / XLPE Insulation Sheet", "Acoustic Insulation",
        "Underdeck Insulation", "Aluminium Perforated Sheet", "Tissue Paper", "Rubber Pad",
    ],
    "Finished Goods": ["AC Stand"],
    Supplies: ["Canvas"],
};

export const categoryOptions = ITEM_CATEGORIES.map(category => ({ id: category.name, name: category.name }));
export const groupOptions = ITEM_GROUPS.map(group => ({ id: group, name: group }));
export const getFamiliesForGroup = (group?: ItemGroup) =>
    group ? ITEM_GROUP_FAMILIES[group].map(name => ({ id: name, name })) : [];
export const getCategory = (name?: string) => ITEM_CATEGORIES.find(category => category.name === name);
