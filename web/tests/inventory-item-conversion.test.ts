import assert from "node:assert/strict";
import test from "node:test";
import { UNIT_OPTIONS } from "../src/modules/accounts/inventory-items/item-config.ts";

test("exposes every supported unit", () => {
    assert.deepEqual(UNIT_OPTIONS, ["Kg", "Mtr", "Ft", "Nos.", "RMtr", "Sq. Mtr."]);
});
