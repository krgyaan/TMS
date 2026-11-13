export type CatalogOption = { value: string; codeToken?: string; helper?: string };
export type CatalogField = {
    key: string;
    label: string;
    kind: "select" | "number" | "text";
    required?: boolean;
    options?: CatalogOption[];
    min?: number;
    minExclusive?: boolean;
    max?: number;
    integer?: boolean;
    suffix?: string;
    showWhen?: { field: string; value: string };
    listColumn?: "type";
};
export type CatalogItem = {
    name: string;
    fields: CatalogField[];
    codeTemplate?: string;
    defaultUnit?: string;
    legacyTypes?: string[];
};
export type CatalogCategory = { name: string; items: CatalogItem[] };

const options = (...values: string[]): CatalogOption[] => values.map(value => ({ value }));
const field = (key: string, label: string, kind: CatalogField["kind"], extra: Partial<CatalogField> = {}): CatalogField => ({ key, label, kind, ...extra });
const legacy = (name: string, fields: CatalogField[], legacyTypes?: string[]): CatalogItem => ({ name, fields, legacyTypes });
const noAttributes = (...names: string[]): CatalogItem[] => names.map(name => ({ name, fields: [] }));

export const ITEM_CATALOG: CatalogCategory[] = [
    {
        name: "Batteries",
        items: [
            { name: "Ni-Cd Battery", codeTemplate: "NICD/{type}/{discharge}/{capacity}AH", fields: [
                field("type", "Type", "select", { required: true, listColumn: "type", options: ["KP", "RGS", "RGP"].map(value => ({ value })) }),
                field("discharge", "Discharge", "select", { required: true, options: options("L", "M", "H") }),
                field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" }),
            ] },
            { name: "VRLA Battery", codeTemplate: "VRLA/{type}/{voltage}/{capacity}AH", fields: [
                field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "AGM" }, { value: "SMF" }, { value: "TGel", codeToken: "TGEL" }] }),
                field("voltage", "Voltage", "select", { required: true, options: options("2V", "12V") }),
                field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" }),
            ] },
            { name: "Flooded Lead-Acid Battery", codeTemplate: "FLA/{type}/{capacity}AH", fields: [
                field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "LMLA" }, { value: "OPzS", codeToken: "OPZS" }, { value: "Plante", codeToken: "PLANTE" }] }),
                field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" }),
            ] },
        ],
    },
    {
        name: "Battery Accessories",
        items: [
            { name: "ICC", fields: [field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("material", "Material", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
            { name: "IPP", fields: [field("numberOfHoles", "Number of Holes", "select", { required: true, options: options("1", "2", "3", "4", "5", "6") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("material", "Material", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
            { name: "Vent Plug", fields: [field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Flip-Flop", codeToken: "FF" }, { value: "Vented", codeToken: "VENT" }] })] },
            { name: "Electrolyte", fields: [field("typeMaterial", "Type/Material", "select", { required: true, listColumn: "type", options: [{ value: "H2SO4 (Sulphuric Acid)", codeToken: "H2SO4" }, { value: "KOH (Potassium Hydroxide)", codeToken: "KOH" }, { value: "DM Water", codeToken: "DMW" }] })] },
            { name: "Shrouds", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: options("Linear", "Horizontal") }), field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true })] },
            { name: "Cell Lifter", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: options("Normal", "Insulated") })] },
            { name: "Battery Stand", fields: [field("material", "Material", "select", { required: true, options: options("MS", "FR") }), field("configuration", "Configuration", "select", { required: true, options: options("Step", "Tier") }), field("colourCode", "Colour Code", "text")] },
            { name: "Battery Terminal Box", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), field("lugSize", "Lug Size", "select", { required: true, options: options("M10", "M20") })] },
            { name: "Glands", fields: [field("specifications", "Specifications", "text")] },
        ],
    },
    {
        name: "Testing and Measuring Instruments",
        items: [
            { name: "Multimeter", fields: [field("measurementType", "Measurement Type", "select", { required: true, listColumn: "type", options: [{ value: "AC" }, { value: "DC" }, { value: "AC-DC", codeToken: "ACDC" }] }), field("voltageRange", "Voltage Range", "number", { required: true, min: 1, max: 2000, suffix: "V" }), field("currentRange", "Current Range", "number", { required: true, min: 1, max: 2000, suffix: "A" })] },
            { name: "Clamp Meter", fields: [field("measurementType", "Measurement Type", "select", { required: true, listColumn: "type", options: [{ value: "AC" }, { value: "DC" }, { value: "AC-DC", codeToken: "ACDC" }] }), field("voltageRange", "Voltage Range", "number", { required: true, min: 1, max: 2000, suffix: "V" }), field("currentRange", "Current Range", "number", { required: true, min: 1, max: 2000, suffix: "A" })] },
            { name: "Torque Wrench", fields: [field("torqueRange", "Torque Range (Nm)", "text", { required: true, suffix: "Nm" })] },
            ...noAttributes("Thermometer", "Thermometer Stand", "Temperature Gun", "Hydrometer", "Hydrometer Stand", "Earth Fault Locator", "Impedance Tester"),
        ],
    },
    {
        name: "Battery Maintenance and Safety Equipment",
        items: noAttributes("Eye Wash Bottle", "Eye Wash Station", "Boric Acid", "Petroleum Jelly", "Safety Goggles", "Safety Gloves", "Safety Apron", "Rubber Boots", "Stand Insulator", "Strout Bristles"),
    },
    {
        name: "Hardware and Fasteners",
        items: [
            { name: "PP Sheet", fields: [], defaultUnit: "Sq. Mtr." },
            { name: "Washer", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: options("Plain", "Spring", "Belleville") }), field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") })] },
            { name: "Bolt", fields: [field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("length", "Length", "number", { required: true, min: 0, minExclusive: true, suffix: "mm" })] },
            { name: "Nut", fields: [field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") })] },
        ],
    },
    {
        name: "Battery Chargers",
        items: [{ name: "Battery Charger", fields: [
            field("chargerType", "Charger Type", "select", { required: true, listColumn: "type", options: options("FCBC", "FC", "BC", "GC") }),
            field("technology", "Technology", "select", { required: true, options: options("SCR", "IGBT", "SMPS") }),
            field("regulationType", "Regulation Type", "select", { required: true, options: options("CC", "CV") }),
            field("voltage", "Voltage", "select", { required: true, suffix: "V", options: options("24", "30", "48", "96", "110", "220", "440") }),
            field("current", "Current", "number", { required: true, min: 0, minExclusive: true, suffix: "A" }),
            field("pulse", "Pulse", "select", { required: true, showWhen: { field: "technology", value: "IGBT" }, options: options("6", "12") }),
            field("moduleType", "Module Type", "select", { required: true, options: [{ value: "Non-Modular", codeToken: "NM" }, { value: "Modular", codeToken: "MOD" }, { value: "Hot-Swappable", codeToken: "HS" }] }),
        ] }],
    },
    {
        name: "UPS",
        items: [{ name: "UPS", fields: [
            field("topology", "Topology/Type", "select", { required: true, listColumn: "type", options: [
                { value: "Offline", codeToken: "OFF", helper: "Switches to battery operation during power failure." },
                { value: "Line-Interactive", codeToken: "LI", helper: "AVR + Battery Backup." },
                { value: "Online (Double Conversion)", codeToken: "ODC", helper: "AC to DC to AC." },
                { value: "Delta Conversion", codeToken: "DELTA", helper: "Online UPS with Delta Conversion Technology." },
                { value: "Modular", codeToken: "MOD", helper: "Rack-based power modules with hot-swappable modules, N+1 redundancy and scalability." },
            ] }),
            field("zeroTransferTime", "Zero Transfer Time", "select", { showWhen: { field: "topology", value: "Online (Double Conversion)" }, options: options("Yes", "No") }),
            field("outputPowerFactor", "Output Power Factor", "select", { required: true, options: options("0.8", "0.9", "1.0") }),
            field("phaseConfiguration", "Phase Configuration", "select", { required: true, options: options("1/1", "3/1", "3/3") }),
            field("redundancy", "Redundancy", "select", { options: options("None", "N+1") }),
            field("efficiency", "Efficiency", "select", { required: true, options: options("90%", "95%", "Eco Mode") }),
            field("monitoring", "Monitoring", "select", { options: options("None", "SNMP Card") }),
        ] }],
    },
    {
        name: "Solar Power and Distribution Equipment",
        items: noAttributes("SPV (Solar Photovoltaic)", "PCU (Power Conditioning Unit)", "Structure", "ACDB (AC Distribution Box)", "DCDB (DC Distribution Box)"),
    },
    {
        name: "Legacy",
        items: [
            legacy("Copper", [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (in Gauge)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })], ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"]),
            legacy("PVC Pipe", [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (kg/psi)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })], ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"]),
            legacy("UPVC Pipe", [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (kg/psi)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })], ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"]),
            legacy("CPVC Pipe", [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (SDR)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })], ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"]),
            legacy("Sleeve Insulation", [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (in mm)", "text"), field("class", "Class", "select", { options: options("0", "1") })]),
            legacy("Round Duct with Aluminium Foil", [field("diameter", "Diameter (in mm)", "text"), field("construction", "Construction", "select", { options: options("Rigid", "Soft") }), field("finish", "Finish", "select", { options: options("Plain", "With Insulation") }), field("insulationThickness", "Insulation Thickness", "select", { options: options("25 mm", "50 mm") })]),
            legacy("GI Duct / MS Duct", [field("shape", "Shape", "select", { options: options("Round", "Oval", "Rectangular") }), field("fabrication", "Fabrication", "select", { options: options("Hand", "Factory") }), field("thickness", "Thickness of Sheet (in Gauge)", "text")]),
            legacy("GI Sheet / MS Sheet", [field("width", "Width", "select", { options: options("900 mm", "1000 mm", "1200 mm") }), field("coating", "Coating (in GSM)", "text"), field("thickness", "Thickness (in Gauge)", "text")]),
            legacy("Canvas", [field("type", "Type", "select", { options: options("Cloth", "Readymade", "Roll") })]),
            legacy("Nitrile Insulation Sheet / XLPE Insulation Sheet", [field("thickness", "Thickness (in mm)", "text"), field("coating", "Coating", "select", { options: options("Plain", "Aluminium Foil") }), field("class", "Class", "select", { options: options("0", "1") })]),
            legacy("Acoustic Insulation", [field("type", "Type", "select", { options: options("Open Cell (Accousound)", "Glasswool", "Rigid Board") }), field("thickness", "Thickness", "select", { options: options("10 mm", "12 mm", "15 mm", "19 mm", "25 mm") })]),
            legacy("Underdeck Insulation", [field("type", "Type", "select", { options: options("Nitrile", "PUF", "Glasswool (Roll)", "Glasswool (Bag)", "Rigid Board", "Sheet") }), field("thickness", "Thickness (in mm)", "text")]),
            legacy("Aluminium Perforated Sheet", [field("thickness", "Thickness (in Gauge)", "text")]),
            legacy("Tissue Paper", [field("thickness", "Thickness (in Mil)", "text")]),
            legacy("AC Stand", [field("type", "Type", "select", { options: options("Powder Coated", "MS") }), field("mounting", "Mounting", "select", { options: options("Wall", "Floor") }), field("size", "Size", "select", { options: options("18", "24", "26") })]),
            legacy("Rubber Pad", [field("thickness", "Thickness (in mm)", "text"), field("size", "Size (in Inches)", "text")]),
        ],
    },
];

export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."] as const;
export const DEFAULT_UNIT = "Nos.";
export const findCatalogItem = (categoryName: string, itemName: string) =>
    ITEM_CATALOG.find(category => category.name === categoryName)?.items.find(item => item.name === itemName);
export const categoryForItem = (itemName: string) => ITEM_CATALOG.find(category => category.items.some(item => item.name === itemName));
export const fieldIsVisible = (specifications: Record<string, string>, itemField: CatalogField) =>
    !itemField.showWhen || specifications[itemField.showWhen.field] === itemField.showWhen.value;
