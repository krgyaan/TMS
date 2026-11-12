import { ConflictException } from "@nestjs/common";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema } from "./inventory-items.controller";

const item = {
    id: 5, itemCode: "ITM-0005", itemGroup: null, teamId: 1, itemName: "Copper", itemType: "Pipe",
    description: null, specifications: { diameter: "12" }, unit: "Mtr", conversion: { value: "Mtr -> Ft" },
    conversionUnit: "Ft", conversionFactor: "3.2808400000", hsnCode: null, isActive: true,
    deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};

describe("Item Master without item-team assignment", () => {
    it("accepts create data without a team", () => {
        const parsed = itemSchema.parse({ itemName: "Copper", itemType: "Pipe", unit: "Mtr", specifications: {} });
        expect(parsed).not.toHaveProperty("teamId");
    });

    it("creates an item without writing team_id", async () => {
        let inserted: Record<string, unknown> | undefined;
        const db = {
            select: () => ({ from: () => ({ where: async () => [] }) }),
            execute: async () => ({ rows: [{ nextval: "6" }] }),
            insert: () => ({ values: (values: Record<string, unknown>) => { inserted = values; return { returning: async () => [{ ...item, ...values }] }; } }),
        };
        await new InventoryItemsService(db as never).create({ itemName: "New item", itemType: null, description: null, specifications: {}, unit: "Kg", hsnCode: null, isActive: true });
        expect(inserted).toBeDefined();
        expect(inserted).not.toHaveProperty("teamId");
    });

    it("rejects matching name, type, specifications and unit regardless of team", async () => {
        const db = { select: () => ({ from: () => ({ where: async () => [item] }) }) };
        await expect(new InventoryItemsService(db as never).create({ itemName: "Copper", itemType: "Pipe", description: null, specifications: { diameter: "12" }, unit: "Mtr", hsnCode: null, isActive: true })).rejects.toBeInstanceOf(ConflictException);
    });

    it("allows the same item attributes with a different unit", async () => {
        let inserted = false;
        const db = {
            select: () => ({ from: () => ({ where: async () => [item] }) }),
            execute: async () => ({ rows: [{ nextval: "6" }] }),
            insert: () => ({ values: () => ({ returning: async () => { inserted = true; return [item]; } }) }),
        };
        await new InventoryItemsService(db as never).create({ itemName: "Copper", itemType: "Pipe", description: null, specifications: { diameter: "12" }, unit: "Kg", hsnCode: null, isActive: true });
        expect(inserted).toBe(true);
    });

    it("keeps existing items editable without rewriting their team assignment", async () => {
        let updateValues: Record<string, unknown> | undefined;
        const db = {
            select: () => ({ from: () => ({ where: () => ({ limit: async () => [item], then: (resolve: (items: unknown[]) => unknown) => Promise.resolve([]).then(resolve) }) }) }),
            update: () => ({ set: (values: Record<string, unknown>) => { updateValues = values; return { where: () => ({ returning: async () => [{ ...item, ...values }] }) }; } }),
        };
        const service = new InventoryItemsService(db as never);
        await service.update(item.id, { itemName: "Copper edited" });
        expect(updateValues).not.toHaveProperty("teamId");
    });
});
