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
    subcategory?: string;
    pending?: boolean;
    fields: CatalogField[];
    codeTemplate?: string;
    codePrefix?: string;
    defaultUnit?: string;
    legacyTypes?: string[];
};
export type CatalogCategory = { name: string; items: CatalogItem[] };

const options = (...values: string[]): CatalogOption[] => values.map(value => ({ value }));
const field = (key: string, label: string, kind: CatalogField["kind"], extra: Partial<CatalogField> = {}): CatalogField => ({ key, label, kind, ...extra });
const legacy = (name: string, fields: CatalogField[], legacyTypes?: string[]): CatalogItem => ({ name, fields, legacyTypes });
const sequencePrefixes: Record<string, string> = {
    Thermometer: "THM", "Thermometer Stand": "THMS", "Temperature Gun": "TGUN", Hydrometer: "HYD",
    "Hydrometer Stand": "HYDS", "Earth Fault Locator": "EFL", "Impedance Tester": "IMPT",
    "Eye Wash Bottle": "EWB", "Eye Wash Station": "EWS", "Boric Acid": "BORIC", "Petroleum Jelly": "PJELLY",
    "Safety Goggles": "GOG", "Safety Gloves": "GLV", "Safety Apron": "APR", "Rubber Boots": "RBT",
    "Stand Insulator": "SINS", "Strout Bristles": "STB", "PP Sheet": "PPS", Glands: "GLD",
    "Torque Wrench": "TW", "SPV (Solar Photovoltaic)": "SPV", "PCU (Power Conditioning Unit)": "PCU",
    Structure: "STR", "ACDB (AC Distribution Box)": "ACDB", "DCDB (DC Distribution Box)": "DCDB",
};
const noAttributes = (...names: string[]): CatalogItem[] => names.map(name => ({ name, fields: [], codePrefix: sequencePrefixes[name] }));

const SOURCE_CATALOG: CatalogCategory[] = [
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
            { name: "ICC", codeTemplate: "ICC/{diameter}/{material}/{coating}", fields: [field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("material", "Material", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
            { name: "IPP", codeTemplate: "IPP/{numberOfHoles}H/{diameter}/{material}/{coating}", fields: [field("numberOfHoles", "Number of Holes", "select", { required: true, options: options("1", "2", "3", "4", "5", "6") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("material", "Material", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
            { name: "Vent Plug", codeTemplate: "VENT/{diameter}/{type}", fields: [field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Flip-Flop", codeToken: "FF" }, { value: "Vented", codeToken: "VENT" }] })] },
            { name: "Electrolyte", codeTemplate: "ELY/{typeMaterial}", fields: [field("typeMaterial", "Type/Material", "select", { required: true, listColumn: "type", options: [{ value: "H2SO4 (Sulphuric Acid)", codeToken: "H2SO4" }, { value: "KOH (Potassium Hydroxide)", codeToken: "KOH" }, { value: "DM Water", codeToken: "DMW" }] })] },
            { name: "Shrouds", codeTemplate: "SHR/{type}/{numberOfPoles}P", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Linear" }, { value: "Horizontal", codeToken: "HOR" }] }), field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true })] },
            { name: "Cell Lifter", codeTemplate: "CL/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Normal", codeToken: "NORM" }, { value: "Insulated", codeToken: "INS" }] })] },
            { name: "Battery Stand", codeTemplate: "BST/{material}/{configuration}", fields: [field("material", "Material", "select", { required: true, options: options("MS", "FR") }), field("configuration", "Configuration", "select", { required: true, options: options("Step", "Tier") }), field("colourCode", "Colour Code", "text")] },
            { name: "Battery Terminal Box", codeTemplate: "TB/{numberOfPoles}P/{lugSize}", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), field("lugSize", "Lug Size", "select", { required: true, options: options("M10", "M20") })] },
        ],
    },
    {
        name: "Testing and Measuring Instruments",
        items: [
            { name: "Multimeter", codeTemplate: "MM/{measurementType}/{voltageRange}V/{currentRange}A", fields: [field("measurementType", "Measurement Type", "select", { required: true, listColumn: "type", options: [{ value: "AC" }, { value: "DC" }, { value: "AC-DC", codeToken: "ACDC" }] }), field("voltageRange", "Voltage Range", "number", { required: true, min: 1, max: 2000, suffix: "V" }), field("currentRange", "Current Range", "number", { required: true, min: 1, max: 2000, suffix: "A" })] },
            { name: "Clamp Meter", codeTemplate: "CM/{measurementType}/{voltageRange}V/{currentRange}A", fields: [field("measurementType", "Measurement Type", "select", { required: true, listColumn: "type", options: [{ value: "AC" }, { value: "DC" }, { value: "AC-DC", codeToken: "ACDC" }] }), field("voltageRange", "Voltage Range", "number", { required: true, min: 1, max: 2000, suffix: "V" }), field("currentRange", "Current Range", "number", { required: true, min: 1, max: 2000, suffix: "A" })] },
            { name: "Torque Wrench", codePrefix: "TW", fields: [field("torqueRange", "Torque Range (Nm)", "text", { required: true, suffix: "Nm" })] },
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
            { name: "PP Sheet", fields: [], codePrefix: "PPS", defaultUnit: "Sq. Mtr." },
            { name: "Washer", codeTemplate: "WSR/{type}/{material}/{diameter}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: options("Plain", "Spring", "Belleville") }), field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") })] },
            { name: "Bolt", codeTemplate: "BLT/{material}/{diameter}/{length}MM", fields: [field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") }), field("length", "Length", "number", { required: true, min: 0, minExclusive: true, suffix: "mm" })] },
            { name: "Nut", codeTemplate: "NUT/{material}/{diameter}", fields: [field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "Diameter", "select", { required: true, options: options("M10", "M20") })] },
        ],
    },
    {
        name: "Battery Chargers",
        items: [{ name: "Battery Charger", codeTemplate: "BC/{chargerType}/{technology}/{regulationType}/{voltage}V/{current}A/{pulse}P/{moduleType}", fields: [
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
        items: [{ name: "UPS", codeTemplate: "UPS/{topology}/{outputPowerFactor}/{phaseConfiguration}/{efficiency}/{redundancy}/{monitoring}/{zeroTransferTime}", fields: [
            field("topology", "Topology/Type", "select", { required: true, listColumn: "type", options: [
                { value: "Offline", codeToken: "OFF", helper: "Switches to battery operation during power failure." },
                { value: "Line-Interactive", codeToken: "LI", helper: "AVR + Battery Backup." },
                { value: "Online (Double Conversion)", codeToken: "ODC", helper: "AC to DC to AC." },
                { value: "Delta Conversion", codeToken: "DELTA", helper: "Online UPS with Delta Conversion Technology." },
                { value: "Modular", codeToken: "MOD", helper: "Rack-based power modules with hot-swappable modules, N+1 redundancy and scalability." },
            ] }),
            field("zeroTransferTime", "Zero Transfer Time", "select", { showWhen: { field: "topology", value: "Online (Double Conversion)" }, options: options("Yes", "No") }),
            field("outputPowerFactor", "Output Power Factor", "select", { required: true, options: options("0.8", "0.9", "1.0") }),
            field("phaseConfiguration", "Phase Configuration", "select", { required: true, options: [{ value: "1/1", codeToken: "1X1" }, { value: "3/1", codeToken: "3X1" }, { value: "3/3", codeToken: "3X3" }] }),
            field("redundancy", "Redundancy", "select", { options: options("None", "N+1") }),
            field("efficiency", "Efficiency", "select", { required: true, options: [{ value: "90%", codeToken: "90PCT" }, { value: "95%", codeToken: "95PCT" }, { value: "Eco Mode", codeToken: "ECO" }] }),
            field("monitoring", "Monitoring", "select", { options: [{ value: "None" }, { value: "SNMP Card", codeToken: "SNMP" }] }),
        ] }],
    },
    {
        name: "Solar Power and Distribution Equipment",
        items: noAttributes("SPV (Solar Photovoltaic)", "PCU (Power Conditioning Unit)", "Structure", "ACDB (AC Distribution Box)", "DCDB (DC Distribution Box)"),
    },
    {
        name: "AC Accessories",
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

const SUBCATEGORY_BY_ITEM: Record<string, string> = {
    "Ni-Cd Battery": "Ni-Cd Battery", "VRLA Battery": "VRLA Battery", "Flooded Lead-Acid Battery": "Flooded Lead-Acid (FLA) Battery",
    ICC: "Battery Connectors & Interconnection Accessories", IPP: "Battery Connectors & Interconnection Accessories", Shrouds: "Battery Connectors & Interconnection Accessories", "Battery Terminal Box": "Battery Connectors & Interconnection Accessories",
    "Vent Plug": "Battery Ventilation & Electrolyte Accessories", Electrolyte: "Battery Ventilation & Electrolyte Accessories",
    "Battery Stand": "Battery Stands & Handling Accessories", "Cell Lifter": "Battery Stands & Handling Accessories", "Stand Insulator": "Battery Stands & Handling Accessories",
    "Eye Wash Bottle": "Battery Safety & Emergency Accessories", "Eye Wash Station": "Battery Safety & Emergency Accessories", "Safety Goggles": "Battery Safety & Emergency Accessories", "Safety Gloves": "Battery Safety & Emergency Accessories", "Safety Apron": "Battery Safety & Emergency Accessories", "Rubber Boots": "Battery Safety & Emergency Accessories",
    "Boric Acid": "Battery Maintenance & General Accessories", "Petroleum Jelly": "Battery Maintenance & General Accessories", "Strout Bristles": "Battery Maintenance & General Accessories", "PP Sheet": "Battery Maintenance & General Accessories",
    Multimeter: "Electrical Measuring Instruments", "Clamp Meter": "Electrical Measuring Instruments", "Earth Fault Locator": "Electrical Measuring Instruments", "Impedance Tester": "Electrical Measuring Instruments",
    "Torque Wrench": "Mechanical & Torque Measuring Instruments", Thermometer: "Temperature Measuring Instruments", "Thermometer Stand": "Temperature Measuring Instruments", "Temperature Gun": "Temperature Measuring Instruments", Hydrometer: "Battery Testing Instruments", "Hydrometer Stand": "Battery Testing Instruments",
    Washer: "Washers", Bolt: "Bolts", Nut: "Nuts", "Battery Charger": "Battery Charger", UPS: "UPS",
    "SPV (Solar Photovoltaic)": "Solar Photovoltaic (SPV)", "PCU (Power Conditioning Unit)": "Power Conditioning Unit (PCU)", Structure: "Solar Structure", "ACDB (AC Distribution Box)": "ACDB (AC Distribution Box)", "DCDB (DC Distribution Box)": "DCDB (DC Distribution Box)",
};
const MAIN_BY_SUBCATEGORY: Record<string, string> = Object.fromEntries([
    ...["Ni-Cd Battery", "VRLA Battery", "Flooded Lead-Acid (FLA) Battery"].map(name => [name, "Batteries"]),
    ...["Battery Connectors & Interconnection Accessories", "Battery Ventilation & Electrolyte Accessories", "Battery Stands & Handling Accessories", "Battery Safety & Emergency Accessories", "Battery Maintenance & General Accessories"].map(name => [name, "Battery Accessories"]),
    ...["Electrical Measuring Instruments", "Mechanical & Torque Measuring Instruments", "Temperature Measuring Instruments", "Battery Testing Instruments"].map(name => [name, "Testing & Measuring Instruments"]),
    ...["Washers", "Bolts", "Nuts"].map(name => [name, "Hardware & Fasteners"]), ["Battery Charger", "Battery Chargers"], ["UPS", "UPS"],
    ...["Solar Photovoltaic (SPV)", "Power Conditioning Unit (PCU)", "Solar Structure", "ACDB (AC Distribution Box)", "DCDB (DC Distribution Box)"].map(name => [name, "Solar Power & Distribution Equipment"]),
]);
const itemOverrides: Record<string, Partial<CatalogItem>> = {
    "Ni-Cd Battery": { codeTemplate: "NICD/{type}{discharge}/{capacity}AH" }, ICC: { codeTemplate: "ICC/{diameter}/{insulation}/{coating}", fields: [field("diameter", "M Rating (Hole Diameter)", "select", { required: true, options: options("M10", "M20") }), field("insulation", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
    "Battery Terminal Box": { codeTemplate: "BTERMINAL/{numberOfPoles}/{lugSize}" }, "Vent Plug": { codeTemplate: "VENT/{diameter}/{type}" },
    Electrolyte: { codeTemplate: "ELECTROLYTE/{typeMaterial}", defaultUnit: "Litre" }, "Cell Lifter": { codeTemplate: "CELL-LIFTER/{type}" },
    Multimeter: { codeTemplate: "MULTIMETER/{measurementType}/{voltageRange}V/{currentRange}A" }, "Clamp Meter": { codeTemplate: "CLAMPMETER/{measurementType}/{voltageRange}V/{currentRange}A" },
    "Torque Wrench": { codeTemplate: "TORQUE-WRENCH/{torqueRange}NM", fields: [field("torqueRange", "Torque Range (Nm)", "text", { required: true })] }, Thermometer: { codeTemplate: "THERMOMETER", fields: [field("temperatureRange", "Temperature Range", "text")] }, "Thermometer Stand": { codeTemplate: "THERMOMETER-STAND", fields: [field("specification", "Specification", "text")] }, "Temperature Gun": { codeTemplate: "TEMPERATURE-GUN", fields: [field("temperatureRange", "Temperature Range", "text")] },
    Washer: { codeTemplate: "WASHER/{type}/{material}/{diameter}", fields: [field("type", "Type", "select", { required: true, options: [{ value: "Plain", codeToken: "P" }, { value: "Spring", codeToken: "S" }, { value: "Belleville", codeToken: "B" }] }), field("material", "Material", "select", { required: true, options: options("SS", "GI") }), field("diameter", "M Rating", "select", { required: true, options: options("M10", "M20") })] }, Bolt: { codeTemplate: "BOLT/{material}/{diameter}/{length}MM" }, Nut: { codeTemplate: "NUT/{material}/{diameter}" },
    "Battery Stand": { codeTemplate: "BATTERY-STAND/{material}/{steps}/{tiers}/{colourCode}", fields: [field("material", "Material", "select", { required: true, options: options("MS", "FR") }), field("steps", "Number of Steps", "number", { min: 0, max: 99, integer: true }), field("tiers", "Number of Tiers", "number", { min: 0, max: 99, integer: true }), field("colourCode", "Colour Code", "text")] },
    IPP: { codeTemplate: "IPP/P{numberOfHoles}/{diameter}/{material}/{coating}", fields: [field("numberOfHoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), field("diameter", "M Rating", "select", { required: true, options: options("M10", "M20") }), field("material", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "INS" }, { value: "Non-Insulated", codeToken: "NINS" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NI" }, { value: "Tin-Coated", codeToken: "TIN" }] })] },
    Shrouds: { codeTemplate: "SHROUDS/{type}/P{numberOfPoles}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Linear", codeToken: "L" }, { value: "Horizontal", codeToken: "H" }] }), field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true })] },
    "Cell Lifter": { codeTemplate: "CELL-LIFTER/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Non-Insulated", codeToken: "NINS" }, { value: "Insulated", codeToken: "INS" }] })] },
    "Earth Fault Locator": { fields: [field("measurementRange", "Measurement / Detection Range", "text")] }, "Impedance Tester": { fields: [field("measurementRange", "Measurement Range", "text")] },
    "Hydrometer": { fields: [field("measurementRange", "Measurement Range", "text")] }, "Hydrometer Stand": { fields: [field("specification", "Specification", "text")] },
    "Stand Insulator": { fields: [field("specification", "Specification", "text")] }, "Eye Wash Bottle": { fields: [field("capacity", "Capacity", "text")] }, "Eye Wash Station": { fields: [field("configuration", "Type / Configuration", "text")] },
    "Safety Goggles": { fields: [field("type", "Type", "text")] }, "Safety Gloves": { fields: [field("materialType", "Material / Type", "text"), field("size", "Size", "text")], defaultUnit: "Pair" }, "Safety Apron": { fields: [field("material", "Material", "text"), field("size", "Size", "text")] }, "Rubber Boots": { fields: [field("size", "Size", "text")], defaultUnit: "Pair" },
    "Boric Acid": { fields: [field("gradePurity", "Grade / Purity", "text")], defaultUnit: "Kg" }, "Petroleum Jelly": { fields: [field("grade", "Grade", "text")], defaultUnit: "Kg" }, "Strout Bristles": { fields: [field("specification", "Specification", "text")] }, "PP Sheet": { fields: [field("thickness", "Thickness", "text"), field("dimensions", "Dimensions", "text")], defaultUnit: "Sq. Mtr." },
    "SPV (Solar Photovoltaic)": { codeTemplate: "SPV/{type}/{manufacturing}/{wattage}WP", fields: [field("type", "Type", "select", { required: true, options: [{ value: "N-Topcon (NT)", codeToken: "NT" }, { value: "Mono PERC (MP)", codeToken: "MP" }] }), field("manufacturing", "Manufacturing", "select", { required: true, options: [{ value: "DCR", codeToken: "D" }, { value: "Non-DCR", codeToken: "ND" }, { value: "Imported", codeToken: "I" }] }), field("wattage", "Wattage", "number", { required: true, min: 0, minExclusive: true, suffix: "Wp" })] },
    "PCU (Power Conditioning Unit)": { fields: [field("technology", "Type / Technology", "text"), field("capacity", "Capacity", "text"), field("voltage", "Voltage", "text")] },
    Structure: { fields: [field("material", "Material", "text"), field("mountingType", "Mounting Type", "text"), field("structureType", "Structure Type", "text"), field("dimensions", "Dimensions", "text")], defaultUnit: "Set" },
    "ACDB (AC Distribution Box)": { fields: [field("phase", "Phase Configuration", "text"), field("currentRating", "Current Rating", "text"), field("ways", "Number of Ways", "text"), field("voltageRating", "Voltage Rating", "text")] },
    "DCDB (DC Distribution Box)": { fields: [field("voltageRating", "Voltage Rating", "text"), field("currentRating", "Current Rating", "text"), field("ways", "Number of Ways", "text")] },
    "Battery Charger": { codeTemplate: "{chargerType}/{technology}/{regulationType}/{voltage}V/{current}A/{pulse}P/{moduleType}", fields: [field("chargerType", "Charger Type", "select", { required: true, listColumn: "type", options: options("FCBC", "FC", "BC", "GC") }), field("technology", "Technology", "select", { required: true, options: options("SCR", "IGBT", "SMPS") }), field("regulationType", "Regulation Type", "select", { required: true, options: options("CC", "CV") }), field("voltage", "Voltage", "select", { required: true, suffix: "V", options: options("24", "30", "48", "96", "110", "220", "440") }), field("current", "Current", "number", { required: true, min: 0, minExclusive: true, suffix: "A" }), field("pulse", "Pulse", "select", { required: true, showWhen: { field: "technology", value: "IGBT" }, options: options("6", "12") }), field("moduleType", "Module Type", "select", { required: true, showWhen: { field: "technology", value: "SMPS" }, options: [{ value: "Non-Modular", codeToken: "NM" }, { value: "Modular", codeToken: "MOD" }, { value: "Hot-Swappable", codeToken: "HS" }] })] },
    UPS: { pending: true, fields: [field("topology", "Topology / Type", "select", { required: true, options: [{ value: "Offline", helper: "Switches to battery operation during power failure." }, { value: "Line-Interactive", helper: "AVR + Battery Backup." }, { value: "Online (Double Conversion)", helper: "AC to DC to AC." }, { value: "Delta Conversion", helper: "Online UPS with Delta Conversion Technology." }, { value: "Modular", helper: "Rack-based power modules with hot-swappable modules, N+1 redundancy and scalability." }] }), field("zeroTransferTime", "Zero Transfer Time", "select", { showWhen: { field: "topology", value: "Online (Double Conversion)" }, options: options("Yes", "No") }), field("outputPowerFactor", "Output Power Factor", "select", { required: true, options: options("0.8", "0.9", "1.0") }), field("phase", "Phase Configuration", "select", { required: true, options: options("1/1", "3/1", "3/3") }), field("efficiency", "Efficiency", "select", { required: true, options: options("90%", "95%") }), field("operatingMode", "Operating Mode", "select", { options: options("Normal", "Eco Mode") }), field("monitoring", "Monitoring", "select", { options: options("SNMP Card") }), field("capacity", "Capacity", "text", { suffix: "kVA" })] },
};
const flattened = SOURCE_CATALOG.flatMap(category => category.items.map(item => ({ ...item, ...itemOverrides[item.name], codePrefix: itemOverrides[item.name]?.codeTemplate ? undefined : item.codePrefix, subcategory: category.name === "AC Accessories" ? undefined : SUBCATEGORY_BY_ITEM[item.name] || category.name })));
const mainGroups = [...new Set(flattened.map(item => item.subcategory ? MAIN_BY_SUBCATEGORY[item.subcategory] : "AC Accessories"))];
export const ITEM_CATALOG: CatalogCategory[] = mainGroups.map(name => ({ name, items: flattened.filter(item => (item.subcategory ? MAIN_BY_SUBCATEGORY[item.subcategory] : "AC Accessories") === name) }));

export const UNIT_OPTIONS = ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr.", "Litre", "Pair", "Set"] as const;
export const DEFAULT_UNIT = "Nos.";
export const findCatalogItem = (categoryName: string, itemName: string) =>
    ITEM_CATALOG.find(category => category.name === categoryName)?.items.find(item => item.name === itemName);
export const findCatalogSubcategory = (categoryName: string, itemName: string) => findCatalogItem(categoryName, itemName)?.subcategory;
const displayNameAliases: Record<string, string> = { "Solar Photovoltaic": "SPV (Solar Photovoltaic)", "Power Conditioning Unit": "PCU (Power Conditioning Unit)", "ACDB": "ACDB (AC Distribution Box)", "DCDB": "DCDB (DC Distribution Box)", "Flooded Lead-Acid (FLA) Battery": "Flooded Lead-Acid Battery" };
export const resolveCatalogItemByName = (itemName: string) => {
    const resolvedName = displayNameAliases[itemName] || itemName;
    return ITEM_CATALOG.flatMap(category => category.items).find(item => item.name === resolvedName);
};
export const getItemMainCategory = (itemName: string, _fallback?: string | null) => {
    const item = resolveCatalogItemByName(itemName);
    return item ? ITEM_CATALOG.find(category => category.items.includes(item))?.name || "AC Accessories" : "AC Accessories";
};
export const getItemSubcategory = (itemName: string) => resolveCatalogItemByName(itemName)?.subcategory;
export const categoryForItem = (itemName: string) => ITEM_CATALOG.find(category => category.items.some(item => item.name === itemName));
export const fieldIsVisible = (specifications: Record<string, string>, itemField: CatalogField) =>
    !itemField.showWhen || specifications[itemField.showWhen.field] === itemField.showWhen.value;
