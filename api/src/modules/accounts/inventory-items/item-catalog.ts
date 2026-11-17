export type CatalogOption = { value: string; codeToken?: string; helper?: string };
export type CatalogField = {
    key: string; label: string; kind: "select" | "number" | "text"; required?: boolean;
    options?: CatalogOption[]; min?: number; minExclusive?: boolean; max?: number; integer?: boolean;
    suffix?: string; showWhen?: { field: string; value: string }; listColumn?: "type";
    hideWhen?: { field: string; value: string }[];
    showWhenAll?: { field: string; value: string }[];
    showWhenAny?: { field: string; value: string }[];
};
export type CatalogItem = {
    name: string; pending?: boolean; hsnNotApplicable?: boolean; fields: CatalogField[];
    codeTemplate?: string; defaultUnit?: string; legacyTypes?: string[];
    unitOptions?: readonly string[];
    unitOptionsByField?: Record<string, Record<string, readonly string[]>>;
    defaultUnitByField?: Record<string, Record<string, string>>;
    conversionPairs?: { from: string; to: string }[];
    conversionPairsByField?: Record<string, Record<string, { from: string; to: string }[]>>;
};
export type CatalogCategory = { name: string; items: CatalogItem[] };

const options = (...values: string[]): CatalogOption[] => values.map(value => ({ value }));
const field = (key: string, label: string, kind: CatalogField["kind"], extra: Partial<CatalogField> = {}): CatalogField => ({ key, label, kind, ...extra });
const select = (key: string, label: string, values: string[], extra: Partial<CatalogField> = {}) => field(key, label, "select", { required: true, options: options(...values), ...extra });
const noCode = (name: string, extra: Partial<CatalogItem> = {}): CatalogItem => ({ name, fields: [], ...extra });
const aliases: Record<string, string> = { "Solar Photovoltaic": "SPV (Solar Photovoltaic)", "Power Conditioning Unit": "PCU (Power Conditioning Unit)", ACDB: "ACDB (AC Distribution Box)", DCDB: "DCDB (DC Distribution Box)", "Flooded Lead-Acid Battery": "Flooded Lead-Acid (FLA) Battery", "Strout Bristles": "Shroud Bristles", "Safety Goggles": "Goggles", "Safety Gloves": "Gloves", "Safety Apron": "Apron", "Safety Shoes": "Shoes" };
const resolvedItemName = (name: string) => aliases[name] || name;

export const DC_ITEM_CATALOG: CatalogCategory[] = [
    { name: "Batteries", items: [
        { name: "Ni-Cd Battery", codeTemplate: "NICD/{type}{discharge}/{capacity}", fields: [select("type", "Type", ["KP", "RGS", "RGP"], { listColumn: "type" }), select("discharge", "Discharge", ["L", "M", "H"]), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
        { name: "VRLA Battery", codeTemplate: "VRLA/{type}/{voltage}/{capacity}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "AGM" }, { value: "SMF" }, { value: "TGel", codeToken: "TGEL" }] }), select("voltage", "Voltage", ["2V", "12V"]), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
        { name: "Flooded Lead-Acid (FLA) Battery", codeTemplate: "FLA/{type}/{capacity}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "LMLA" }, { value: "OPzS", codeToken: "OPZS" }, { value: "Plante", codeToken: "PLANTE" }] }), field("capacity", "Capacity", "number", { required: true, min: 0, minExclusive: true, suffix: "Ah" })] },
    ] },
    { name: "Battery Accessories", items: [
        { name: "ICC", codeTemplate: "ICC/{insulation}/{mRating}/{coating}", fields: [select("mRating", "M Rating (Hole Diameter)", ["M10", "M20"]), field("insulation", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NC" }, { value: "Tin-Coated", codeToken: "TC" }] })] },
        { name: "IPP", codeTemplate: "IPP/P{numberOfPoles}/{mRating}/{insulation}/{coating}", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), select("mRating", "M Rating", ["M10", "M20"]), field("insulation", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("coating", "Coating", "select", { required: true, options: [{ value: "Nickel-Coated", codeToken: "NC" }, { value: "Tin-Coated", codeToken: "TC" }] })] },
        { name: "Vent Plug", codeTemplate: "Vent/{type}/{mRating}", fields: [select("mRating", "M Rating", ["M10", "M20"]), field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Flip-Flop", codeToken: "FF" }, { value: "Vented", codeToken: "V" }] })] },
        { name: "Electrolyte", codeTemplate: "Electrolyte/{type}", defaultUnit: "Litre", unitOptions: ["Litre"], conversionPairs: [{ from: "Litre", to: "Can" }], fields: [field("type", "Type / Material", "select", { required: true, listColumn: "type", options: [{ value: "H2SO4", codeToken: "H2SO4" }, { value: "KOH", codeToken: "KOH" }, { value: "DM Water", codeToken: "DM" }] })] },
        { name: "Shrouds", codeTemplate: "Shrouds/{type}/{numberOfPoles}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Linear", codeToken: "L" }, { value: "Horizontal", codeToken: "H" }] }), field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true, showWhen: { field: "type", value: "Linear" } })] },
        { name: "Cell Lifter", codeTemplate: "CellLifter/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Non-Insulated", codeToken: "NI" }, { value: "Insulated", codeToken: "I" }] })] },
        { name: "Battery Stand", codeTemplate: "BStand/{material}/S{steps}/T{tiers}/{colourCode}", fields: [select("material", "Material", ["MS", "FR"]), field("steps", "Number of Steps", "number", { required: true, min: 1, integer: true }), field("tiers", "Number of Tiers", "number", { required: true, min: 1, integer: true }), field("colourCode", "Colour Code", "text", { required: true })] },
        { name: "Battery Terminal Box", codeTemplate: "BTerminal/P{numberOfPoles}/{mRating}", fields: [field("numberOfPoles", "Number of Poles", "number", { required: true, min: 1, max: 6, integer: true }), select("mRating", "M Rating (Lug Hole Diameter)", ["M10", "M20"])] },
        noCode("Eye Wash Bottle", { codeTemplate: "EyeWashBottle", hsnNotApplicable: true }), noCode("Eye Wash Station", { codeTemplate: "EyeWashStation", hsnNotApplicable: true }), noCode("Goggles", { codeTemplate: "Goggles", hsnNotApplicable: true }),
        noCode("Gloves", { codeTemplate: "Gloves", defaultUnit: "Pair" }), noCode("Apron", { codeTemplate: "Apron" }), noCode("Shoes", { codeTemplate: "Shoes", hsnNotApplicable: true, defaultUnit: "Pair" }), noCode("Rubber Boots", { codeTemplate: "RubberBoots", hsnNotApplicable: true, defaultUnit: "Pair" }),
        noCode("Boric Acid", { codeTemplate: "BoricAcid", hsnNotApplicable: true, defaultUnit: "Kg" }), noCode("Petroleum Jelly", { codeTemplate: "PJelly", hsnNotApplicable: true, defaultUnit: "Kg" }), noCode("Shroud Bristles", { codeTemplate: "ShroudBristles", hsnNotApplicable: true }),
        { name: "PP Sheet", codeTemplate: "PPSheet/{thickness}/{dimensions}", defaultUnit: "Sq. Mtr.", fields: [field("thickness", "Thickness", "text", { required: true }), field("dimensions", "Dimensions", "text", { required: true })] },
    ] },
    { name: "Testing & Measuring Instruments", items: [
        ...["Multimeter", "Clamp Meter"].map((name): CatalogItem => ({ name, codeTemplate: `${name === "Multimeter" ? "MultiM" : "ClampM"}/{measurementType}/{voltageRange}/{currentRange}`, fields: [select("measurementType", "Measurement Type", ["AC", "DC", "AC-DC"], { listColumn: "type" }), field("voltageRange", "Voltage Range (V)", "number", { required: true, min: 1, max: 2000, integer: true }), field("currentRange", "Current Range (A)", "number", { required: true, min: 1, max: 2000, integer: true })] })),
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
    { name: "Battery Chargers", items: [{ name: "Battery Charger", codeTemplate: "{chargerType}/{technology}/{regulationType}/{voltage}V/{current}A/{pulse}/{moduleType}", fields: [select("chargerType", "Charger Type", ["FCBC", "FC", "BC", "GC"], { listColumn: "type" }), select("technology", "Technology", ["SCR", "IGBT", "SMPS"]), select("regulationType", "Regulation Type", ["CC", "CV"]), select("voltage", "Voltage (V)", ["24", "30", "48", "96", "110", "220", "440"]), field("current", "Current (A)", "number", { required: true, min: 0, minExclusive: true }), field("pulse", "Pulse", "select", { required: true, showWhen: { field: "technology", value: "IGBT" }, options: options("6", "12") }), field("moduleType", "Module Type", "select", { required: true, showWhen: { field: "technology", value: "SMPS" }, options: [{ value: "Non-Modular", codeToken: "NM" }, { value: "Modular", codeToken: "M" }, { value: "Hot-Swappable", codeToken: "HS" }] })] }] },
    { name: "UPS", items: [{ name: "UPS", pending: true, fields: [field("topology", "Topology / Type", "select", { options: [
        { value: "Offline", helper: "Switches to battery operation during power failure." },
        { value: "Line-Interactive", helper: "AVR + Battery Backup." },
        { value: "Online (Double Conversion)", helper: "AC to DC to AC." },
        { value: "Delta Conversion", helper: "Online UPS with Delta Conversion Technology." },
        { value: "Modular", helper: "Rack-based power modules with hot-swappable modules, N+1 redundancy and scalability." },
    ] }), field("zeroTransferTime", "Zero Transfer Time", "select", { showWhen: { field: "topology", value: "Online (Double Conversion)" }, options: options("Yes", "No") }), select("outputPowerFactor", "Output Power Factor", ["0.8", "0.9", "1.0"]), select("phaseConfiguration", "Phase Configuration", ["1/1", "3/1", "3/3"]), select("efficiency", "Efficiency", ["90%", "95%", "Eco Mode"]), field("monitoring", "Monitoring", "select", { options: options("SNMP Card") })] }] },
    { name: "Solar Power", items: [
        { name: "SPV (Solar Photovoltaic)", codeTemplate: "SPV/{type}/{manufacturing}/{wattage}", fields: [field("type", "Type", "select", { required: true, options: [{ value: "N-Topcon (NT)", codeToken: "NT" }, { value: "Mono Perc (MP)", codeToken: "MP" }] }), field("manufacturing", "Manufacturing", "select", { required: true, options: [{ value: "DCR", codeToken: "D" }, { value: "Non-DCR", codeToken: "ND" }, { value: "Imported", codeToken: "I" }] }), field("wattage", "Wattage (Wp)", "number", { required: true, min: 0, minExclusive: true })] },
        noCode("MC4 Connector (in Pairs)", { codeTemplate: "MC4", defaultUnit: "Pairs", unitOptions: ["Pairs", "Pair"] }), noCode("Earthing Insulator", { codeTemplate: "EarthingInsulator" }), noCode("PCU (Power Conditioning Unit)", { pending: true }), noCode("Structure", { pending: true }), noCode("ACDB (AC Distribution Box)", { pending: true }), noCode("DCDB (DC Distribution Box)", { pending: true }),
    ] },
    { name: "Cables", items: [{ name: "Cable", codeTemplate: "Cable/{currentType}/{voltage}/{material}/{armouring}/{fireRating}/{cores}/{thickness}", fields: [select("currentType", "Current Type", ["AC", "DC"]), field("voltage", "Voltage", "select", { required: true, options: [{ value: "LT" }, { value: "11 KV HT", codeToken: "11HT" }, { value: "33 KV HT", codeToken: "33HT" }] }), field("material", "Material", "select", { required: true, options: [{ value: "Copper", codeToken: "Cu" }, { value: "Aluminium", codeToken: "Al" }, { value: "Galvanized Iron", codeToken: "GI" }] }), field("armouring", "Armouring", "select", { required: true, options: [{ value: "Non Shielded", codeToken: "NS" }, { value: "Shielded", codeToken: "S" }, { value: "Armoured", codeToken: "A" }, { value: "Unarmoured", codeToken: "UA" }] }), field("fireRating", "Fire Rating", "select", { required: true, options: options("NFRLS", "FRLS", "FRLSH", "LSZH") }), field("cores", "Number of Cores", "select", { required: true, options: options("1", "2", "3", "3.5", "4", "5", "6", "8", "10", "12") }), field("thickness", "Cable Thickness (sq. mm.)", "select", { required: true, options: options("0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16", "25", "35", "50", "70", "95", "120", "150", "185", "240", "300", "400") })] }] },
    { name: "Lugs", items: [{ name: "Lug", codeTemplate: "Lug/{type}/{insulation}/{material}/{cableSize}/{studHole}", fields: [field("type", "Type", "select", { required: true, options: options("Ring", "Pin", "Reducer", "Palm", "Hex Snap", "Fork") }), field("insulation", "Insulation", "select", { required: true, options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("material", "Material", "select", { required: true, options: [{ value: "Copper", codeToken: "Cu" }, { value: "Aluminium", codeToken: "Al" }, { value: "Bimetallic", codeToken: "BM" }] }), field("cableSize", "Cable Size (mm)", "number", { required: true, min: 0, minExclusive: true }), field("studHole", "Stud Hole (mm)", "number", { required: true, min: 0, minExclusive: true, hideWhen: ["Pin", "Reducer", "Hex Snap"].map(value => ({ field: "type", value })) })] }] },
        { name: "Glands", items: [noCode("Gland", { pending: true })] },
    { name: "Ferrules", items: [{ name: "Ferrule", codeTemplate: "Ferrule/{type}", fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Alphabet", codeToken: "A" }, { value: "Numeric", codeToken: "N" }] })] }] },
];

const fittingTypes: CatalogOption[] = [
    { value: "Pipe", codeToken: "Pipe" }, { value: "Elbow", codeToken: "Elbow" }, { value: "Socket", codeToken: "Socket" },
    { value: "Reducer", codeToken: "Reducer" }, { value: "U-Bend", codeToken: "U-Bend" }, { value: "Tee", codeToken: "Tee" },
];
const strengthOptions: CatalogOption[] = [{ value: "Hard", codeToken: "H" }, { value: "Soft", codeToken: "S" }];
const acPipe = (name: string, prefix: string, thicknessLabel: string, unitOptionsByType: Record<string, readonly string[]>, defaultUnitByType: Record<string, string>, conversionPairsByType: Record<string, { from: string; to: string }[]>): CatalogItem => ({
    name, codeTemplate: `${prefix}/{type}/{strength}/{thickness}/{diameter}`,
    fields: [
        field("type", "Type", "select", { required: true, listColumn: "type", options: fittingTypes }),
        field("diameter", "Diameter (mm)", "number", { required: true, min: 0, minExclusive: true }),
        field("thickness", thicknessLabel, "number", { required: true, min: 0, minExclusive: true }),
        field("strength", "Strength", "select", { required: true, options: strengthOptions }),
    ],
    unitOptionsByField: { type: unitOptionsByType }, defaultUnitByField: { type: defaultUnitByType },
    conversionPairsByField: { type: conversionPairsByType },
});

export const AC_ITEM_CATALOG: CatalogCategory[] = [{ name: "AC Accessories", items: [
    acPipe("Copper", "CU", "Thickness (Gauge)",
        { Pipe: ["Kgs.", "Kg", "Mtr", "Ft"], Elbow: ["Nos."], Socket: ["Nos."], Reducer: ["Nos."], "U-Bend": ["Nos."], Tee: ["Nos."] },
        { Pipe: "Kgs.", Elbow: "Nos.", Socket: "Nos.", Reducer: "Nos.", "U-Bend": "Nos.", Tee: "Nos." },
        { Pipe: [{ from: "Kgs.", to: "Mtr" }, { from: "Kgs.", to: "Ft" }, { from: "Kg", to: "Mtr" }, { from: "Kg", to: "Ft" }], Elbow: [], Socket: [], Reducer: [], "U-Bend": [], Tee: [] }),
    acPipe("PVC Pipe", "PVC", "Thickness (kg/psi)",
        { Pipe: ["Mtr", "Ft", "Length (3M)", "Length (6M)"], Elbow: ["Nos.", "Mtr", "Ft", "Length (3M)", "Length (6M)"], Socket: ["Nos.", "Mtr", "Ft", "Length (3M)", "Length (6M)"], Reducer: ["Nos.", "Mtr", "Ft", "Length (3M)", "Length (6M)"], "U-Bend": ["Nos.", "Mtr", "Ft", "Length (3M)", "Length (6M)"], Tee: ["Nos.", "Mtr", "Ft", "Length (3M)", "Length (6M)"] },
        { Pipe: "Mtr", Elbow: "Nos.", Socket: "Nos.", Reducer: "Nos.", "U-Bend": "Nos.", Tee: "Nos." },
        Object.fromEntries(["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"].map(type => [type, [{ from: "Mtr", to: "Ft" }, { from: "Length (3M)", to: "Mtr" }, { from: "Length (6M)", to: "Mtr" }]]))),
    acPipe("UPVC Pipe", "UPVC", "Thickness (kg/psi)",
        { Pipe: ["Mtr", "Ft", "Length (3M)", "Length (6M)"], Elbow: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Socket: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Reducer: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], "U-Bend": ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Tee: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"] },
        { Pipe: "Mtr", Elbow: "Nos.", Socket: "Nos.", Reducer: "Nos.", "U-Bend": "Nos.", Tee: "Nos." },
        Object.fromEntries(["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"].map(type => [type, [{ from: "Mtr", to: "Ft" }, { from: "Length (3M)", to: "Mtr" }, { from: "Length (6M)", to: "Mtr" }]]))),
    acPipe("CPVC Pipe", "CPVC", "Thickness (SDR)",
        { Pipe: ["Mtr", "Ft", "Length (3M)", "Length (6M)"], Elbow: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Socket: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Reducer: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], "U-Bend": ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Tee: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"] },
        { Pipe: "Mtr", Elbow: "Nos.", Socket: "Nos.", Reducer: "Nos.", "U-Bend": "Nos.", Tee: "Nos." },
        Object.fromEntries(["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"].map(type => [type, [{ from: "Mtr", to: "Ft" }, { from: "Length (3M)", to: "Mtr" }, { from: "Length (6M)", to: "Mtr" }]]))),
    acPipe("MS", "MS", "Thickness (SDR)",
        { Pipe: ["Mtr", "Ft", "Length (3M)", "Length (6M)"], Elbow: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Socket: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Reducer: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], "U-Bend": ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"], Tee: ["Mtr", "Ft", "Nos.", "Length (3M)", "Length (6M)"] },
        { Pipe: "Mtr", Elbow: "Nos.", Socket: "Nos.", Reducer: "Nos.", "U-Bend": "Nos.", Tee: "Nos." },
        Object.fromEntries(["Pipe", "Elbow", "Socket", "Reducer", "U-Bend", "Tee"].map(type => [type, [{ from: "Mtr", to: "Ft" }, { from: "Length (3M)", to: "Mtr" }, { from: "Length (6M)", to: "Mtr" }]]))),
    { name: "Sleeve Insulation", codeTemplate: "Sleeve Ins./{class}/{diameter}/{thickness}", unitOptions: ["Mtr", "Ft", "Nos."] , fields: [field("diameter", "Diameter (mm)", "number", { required: true, min: 0, minExclusive: true }), field("thickness", "Thickness (mm)", "number", { required: true, min: 0, minExclusive: true }), select("class", "Class", ["0", "1"])] , conversionPairs: [] },
    { name: "Round Duct with Aluminium Foil", codeTemplate: "RoundDuct/{construction}/{insulationStatus}/{insulationThickness}", unitOptions: ["Mtr", "Ft", "Sq. Mtr."], conversionPairs: [], fields: [field("diameter", "Diameter (mm)", "number", { required: true, min: 0, minExclusive: true }), field("construction", "Type", "select", { required: true, options: [{ value: "Rigid", codeToken: "R" }, { value: "Soft", codeToken: "S" }] }), field("insulationStatus", "Insulation Status", "select", { required: true, options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("insulationThickness", "Insulation Thickness (mm)", "select", { required: true, options: options("25", "50"), showWhen: { field: "insulationStatus", value: "Insulated" } })] },
    { name: "GI Duct / MS Duct", codeTemplate: "Duct/{material}/{shape}/{fabrication}/{thickness}G/{coating}/{insulationStatus}/{insulationThickness}", fields: [field("material", "Material", "select", { required: true, options: options("GI", "MS") }), field("shape", "Shape", "select", { required: true, options: [{ value: "Round", codeToken: "Rd" }, { value: "Oval", codeToken: "Ov" }, { value: "Rectangular", codeToken: "Re" }] }), field("fabrication", "Fabrication", "select", { required: true, options: [{ value: "Hand", codeToken: "H" }, { value: "Factory", codeToken: "F" }] }), field("thickness", "Thickness of Sheet (Gauge)", "select", { required: true, options: options("16", "18", "20", "22", "24", "26") }), field("coating", "Coating (GSM)", "select", { required: true, showWhen: { field: "material", value: "GI" }, options: options("120", "150", "180", "200", "220", "250") }), field("insulationStatus", "Insulation Status", "select", { required: true, showWhenAll: [{ field: "fabrication", value: "Factory" }], showWhenAny: [{ field: "shape", value: "Round" }, { field: "shape", value: "Oval" }], options: [{ value: "Insulated", codeToken: "I" }, { value: "Non-Insulated", codeToken: "NI" }] }), field("insulationThickness", "Insulation Thickness (mm)", "number", { required: true, min: 0, minExclusive: true, showWhen: { field: "insulationStatus", value: "Insulated" } })], conversionPairs: [] },
    { name: "GI Sheet / MS Sheet", codeTemplate: "Sheet/{material}/{width}/{coating}/{thickness}G", fields: [select("material", "Material", ["GI", "MS"]), field("width", "Width (mm)", "select", { required: true, options: [{ value: "900 mm", codeToken: "900" }, { value: "1000 mm", codeToken: "1000" }, { value: "1200 mm", codeToken: "1200" }] }), field("coating", "Coating (GSM)", "number", { required: true, min: 0, minExclusive: true }), field("thickness", "Thickness (Gauge)", "number", { required: true, min: 0, minExclusive: true })] , conversionPairs: [] },
    { name: "Canvas", codeTemplate: "Canvas/{type}", unitOptions: ["RMtr", "Sq. Mtr."], defaultUnit: "RMtr", conversionPairs: [{ from: "RMtr", to: "Sq. Mtr." }], fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Cloth", codeToken: "C" }, { value: "Readymade", codeToken: "RM" }, { value: "Roll", codeToken: "R" }] })] },
    { name: "Nitrile Insulation Sheet / XLPE Insulation Sheet", codeTemplate: "Ins.Sheet/{material}/{coating}/{class}/{thickness}", unitOptions: ["Sq. Mtr."], fields: [field("material", "Material", "select", { required: true, options: [{ value: "Nitrile", codeToken: "N" }, { value: "XLPE", codeToken: "X" }] }), field("thickness", "Thickness (mm)", "number", { required: true, min: 0, minExclusive: true }), field("coating", "Coating", "select", { required: true, options: [{ value: "Plain", codeToken: "P" }, { value: "Aluminium Foil", codeToken: "AF" }] }), select("class", "Class", ["0", "1"])] , conversionPairs: [] },
    { name: "Acoustic Insulation", codeTemplate: "AccousticIns./{type}/{thickness}", unitOptions: ["Sq. Mtr."], fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Open Cell (Accousound)", codeToken: "O" }, { value: "Glasswool", codeToken: "G" }, { value: "Rigid Board", codeToken: "R" }] }), field("thickness", "Thickness (mm)", "select", { required: true, options: options("10", "12", "15", "19", "25") })] , conversionPairs: [] },
    { name: "Underdeck Insulation", codeTemplate: "UnderdeckIns./{type}/{thickness}", unitOptions: ["Sq. Mtr."], fields: [field("type", "Type", "select", { required: true, listColumn: "type", options: [{ value: "Nitrile", codeToken: "N" }, { value: "PUF", codeToken: "P" }, { value: "Glasswool (Roll)", codeToken: "Gr" }, { value: "Glasswool (Bag)", codeToken: "Gb" }, { value: "Rigid Board", codeToken: "R" }, { value: "Sheet", codeToken: "S" }] }), field("thickness", "Thickness (mm)", "number", { required: true, min: 0, minExclusive: true })] , conversionPairs: [] },
    { name: "Aluminium Perforated Sheet", codeTemplate: "AlP/{thickness}", unitOptions: ["Sq. Mtr."], fields: [field("thickness", "Thickness (Gauge)", "number", { required: true, min: 0, minExclusive: true })], conversionPairs: [] },
    { name: "Tissue Paper", codeTemplate: "Tissue/{thickness}", unitOptions: ["Sq. Mtr."], fields: [field("thickness", "Thickness (Mil)", "number", { required: true, min: 0, minExclusive: true })], conversionPairs: [] },
    { name: "AC Stand", codeTemplate: "ACStand/{type}/{mounting}/{size}", unitOptions: ["Nos.", "Kg"], defaultUnit: "Nos.", fields: [field("type", "Type", "select", { required: true, options: [{ value: "Powder Coated", codeToken: "PC" }, { value: "MS", codeToken: "MS" }] }), field("mounting", "Mounting", "select", { required: true, options: [{ value: "Wall", codeToken: "W" }, { value: "Floor", codeToken: "F" }] }), select("size", "Size", ["18", "24", "26"])], conversionPairs: [] },
    { name: "Rubber Pad", codeTemplate: "RubberPad/{thickness}/{size}", unitOptions: ["Nos."], fields: [field("thickness", "Thickness (mm)", "number", { required: true, min: 0, minExclusive: true }), field("size", "Size (inches)", "number", { required: true, min: 0, minExclusive: true })], conversionPairs: [] },
    noCode("Stand Insulator", { pending: true, fields: [field("specification", "Specification", "text")] }),
]}, {
    name: "HVAC", items: [
        ...[
            { name: "Split AC", code: "SAC" },
            { name: "Window AC", code: "WAC" },
            { name: "Tower AC", code: "TAC" },
            { name: "Cassette AC", code: "CAC" },
        ].map(({ name, code }): CatalogItem => ({
            name,
            codeTemplate: `${code}/{type}/{operation}/{tonnage}T/{btu}/{starRating}`,
            defaultUnit: "Nos.",
            unitOptions: ["Nos."],
            fields: [
                field("type", "Type", "select", { required: true, options: [{ value: "Fixed Speed", codeToken: "F" }, { value: "Inverter", codeToken: "I" }] }),
                field("operation", "Operation Type", "select", { required: true, options: [{ value: "Cooling", codeToken: "C" }, { value: "Hot & Cold", codeToken: "HC" }] }),
                field("tonnage", "Tonnage (T)", "number", { required: true, min: 0, minExclusive: true }),
                field("btu", "BTU", "number", { required: true, min: 0, minExclusive: true }),
                field("starRating", "Star Rating", "number", { required: true, min: 0, minExclusive: true, integer: true }),
            ],
        })),
    ],
}];

export const ITEM_CATALOG: CatalogCategory[] = [...DC_ITEM_CATALOG, ...AC_ITEM_CATALOG];

export const UNIT_OPTIONS = ["Kg", "Kgs.", "Mtr", "Ft", "Length (3M)", "Length (6M)", "Nos.", "RMtr", "Sq. Mtr.", "Litre", "Can", "Container", "Pair", "Pairs", "Set"] as const;
export const DEFAULT_UNIT = "Nos.";
export const findCatalogItem = (categoryName: string, itemName: string) => ITEM_CATALOG.find(category => category.name === categoryName)?.items.find(item => item.name === resolvedItemName(itemName));
const fixedUnits: Record<string, string[]> = {
    "Ni-Cd Battery": ["Nos."], "VRLA Battery": ["Nos."], "Flooded Lead-Acid (FLA) Battery": ["Nos."], ICC: ["Nos."], IPP: ["Nos."], "Vent Plug": ["Nos."],
    Electrolyte: ["Litre"], Shrouds: ["Nos."], "Cell Lifter": ["Nos."], "Battery Stand": ["Nos."], "Battery Terminal Box": ["Nos."],
    "Eye Wash Bottle": ["Nos."], "Eye Wash Station": ["Nos."], "Goggles": ["Nos."], "Gloves": ["Pair"], "Apron": ["Nos."], "Shoes": ["Pair"], "Rubber Boots": ["Pair"],
    "Boric Acid": ["Kg"], "Petroleum Jelly": ["Kg"], "Shroud Bristles": ["Nos."], "PP Sheet": ["Sq. Mtr."],
    Multimeter: ["Nos."], "Clamp Meter": ["Nos."], "Torque Wrench": ["Nos."], Thermometer: ["Nos."], "Thermometer Stand": ["Nos."], "Temperature Gun": ["Nos."], Hydrometer: ["Nos."], "Hydrometer Stand": ["Nos."], "Earth Fault Locator": ["Nos."], "Impedance Tester": ["Nos."],
    Washer: ["Nos."], Bolt: ["Nos."], Nut: ["Nos."], "Battery Charger": ["Nos."],
    "SPV (Solar Photovoltaic)": ["Nos."], "MC4 Connector (in Pairs)": ["Pair"], "Earthing Insulator": ["Nos."], Ferrule: ["Nos."],
};
export const getAllowedUnits = (categoryName: string, itemName: string, specifications: Record<string, string> = {}) => {
    const item = findCatalogItem(categoryName, itemName);
    if (item?.unitOptionsByField) {
        const [fieldKey, optionsByValue] = Object.entries(item.unitOptionsByField)[0] || [];
        return optionsByValue?.[specifications[fieldKey] || ""] || UNIT_OPTIONS;
    }
    return item?.unitOptions || fixedUnits[resolvedItemName(itemName)] || UNIT_OPTIONS;
};
export const getDefaultUnit = (categoryName: string, itemName: string, specifications: Record<string, string> = {}) => {
    const item = findCatalogItem(categoryName, itemName);
    if (item?.defaultUnitByField) {
        const [fieldKey, defaultsByValue] = Object.entries(item.defaultUnitByField)[0] || [];
        const configured = defaultsByValue?.[specifications[fieldKey] || ""];
        if (configured) return configured;
    }
    return item?.defaultUnit || getAllowedUnits(categoryName, itemName, specifications)[0] || DEFAULT_UNIT;
};
export const getAllowedConversionPairs = (categoryName: string, itemName: string, specifications: Record<string, string> = {}) => {
    const item = findCatalogItem(categoryName, itemName);
    if (!item) return undefined;
    if (item.conversionPairsByField) {
        const [fieldKey, pairsByValue] = Object.entries(item.conversionPairsByField)[0] || [];
        return pairsByValue?.[specifications[fieldKey] || ""] || [];
    }
    return item.conversionPairs;
};
export const resolveCatalogItemByName = (name: string) => ITEM_CATALOG.flatMap(category => category.items).find(item => item.name === resolvedItemName(name));
export const getItemMainCategory = (itemName: string, fallback?: string | null) => ITEM_CATALOG.find(category => category.items.some(item => item.name === resolvedItemName(itemName)))?.name || fallback || "AC Accessories";
export const categoryForItem = (itemName: string) => ITEM_CATALOG.find(category => category.items.some(item => item.name === resolvedItemName(itemName)));
export const fieldIsVisible = (specifications: Record<string, string>, itemField: CatalogField) =>
    (!itemField.showWhen || specifications[itemField.showWhen.field] === itemField.showWhen.value)
    && (itemField.showWhenAll || []).every(condition => specifications[condition.field] === condition.value)
    && (!itemField.showWhenAny?.length || itemField.showWhenAny.some(condition => specifications[condition.field] === condition.value))
    && !(itemField.hideWhen || []).some(condition => specifications[condition.field] === condition.value);
