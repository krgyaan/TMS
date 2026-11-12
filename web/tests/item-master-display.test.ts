import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/vite-env-loader.mjs", import.meta.url);
register("./helpers/tsx-loader.mjs", import.meta.url);

const { itemMasterColumnsForViewport } = await import("../src/modules/accounts/inventory-items/item-master-display.ts");

test("keeps code and HSN while hiding optional columns from the lowest priority upward", () => {
    for (const width of [1024, 1280, 1536, 1920]) {
        const columns = itemMasterColumnsForViewport(width);
        assert.equal(columns.hsn, true);
        assert.equal(columns.itemType, true);
    }
    const narrow = itemMasterColumnsForViewport(850);
    assert.equal(narrow.itemType, true);
    assert.equal(narrow.specifications, false);
    assert.equal(narrow.conversion, false);
    assert.equal(narrow.createdAt, false);
    const medium = itemMasterColumnsForViewport(1024);
    assert.equal(medium.specifications, true);
    assert.equal(medium.conversion, false);
    assert.equal(medium.createdAt, false);
    assert.equal(itemMasterColumnsForViewport(1280).createdAt, false);
    assert.equal(itemMasterColumnsForViewport(1536).createdAt, true);
});

test("uses container width for mobile card breakpoint and includes Settings selection space", () => {
    assert.equal(itemMasterColumnsForViewport(375).mobile, true);
    assert.equal(itemMasterColumnsForViewport(768).mobile, false);
    assert.equal(itemMasterColumnsForViewport(1024, true).specifications, false);
    assert.equal(itemMasterColumnsForViewport(1024, true).hsn, true);
});
