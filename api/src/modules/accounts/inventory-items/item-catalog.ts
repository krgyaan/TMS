export type CatalogOption = { value: string; codeToken?: string; helper?: string };
export type CatalogField = {
    key: string; label: string; kind: "select" | "number" | "text"; required?: boolean;
    options?: CatalogOption[]; min?: number; minExclusive?: boolean; max?: number; integer?: boolean;
    suffix?: string; showWhen?: { field: string; value: string }; listColumn?: "type";
    hideWhen?: { field: string; value: string }[];
};
export type CatalogItem = {
    name: string; pending?: boolean; hsnNotApplicable?: boolean; fields: CatalogField[];
    codeTemplate?: string; defaultUnit?: string; legacyTypes?: string[];
};
export type CatalogCategory = { name: string; items: CatalogItem[] };

const options = (...values: string[]): CatalogOption[] => values.map(value => ({ value }));
const field = (key: string, label: string, kind: CatalogField["kind"], extra: Partial<CatalogField> = {}): CatalogField => ({ key, label, kind, ...extra });
const select = (key: string, label: string, values: string[], extra: Partial<CatalogField> = {}) => field(key, label, "select", { required: true, options: options(...values), ...extra });
const noCode = (name: string, extra: Partial<CatalogItem> = {}): CatalogItem => ({ name, fields: [], ...extra });
const aliases: Record<string, string> = { "Solar Photovoltaic": "SPV (Solar Photovoltaic)", "Power Conditioning Unit": "PCU (Power Conditioning Unit)", ACDB: "ACDB (AC Distribution Box)", DCDB: "DCDB (DC Distribution Box)", "Flooded Lead-Acid Battery": "Flooded Lead-Acid (FLA) Battery", "Strout Bristles": "Shroud Bristles" };
const resolvedItemName = (name: string) => aliases[name] || name;

export const ITEM_CATALOG: CatalogCategory[] = [
    { name: "Batteries", items: [
        { name: "Ni-Cd Battery", codeTemplate: "NICD/{type}/{discharge}/{capacity}", fields: [select("type", "Type", ["KP", "RGS", "RGP"], { listColumn: "type" }), select("discharge", "Discharge", ["L", "M", "H"]), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
        { name: "VRLA Battery", codeTemplate: "VRLA/{type}/{voltage}/{capacity}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "AGM" }, { value: "SMF" }, { value: "TGel", codeToken: "TGEL" }] }), select("voltage", "Voltage", ["2V", "12V"]), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
        { name: "Flooded Lead-Acid (FLA) Battery", codeTemplate: "FLA/{type}/{capacity}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "LMLA" }, { value: "OPzS", codeToken: "OPZS" }, { value: "Plante", codeToken: "PLANTE" }] }), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
    ] },
    { name: "Battery Accessories", items: [
        { name: "ICC", codeTemplate: "ICC/{mRating}/{insulation}/{coating}", fields: [select("mRating", "M Rating (Hole Diameter)", ["M10", "M20"]), select("insulation", "Insulation", ["Insulated", "Non-Insulated"]), select("coating", "Coating", ["Nickel-Coated", "Tin-Coated"])] },
        { name: "IPP", codeTemplate: "IPP/{numberOfPoles}/{mRating}/{insulation}/{coating}", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), select("mRating", "M Rating", ["M10", "M20"]), select("insulation", "Insulation", ["Insulated", "Non-Insulated"]), select("coating", "Coating", ["Nickel-Coated", "Tin-Coated"])] },
        { name: "Vent Plug", codeTemplate: "Vent/{mRating}/{type}", fields: [select("mRating", "M Rating", ["M10", "M20"]), select("type", "Type", ["Flip-Flop", "Vented"], { listColumn: "type" })] },
        { name: "Electrolyte", codeTemplate: "Electrolyte/{type}", defaultUnit: "Litre", fields: [select("type", "Type / Material", ["H2SO4", "KOH", "DM Water"], { listColumn: "type" })] },
        { name: "Shrouds", codeTemplate: "Shrouds/{type}/{numberOfPoles}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Linear", codeToken: "L" }, { value: "Horizontal", codeToken: "H" }] }), field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true, showWhen: { field: "type", value: "Linear" } })] },
        { name: "Cell Lifter", codeTemplate: "CellLifter/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Non-Insulated", codeToken: "NI" }, { value: "Insulated", codeToken: "I" }] })] },
        { name: "Battery Stand", codeTemplate: "BStand/{material}/{steps}/{tiers}/{colourCode}", fields: [select("material", "Material", ["MS", "FR"]), field("steps", "Number of Steps", "number", { required: true, min: 1, integer: true }), field("tiers", "Number of Tiers", "number", { required: true, min: 1, integer: true }), field("colourCode", "Colour Code", "text", { required: true })] },
        { name: "Battery Terminal Box", codeTemplate: "BTerminal/{numberOfPoles}/{mRating}", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), select("mRating", "M Rating (Lug Hole Diameter)", ["M10", "M20"])] },
        noCode("Eye Wash Bottle", { codeTemplate: "EyeWashBottle", hsnNotApplicable: true }), noCode("Eye Wash Station", { codeTemplate: "EyeWashStation", hsnNotApplicable: true }), noCode("Safety Goggles", { codeTemplate: "SafetyGoggles", hsnNotApplicable: true }),
        noCode("Safety Gloves", { codeTemplate: "SafetyGloves", defaultUnit: "Pair" }), noCode("Safety Apron", { codeTemplate: "SafetyApron" }), noCode("Rubber Boots", { codeTemplate: "RubberBoots", hsnNotApplicable: true, defaultUnit: "Pair" }),
        noCode("Boric Acid", { codeTemplate: "BoricAcid", hsnNotApplicable: true, defaultUnit: "Kg" }), noCode("Petroleum Jelly", { codeTemplate: "PJelly", hsnNotApplicable: true, defaultUnit: "Kg" }), noCode("Shroud Bristles", { codeTemplate: "ShroudBristles", hsnNotApplicable: true }),
        { name: "PP Sheet", codeTemplate: "PPSheet/{thickness}/{dimensions}", defaultUnit: "Sq. Mtr.", fields: [field("thickness", "Thickness", "text", { required: true }), field("dimensions", "Dimensions", "text", { required: true })] },
    ] },
    { name: "Testing & Measuring Instruments", items: [
        ...["Multimeter", "Clamp Meter"].map((name): CatalogItem => ({ name, codeTemplate: `${name.replace(/ /g, "")}/{measurementType}/{voltageRange}/{currentRange}`, fields: [select("measurementType", "Measurement Type", ["AC", "DC", "AC-DC"], { listColumn: "type" }), field("voltageRange", "Voltage Range (V)", "number", { required: true, min: 0, minExclusive: true }), field("currentRange", "Current Range (A)", "number", { required: true, min: 0, minExclusive: true })] })),
        { name: "Torque Wrench", codeTemplate: "TorqueWrench/{torqueRange}", fields: [field("torqueRange", "Torque Range (Nm)", "text", { required: true })] },
        noCode("Thermometer", { codeTemplate: "Thermometer" }),
        noCode("Thermometer Stand", { codeTemplate: "ThermometerStand" }),
        noCode("Temperature Gun", { codeTemplate: "TemperatureGun" }),
        noCode("Hydrometer", { codeTemplate: "Hydrometer", fields: [field("measurementRange", "Measurement Range", "text", { required: true })] }),
        noCode("Hydrometer Stand", { codeTemplate: "HydrometerStand", fields: [field("specification", "Specification", "text", { required: true })] }),
        noCode("Earth Fault Locator", { codeTemplate: "EarthFaultLocator", fields: [field("measurementRange", "Measurement / Detection Range", "text", { required: true })] }),
        noCode("Impedance Tester", { codeTemplate: "ImpedanceTester", fields: [field("measurementRange", "Measurement Range", "text", { required: true })] }),
    ] },
    { name: "Hardware & Fasteners", items: [
        { name: "Washer", codeTemplate: "Washer/{type}/{material}/{mRating}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Plain", codeToken: "P" }, { value: "Spring", codeToken: "S" }, { value: "Belleville", codeToken: "B" }] }), select("material", "Material", ["SS", "GI"]), select("mRating", "M Rating", ["M10", "M20"])] },
        { name: "Bolt", codeTemplate: "Bolt/{material}/{mRating}/{length}", fields: [select("material", "Material", ["SS", "GI"]), select("mRating", "M Rating", ["M10", "M20"]), field("length", "Length (mm)", "number", { required: true, min: 0, minExclusive: true })] },
        { name: "Nut", codeTemplate: "Nut/{material}/{mRating}", fields: [select("material", "Material", ["SS", "GI"]), select("mRating", "M Rating", ["M10", "M20"])] },
    ] },
    { name: "Battery Chargers", items: [{ name: "Battery Charger", codeTemplate: "{chargerType}/{technology}/{regulationType}/{voltage}V/{current}A/{pulse}/{moduleType}", fields: [select("chargerType", "Charger Type", ["FCBC", "FC", "BC", "GC"], { listColumn: "type" }), select("technology", "Technology", ["SCR", "IGBT", "SMPS"]), select("regulationType", "Regulation Type", ["CC", "CV"]), select("voltage", "Voltage (V)", ["24", "30", "48", "96", "110", "220", "440"]), field("current", "Current (A)", "number", { required: true, min: 0, minExclusive: true }), field("pulse", "Pulse", "select", { required: true, showWhen: { field: "technology", value: "IGBT" }, options: options("6", "12") }), field("moduleType", "Module Type", "select", { required: true, showWhen: { field: "technology", value: "SMPS" }, options: [{ value: "Non-Modular" }, { value: "Modular", codeToken: "M" }, { value: "Hot-Swappable" }] })] }] },
    { name: "UPS", items: [{ name: "UPS", pending: true, fields: [field("topology", "Topology / Type", "select", { options: [
        { value: "Offline", helper: "Switches to battery operation during power failure." },
        { value: "Line-Interactive", helper: "AVR + Battery Backup." },
        { value: "Online (Double Conversion)", helper: "AC to DC to AC." },
        { value: "Delta Conversion", helper: "Online UPS with Delta Conversion Technology." },
        { value: "Modular", helper: "Rack-based power modules with hot-swappable modules, N+1 redundancy and scalability." },
    ] }), field("zeroTransferTime", "Zero Transfer Time", "select", { showWhen: { field: "topology", value: "Online (Double Conversion)" }, options: options("Yes", "No") }), select("outputPowerFactor", "Output Power Factor", ["0.8", "0.9", "1.0"]), select("phaseConfiguration", "Phase Configuration", ["1/1", "3/1", "1/3", "3/3"]), select("efficiency", "Efficiency", ["90%", "95%", "Eco Mode"]), field("monitoring", "Monitoring", "select", { options: options("SNMP Card") })] }] },
    { name: "Solar Power", items: [
        { name: "SPV (Solar Photovoltaic)", codeTemplate: "SPV/{type}/{manufacturing}/{wattage}", fields: [field("type", "Type", "select", { required: true, options: [{ value: "N-Topcon (NT)", codeToken: "NT" }, { value: "Mono Perc (MP)", codeToken: "MP" }] }), field("manufacturing", "Manufacturing", "select", { required: true, options: [{ value: "DCR", codeToken: "D" }, { value: "Non-DCR", codeToken: "ND" }, { value: "Imported", codeToken: "I" }] }), field("wattage", "Wattage (Wp)", "number", { required: true, min: 0, minExclusive: true })] },
        noCode("MC4 Connector (in Pairs)", { codeTemplate: "MC4", defaultUnit: "Pair" }), noCode("Earthing Insulator", { codeTemplate: "EarthingInsulator" }), noCode("PCU (Power Conditioning Unit)"), noCode("Structure"), noCode("ACDB (AC Distribution Box)"), noCode("DCDB (DC Distribution Box)"),
    ] },
    { name: "Cables", items: [{ name: "Cable", codeTemplate: "Cable/{currentType}/{voltage}/{material}/{armouring}/{fireRating}/{cores}/{thickness}", fields: [select("currentType", "Current Type", ["AC", "DC"]), field("voltage", "Voltage", "select", { required: true, options: [{ value: "LT" }, { value: "11 KV HT", codeToken: "11HT" }, { value: "33 KV HT", codeToken: "33HT" }] }), field("material", "Material", "select", { required: true, options: [{ value: "Copper", codeToken: "Cu" }, { value: "Aluminium", codeToken: "Al" }, { value: "Galvanized Iron", codeToken: "GI" }] }), field("armouring", "Armouring", "select", { required: true, options: [{ value: "Non Shielded", codeToken: "NS" }, { value: "Shielded", codeToken: "S" }, { value: "Armoured", codeToken: "A" }, { value: "Unarmoured", codeToken: "UA" }] }), field("fireRating", "Fire Rating", "select", { required: true, options: options("NFRLS", "FRLS", "FRLSH", "LSZH") }), field("cores", "Number of Cores", "number", { required: true, min: 1, max: 12, integer: true }), field("thickness", "Cable Thickness (sq. mm.)", "select", { required: true, options: options("0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16", "25", "35", "50", "70", "95", "120", "150", "185", "240", "300", "400") })] }] },
    { name: "Lugs", items: [{ name: "Lug", codeTemplate: "Lug/{type}/{insulation}/{material}/{cableSize}/{studHole}", fields: [field("type", "Type", "select", { required: true, options: options("Ring", "Pin", "Reducer", "Palm", "Hex Snap", "Fork") }), field("insulation", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("material", "Material", "select", { required: true, options: [{ value: "Copper", codeToken: "Cu" }, { value: "Aluminium", codeToken: "Al" }, { value: "Bimetallic", codeToken: "BM" }] }), field("cableSize", "Cable Size (mm)", "number", { required: true, min: 0, minExclusive: true }), field("studHole", "Stud Hole (mm)", "number", { required: true, min: 0, minExclusive: true, hideWhen: ["Pin", "Reducer", "Hex Snap"].map(value => ({ field: "type", value })) })] }] },
    { name: "Glands", items: [noCode("Gland")] },
    { name: "Ferrules", items: [{ name: "Ferrule", codeTemplate: "Ferrule/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Alphabet", codeToken: "A" }, { value: "Numeric", codeToken: "N" }] })] }] },
    { name: "AC Accessories", items: [
        { name: "Copper", legacyTypes: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (in Gauge)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })] },
        { name: "PVC Pipe", legacyTypes: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (kg/psi)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })] },
        { name: "UPVC Pipe", legacyTypes: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (kg/psi)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })] },
        { name: "CPVC Pipe", legacyTypes: ["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"], fields: [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (SDR)", "text"), field("strength", "Strength", "select", { options: options("Hard", "Soft") })] },
        { name: "Sleeve Insulation", fields: [field("diameter", "Diameter (in mm)", "text"), field("thickness", "Thickness (in mm)", "text"), field("class", "Class", "select", { options: options("0", "1") })] },
        { name: "Round Duct with Aluminium Foil", fields: [field("diameter", "Diameter (in mm)", "text"), field("construction", "Construction", "select", { options: options("Rigid", "Soft") }), field("finish", "Finish", "select", { options: options("Plain", "With Insulation") }), field("insulationThickness", "Insulation Thickness", "select", { options: options("25 mm", "50 mm") })] },
        { name: "GI Duct / MS Duct", fields: [field("shape", "Shape", "select", { options: options("Round", "Oval", "Rectangular") }), field("fabrication", "Fabrication", "select", { options: options("Hand", "Factory") }), field("thickness", "Thickness of Sheet (in Gauge)", "text")] },
        { name: "GI Sheet / MS Sheet", fields: [field("width", "Width", "select", { options: options("900 mm", "1000 mm", "1200 mm") }), field("coating", "Coating (in GSM)", "text"), field("thickness", "Thickness (in Gauge)", "text")] },
        { name: "Canvas", fields: [field("type", "Type", "select", { options: options("Cloth", "Readymade", "Roll") })] },
        { name: "Nitrile Insulation Sheet / XLPE Insulation Sheet", fields: [field("thickness", "Thickness (in mm)", "text"), field("coating", "Coating", "select", { options: options("Plain", "Aluminium Foil") }), field("class", "Class", "select", { options: options("0", "1") })] },
        { name: "Acoustic Insulation", fields: [field("type", "Type", "select", { options: options("Open Cell (Accousound)", "Glasswool", "Rigid Board") }), field("thickness", "Thickness", "select", { options: options("10 mm", "12 mm", "15 mm", "19 mm", "25 mm") })] },
        { name: "Underdeck Insulation", fields: [field("type", "Type", "select", { options: options("Nitrile", "PUF", "Glasswool (Roll)", "Glasswool (Bag)", "Rigid Board", "Sheet") }), field("thickness", "Thickness (in mm)", "text")] },
        { name: "Aluminium Perforated Sheet", fields: [field("thickness", "Thickness (in Gauge)", "text")] }, { name: "Tissue Paper", fields: [field("thickness", "Thickness (in Mil)", "text")] },
        { name: "AC Stand", fields: [field("type", "Type", "select", { options: options("Powder Coated", "MS") }), field("mounting", "Mounting", "select", { options: options("Wall", "Floor") }), field("size", "Size", "select", { options: options("18", "24", "26") })] },
        { name: "Rubber Pad", fields: [field("thickness", "Thickness (in mm)", "text"), field("size", "Size (in Inches)", "text")] },
        { name: "Stand Insulator", fields: [field("specification", "Specification", "text")] },
    ] },
];

export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr.", "Litre", "Container", "Pair", "Set"] as const;
export const DEFAULT_UNIT = "Nos.";
export const findCatalogItem = (categoryName: string, itemName: string) => ITEM_CATALOG.find(category => category.name === categoryName)?.items.find(item => item.name === resolvedItemName(itemName));
const fixedUnits: Record<string, string[]> = {
    "Ni-Cd Battery": ["Nos."], "VRLA Battery": ["Nos."], "Flooded Lead-Acid (FLA) Battery": ["Nos."], ICC: ["Nos."], IPP: ["Nos."], "Vent Plug": ["Nos."],
    Electrolyte: ["Litre", "Container"], Shrouds: ["Nos."], "Cell Lifter": ["Nos."], "Battery Stand": ["Nos."], "Battery Terminal Box": ["Nos."],
    "Eye Wash Bottle": ["Nos."], "Eye Wash Station": ["Nos."], "Safety Goggles": ["Nos."], "Safety Gloves": ["Pair"], "Safety Apron": ["Nos."], "Rubber Boots": ["Pair"],
    "Boric Acid": ["Kg"], "Petroleum Jelly": ["Kg"], "Shroud Bristles": ["Nos."], "PP Sheet": ["Sq. Mtr."],
    Multimeter: ["Nos."], "Clamp Meter": ["Nos."], "Torque Wrench": ["Nos."], Thermometer: ["Nos."], "Thermometer Stand": ["Nos."], "Temperature Gun": ["Nos."], Hydrometer: ["Nos."], "Hydrometer Stand": ["Nos."], "Earth Fault Locator": ["Nos."], "Impedance Tester": ["Nos."],
    Washer: ["Nos."], Bolt: ["Nos."], Nut: ["Nos."], "Battery Charger": ["Nos."],
    "SPV (Solar Photovoltaic)": ["Nos."], "MC4 Connector (in Pairs)": ["Pair"], "Earthing Insulator": ["Nos."], Ferrule: ["Nos."],
};
export const getAllowedUnits = (_categoryName: string, itemName: string) => fixedUnits[resolvedItemName(itemName)] || UNIT_OPTIONS;
export const getDefaultUnit = (categoryName: string, itemName: string) => findCatalogItem(categoryName, itemName)?.defaultUnit || getAllowedUnits(categoryName, itemName)[0] || DEFAULT_UNIT;
export const resolveCatalogItemByName = (name: string) => ITEM_CATALOG.flatMap(category => category.items).find(item => item.name === resolvedItemName(name));
export const getItemMainCategory = (itemName: string, fallback?: string | null) => ITEM_CATALOG.find(category => category.items.some(item => item.name === resolvedItemName(itemName)))?.name || fallback || "AC Accessories";
export const categoryForItem = (itemName: string) => ITEM_CATALOG.find(category => category.items.some(item => item.name === resolvedItemName(itemName)));
export const fieldIsVisible = (specifications: Record<string, string>, itemField: CatalogField) =>
    (!itemField.showWhen || specifications[itemField.showWhen.field] === itemField.showWhen.value)
    && !(itemField.hideWhen || []).some(condition => specifications[condition.field] === condition.value);
