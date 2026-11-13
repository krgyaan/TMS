import assert from "node:assert/strict";
import test from "node:test";
import { ITEM_CATALOG, UNIT_OPTIONS, fieldIsVisible, findCatalogItem } from "../src/modules/accounts/inventory-items/item-catalog.ts";
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
    assert.equal(generateTemplatedItemCode("Batteries", "Ni-Cd Battery", { type: "KP", discharge: "L", capacity: "100" }), "NICD/KP/L/100AH");
    assert.equal(generateTemplatedItemCode("Batteries", "VRLA Battery", { type: "AGM", voltage: "12V", capacity: "100" }), "VRLA/AGM/12V/100AH");
    assert.equal(generateTemplatedItemCode("Batteries", "Flooded Lead-Acid Battery", { type: "OPzS", capacity: "500.00" }), "FLA/OPZS/500AH");
    assert.equal(getItemCodePreview("Battery Maintenance and Safety Equipment", "Eye Wash Bottle", {}), "EWB-### (number assigned on save)");
    assert.equal(generateTemplatedItemCode("Battery Accessories", "ICC", { diameter: "M10", material: "Insulated", coating: "Nickel-Coated" }), "ICC/M10/INS/NI");
    assert.equal(getItemCodePreview("Batteries", "Ni-Cd Battery", {}), "Select all options to generate the code");
});

test("form validation follows catalog required, optional, conditional and range rules", () => {
    const schema = buildInventoryItemFormSchema();
    assert.equal(schema.safeParse(base()).success, true);
    assert.equal(schema.safeParse(base({ specifications: { discharge: "L", capacity: "100" } })).success, false);
    assert.equal(schema.safeParse(base({ specifications: { type: "KP", discharge: "L", capacity: "0" } })).success, false);
    assert.equal(schema.safeParse(base({ specifications: { type: "KP", discharge: "L", capacity: "100", unknown: "x" } })).success, false);
    assert.equal(schema.safeParse(base({ itemName: "Eye Wash Bottle", category: "Battery Maintenance and Safety Equipment", specifications: {} })).success, true);

    const charger = findCatalogItem("Battery Chargers", "Battery Charger");
    const pulse = charger?.fields.find(field => field.key === "pulse");
    assert.ok(pulse);
    assert.equal(fieldIsVisible({ technology: "SCR" }, pulse), false);
    assert.equal(fieldIsVisible({ technology: "IGBT" }, pulse), true);
    const chargerBase = {
        category: "Battery Chargers", itemName: "Battery Charger", itemType: "FCBC",
        specifications: { chargerType: "FCBC", technology: "SCR", regulationType: "CC", voltage: "48", current: "10", moduleType: "Modular" },
        makeBrand: "", description: "", unit: "Nos.", conversionUnit: "", conversionFactor: "", hsnCode: "2232", isActive: true,
    };
    assert.equal(schema.safeParse(chargerBase).success, true);
    assert.equal(schema.safeParse({ ...chargerBase, specifications: { ...chargerBase.specifications, technology: "IGBT" } }).success, false);
    assert.equal(schema.safeParse({ ...chargerBase, specifications: { ...chargerBase.specifications, technology: "IGBT", pulse: "6" } }).success, true);

    const ups = findCatalogItem("UPS", "UPS");
    const zeroTransfer = ups?.fields.find(field => field.key === "zeroTransferTime");
    assert.ok(zeroTransfer);
    assert.equal(fieldIsVisible({ topology: "Offline" }, zeroTransfer), false);
    assert.equal(fieldIsVisible({ topology: "Online (Double Conversion)" }, zeroTransfer), true);
    assert.equal(schema.safeParse({ ...base(), category: "UPS", itemName: "UPS", itemType: "Offline", specifications: { topology: "Offline", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%" } }).success, true);
    assert.equal(schema.safeParse({ ...base(), category: "UPS", itemName: "UPS", itemType: "Online (Double Conversion)", specifications: { topology: "Online (Double Conversion)", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%", zeroTransferTime: "Yes" } }).success, true);
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
    assert.deepEqual(UNIT_OPTIONS, ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."]);
});
