import assert from "node:assert/strict";
import test from "node:test";
import { buildInventoryItemFormSchema } from "../src/modules/accounts/inventory-items/item-form-schema.ts";
import { getCategory, ITEM_CATEGORIES, UNIT_OPTIONS } from "../src/modules/accounts/inventory-items/item-config.ts";

test("form schema parses every item family and every available Type option", () => {
    let cases = 0;
    for (const category of ITEM_CATEGORIES) {
        const types = category.types ?? [""];
        for (const itemType of types) {
            const schema = buildInventoryItemFormSchema();
            const sample = {
                itemName: category.name,
                itemType,
                specifications: Object.fromEntries(category.fields.map(field => [field.key, field.options?.[0] ?? "sample"])),
                description: "sample description",
                unit: "Nos.",
                conversionUnit: "",
                conversionFactor: "",
                hsnCode: "1234",
                isActive: true,
            };
            assert.ok(schema, `${category.name} schema is defined`);
            assert.deepEqual(schema.parse(sample), sample, `${category.name} type ${itemType || "(none)"}`);
            cases += 1;
        }
    }
    assert.equal(ITEM_CATEGORIES.length, 16);
    assert.ok(cases >= ITEM_CATEGORIES.length);
});

test("form schema parses every supported unit", () => {
    for (const unit of UNIT_OPTIONS) {
        const schema = buildInventoryItemFormSchema();
        assert.ok(schema, `${unit} schema is defined`);
        const parsed = schema.parse({
            itemName: ITEM_CATEGORIES[0].name,
            itemType: ITEM_CATEGORIES[0].types?.[0],
            specifications: { diameter: "12", thickness: "sample", strength: "Hard" },
            description: "",
            unit,
            conversionUnit: "",
            conversionFactor: "",
            hsnCode: "",
            isActive: true,
        });
        assert.equal(parsed.unit, unit);
        assert.equal(parsed.unit, unit);
    }
});

test("conversion fields must be complete with a positive factor", () => {
    const schema = buildInventoryItemFormSchema();
    const base = {
        itemName: ITEM_CATEGORIES[0].name, itemType: "Pipe", specifications: {},
        description: "", unit: "Kg" as const, hsnCode: "", isActive: true,
    };
    assert.equal(schema.safeParse({ ...base, conversionUnit: "Mtr", conversionFactor: "0.5" }).success, true);
    assert.equal(schema.safeParse({ ...base, conversionUnit: "Mtr", conversionFactor: "" }).success, false);
    assert.equal(schema.safeParse({ ...base, conversionUnit: "Mtr", conversionFactor: "1.1234567" }).success, true);
    assert.equal(schema.safeParse({ ...base, conversionUnit: "Mtr", conversionFactor: "0" }).success, false);
    assert.equal(schema.safeParse({ ...base, conversionUnit: "", conversionFactor: "1" }).success, false);
});

test("form limits match the API and legacy AC Stand resolves to Equipment Stand fields", () => {
    const schema = buildInventoryItemFormSchema();
    const base = { itemName: "Copper", itemType: "Pipe", specifications: {}, description: "", unit: "Kg" as const, conversionUnit: "", conversionFactor: "", hsnCode: "", isActive: true };
    assert.equal(schema.safeParse({ ...base, itemType: "x".repeat(81) }).success, false);
    assert.equal(schema.safeParse({ ...base, hsnCode: "x".repeat(31) }).success, false);
    assert.equal(schema.safeParse({ ...base, specifications: { note: "x".repeat(201) } }).success, false);
    assert.equal(getCategory("AC Stand")?.name, "Equipment Stand");
});
