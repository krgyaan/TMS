import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/vite-env-loader.mjs", import.meta.url);
register("./helpers/tsx-loader.mjs", import.meta.url);

const { itemMasterColumnsForViewport } = await import("../src/modules/accounts/inventory-items/item-master-display.ts");

test("applies responsive column visibility at target widths", () => {
    assert.equal(itemMasterColumnsForViewport(375).mobile, true);
    assert.equal(itemMasterColumnsForViewport(768).mobile, false);
    assert.equal(itemMasterColumnsForViewport(1280).hsn, false);
    assert.equal(itemMasterColumnsForViewport(1366).hsn, true);
});
