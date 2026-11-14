import assert from "node:assert/strict";
import test from "node:test";
import { ITEM_CATALOG, UNIT_OPTIONS, fieldIsVisible, findCatalogItem, getAllowedUnits } from "../src/modules/accounts/inventory-items/item-catalog.ts";
import { buildInventoryItemFormSchema } from "../src/modules/accounts/inventory-items/item-form-schema.ts";
import { generateTemplatedItemCode, getItemCodePreview } from "../src/modules/accounts/inventory-items/item-code-generator.ts";
import { formatKeySpecification, itemMasterColumnsForViewport } from "../src/modules/accounts/inventory-items/item-master-display.ts";
import { ITEM_CATALOG as API_ITEM_CATALOG } from "../../api/src/modules/accounts/inventory-items/item-catalog.ts";

const base = (overrides: Record<string, unknown> = {}) => ({
    category: "Batteries",
    itemName: "Ni-Cd Battery",
    itemType: "KP",
    specifications: { type: "KP", discharge: "L", capacity: "100" },
    makeBrand: "",
    description: "",
    unit: "Nos.",
    storedUnit: "",
    conversionUnit: "",
    conversionFactor: "",
    hsnCode: "0009997",
    isActive: true,
    ...overrides,
});

test("web catalog content matches the API catalog", () => {
    assert.deepEqual(ITEM_CATALOG, API_ITEM_CATALOG);
});

test("catalog code generator matches the API sheet formats and sequence fallback", () => {
    assert.equal(generateTemplatedItemCode("Batteries", "Ni-Cd Battery", { type: "KP", discharge: "L", capacity: "100" }), "NICD/KP/L/100");
    assert.equal(generateTemplatedItemCode("Batteries", "VRLA Battery", { type: "AGM", voltage: "12V", capacity: "100" }), "VRLA/AGM/12V/100");
    assert.equal(generateTemplatedItemCode("Batteries", "Flooded Lead-Acid Battery", { type: "OPzS", capacity: "500.00" }), "FLA/OPZS/500");
    assert.equal(getItemCodePreview("Battery Accessories", "Eye Wash Bottle", {}), "EyeWashBottle");
    assert.equal(generateTemplatedItemCode("Battery Accessories", "ICC", { mRating: "M10", insulation: "Insulated", coating: "Nickel-Coated" }), "ICC/M10/INSULATED/NICKEL-COATED");
    assert.equal(getItemCodePreview("Batteries", "Ni-Cd Battery", {}), "Select all options to generate the code");
});

test("all 18 AC configurations generate their specified code formats", () => {
    const cases: [string, Record<string, string>, string][] = [
        ["Copper", { type: "Pipe", diameter: "12", thickness: "0.5", strength: "Hard" }, "CU/Pipe/H/0.5/12"],
        ["Copper", { type: "Elbow", diameter: "12", thickness: "1", strength: "Soft" }, "CU/Elbow/S/1/12"],
        ["PVC Pipe", { type: "Pipe", diameter: "20", thickness: "40", strength: "Hard" }, "PVC/Pipe/H/40/20"],
        ["UPVC Pipe", { type: "Tee", diameter: "25", thickness: "50", strength: "Soft" }, "UPVC/Tee/S/50/25"],
        ["CPVC Pipe", { type: "Pipe", diameter: "32", thickness: "11", strength: "Hard" }, "CPVC/Pipe/H/11/32"],
        ["MS", { type: "Reducer", diameter: "40", thickness: "12", strength: "Soft" }, "MS/Reducer/S/12/40"],
        ["Sleeve Insulation", { diameter: "20", thickness: "10", class: "1" }, "SI/1/20/10"],
        ["Round Duct with Aluminium Foil", { construction: "Rigid", insulationStatus: "Insulated", insulationThickness: "25", diameter: "300" }, "RoundDuct/R/I/25/300"],
        ["GI Duct / MS Duct", { material: "GI", shape: "Rectangular", fabrication: "Factory", thickness: "24" }, "Duct/GI/Re/F/24"],
        ["GI Sheet / MS Sheet", { material: "MS", width: "900 mm", coating: "120", thickness: "24" }, "Sheet/MS/900/120/24"],
        ["Canvas", { type: "Roll" }, "Canvas/R"],
        ["Nitrile Insulation Sheet / XLPE Insulation Sheet", { material: "Nitrile", coating: "Aluminium Foil", class: "1", thickness: "10" }, "InsulationSheet/N/AF/1/10"],
        ["Acoustic Insulation", { type: "Glasswool", thickness: "25" }, "AcousticInsulation/G/25"],
        ["Underdeck Insulation", { type: "Glasswool (Roll)", thickness: "50" }, "UnderdeckInsulation/G-Roll/50"],
        ["Aluminium Perforated Sheet", { thickness: "24" }, "AlPerforatedSheet/24"],
        ["Tissue Paper", { thickness: "10" }, "TissuePaper/10"],
        ["AC Stand", { type: "Powder Coated", mounting: "Wall", size: "18" }, "ACStand/PC/W/18"],
        ["Rubber Pad", { thickness: "3", size: "4" }, "RubberPad/3/4"],
    ];
    for (const [itemName, specifications, expected] of cases) {
        assert.equal(generateTemplatedItemCode("AC Accessories", itemName, specifications), expected, itemName);
    }
    assert.notEqual(
        generateTemplatedItemCode("AC Accessories", "Underdeck Insulation", { type: "Glasswool (Roll)", thickness: "50" }),
        generateTemplatedItemCode("AC Accessories", "Underdeck Insulation", { type: "Glasswool (Bag)", thickness: "50" }),
    );
});

test("AC conditional fields, N/A exclusion, numeric values and Pipe unit restrictions", () => {
    const duct = findCatalogItem("AC Accessories", "Round Duct with Aluminium Foil");
    const insulationThickness = duct?.fields.find(field => field.key === "insulationThickness");
    assert.ok(insulationThickness);
    const nonInsulated = { construction: "Rigid", insulationStatus: "Non-Insulated", diameter: "300" };
    assert.equal(fieldIsVisible(nonInsulated, insulationThickness), false);
    assert.equal(generateTemplatedItemCode("AC Accessories", "Round Duct with Aluminium Foil", nonInsulated), "RoundDuct/R/NI/300");
    assert.equal(generateTemplatedItemCode("AC Accessories", "Round Duct with Aluminium Foil", { ...nonInsulated, insulationThickness: "N/A" }), "RoundDuct/R/NI/300");
    assert.deepEqual(getAllowedUnits("AC Accessories", "PVC Pipe", { type: "Pipe" }), ["Mtr", "Ft"]);
    assert.equal(buildInventoryItemFormSchema().safeParse(base({
        category: "AC Accessories", itemName: "Rubber Pad", unit: "Nos.", storedUnit: "",
        specifications: { thickness: "three", size: "4" },
    })).success, false);
});

test("form validation follows catalog required, optional, conditional and range rules", () => {
    const schema = buildInventoryItemFormSchema();
    assert.equal(schema.safeParse(base()).success, true);
    assert.equal(schema.safeParse(base({ specifications: { discharge: "L", capacity: "100" } })).success, false);
    assert.equal(schema.safeParse(base({ specifications: { type: "KP", discharge: "L", capacity: "0" } })).success, false);
    assert.equal(schema.safeParse(base({ specifications: { type: "KP", discharge: "L", capacity: "100", unknown: "x" } })).success, false);
    assert.equal(schema.safeParse(base({ itemName: "Eye Wash Bottle", category: "Battery Accessories", specifications: {}, hsnCode: "" })).success, true);

    const charger = findCatalogItem("Battery Chargers", "Battery Charger");
    const pulse = charger?.fields.find(field => field.key === "pulse");
    assert.ok(pulse);
    assert.equal(fieldIsVisible({ technology: "SCR" }, pulse), false);
    assert.equal(fieldIsVisible({ technology: "IGBT" }, pulse), true);
    const chargerBase = {
        category: "Battery Chargers", itemName: "Battery Charger", itemType: "FCBC",
        specifications: { chargerType: "FCBC", technology: "SCR", regulationType: "CC", voltage: "48", current: "10" },
        makeBrand: "", description: "", unit: "Nos.", storedUnit: "", conversionUnit: "", conversionFactor: "", hsnCode: "2232", isActive: true,
    };
    assert.equal(schema.safeParse(chargerBase).success, true);
    assert.equal(schema.safeParse({ ...chargerBase, specifications: { ...chargerBase.specifications, technology: "IGBT" } }).success, false);
    assert.equal(schema.safeParse({ ...chargerBase, specifications: { ...chargerBase.specifications, technology: "IGBT", pulse: "6" } }).success, true);

    const ups = findCatalogItem("UPS", "UPS");
    const zeroTransfer = ups?.fields.find(field => field.key === "zeroTransferTime");
    assert.ok(zeroTransfer);
    assert.equal(fieldIsVisible({ topology: "Offline" }, zeroTransfer), false);
    assert.equal(fieldIsVisible({ topology: "Online (Double Conversion)" }, zeroTransfer), true);
    assert.equal(schema.safeParse({ ...base(), category: "UPS", itemName: "UPS", itemType: "Offline", specifications: { topology: "Offline", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%" } }).success, false);
    assert.equal(schema.safeParse({ ...base(), category: "UPS", itemName: "UPS", itemType: "Online (Double Conversion)", specifications: { topology: "Online (Double Conversion)", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%", zeroTransferTime: "Yes" } }).success, false);
});

test("HSN requires 4 to 8 digits and preserves leading zeroes", () => {
    const schema = buildInventoryItemFormSchema();
    for (const hsnCode of ["0009997", "2232", "122332"]) {
        assert.equal(schema.safeParse(base({ hsnCode })).success, true, hsnCode);
    }
    for (const hsnCode of ["123", "123456789", "12A4", ""]) {
        assert.equal(schema.safeParse(base({ hsnCode })).success, false, hsnCode);
    }
});

test("key specification formatting uses catalog labels and units", () => {
    assert.equal(formatKeySpecification("Batteries", "Ni-Cd Battery", { type: "KP", discharge: "L", capacity: "100" }), "Type: KP\nDischarge: L\nCapacity: 100 Ah");
    assert.equal(formatKeySpecification("Legacy", "Copper", { diameter: "12", thickness: "18", strength: "Hard" }), "Diameter: 12\nThickness: 18\nStrength: Hard");
});

test("Item Master columns hide Type then Created By as the grid narrows", () => {
    assert.deepEqual(itemMasterColumnsForViewport(1366), { mobile: false, createdBy: true, category: true, unit: true });
    assert.deepEqual(itemMasterColumnsForViewport(1200), { mobile: false, createdBy: false, category: true, unit: true });
    assert.deepEqual(itemMasterColumnsForViewport(1000), { mobile: false, createdBy: false, category: false, unit: true });
    assert.deepEqual(itemMasterColumnsForViewport(375), { mobile: true, createdBy: false, category: false, unit: false });
    assert.deepEqual(UNIT_OPTIONS, ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr.", "Litre", "Container", "Pair", "Set"]);
});
