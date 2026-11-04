import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSION_RULES, UNIT_OPTIONS, getConversionRules } from "../src/modules/accounts/inventory-items/item-config.ts";

test("exposes every supported unit", () => {
    assert.deepEqual(UNIT_OPTIONS, ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."]);
});

test("returns only valid conversion targets", () => {
    assert.deepEqual(getConversionRules("Mtr").map(rule => rule.to), ["Kg", "Ft"]);
    assert.deepEqual(getConversionRules("Nos."), []);
    assert.equal(CONVERSION_RULES.find(rule => rule.from === "Mtr" && rule.to === "Ft")?.factor, 3.28084);
});
