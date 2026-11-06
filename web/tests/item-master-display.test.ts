import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/vite-env-loader.mjs", import.meta.url);
register("./helpers/tsx-loader.mjs", import.meta.url);

const { formatKeySpecification, itemMasterColumnsForViewport } = await import("../src/modules/accounts/inventory-items/item-master-display.ts");

test("formats configured specification labels and units and skips empty values", () => {
    assert.equal(formatKeySpecification("Acoustic Insulation", { type: "Open Cell (Accousound)", thickness: "12 mm", empty: "" }), "Type Open Cell (Accousound) · Thickness 12 mm");
    assert.equal(formatKeySpecification("Copper", { diameter: "22", thickness: "18", strength: "Hard" }), "Diameter 22 mm · Gauge 18 · Hard");
    assert.equal(formatKeySpecification("Unknown family", { custom: " value " }), "value");
});

test("applies responsive column visibility at target widths", () => {
    assert.equal(itemMasterColumnsForViewport(375, false).mobile, true);
    assert.equal(itemMasterColumnsForViewport(768, false).mobile, false);
    assert.equal(itemMasterColumnsForViewport(1280, true).hsn, false);
    assert.equal(itemMasterColumnsForViewport(1024, true).compact, true);
    assert.equal(itemMasterColumnsForViewport(1280, false).compact, false);
    assert.equal(itemMasterColumnsForViewport(1366, false).hsn, true);
    assert.equal(itemMasterColumnsForViewport(1536, true).createdAt, true);
    assert.equal(itemMasterColumnsForViewport(1920, false).createdAt, true);
});
