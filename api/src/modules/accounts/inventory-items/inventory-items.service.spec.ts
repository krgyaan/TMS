import { BadRequestException } from "@nestjs/common";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema } from "./inventory-items.controller";

const serviceForTeam = (name?: string) => {
    const db = {
        select: () => ({
            from: () => ({
                where: () => ({ limit: async () => name ? [{ name }] : [] }),
            }),
        }),
    };
    return new InventoryItemsService(db as never);
};

describe("InventoryItemsService.validateTeamId", () => {
    it.each(["AC", "DC"])("accepts supported team %s", async name => {
        await expect(serviceForTeam(name).validateTeamId(1)).resolves.toBeUndefined();
    });

    it.each(["Accounts", "Operations", "Other", undefined])("rejects unsupported team %s", async name => {
        await expect(serviceForTeam(name).validateTeamId(1)).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe("Item Master create and update conversion behavior", () => {
    it("accepts an item payload that contains no conversion fields", () => {
        const parsed = itemSchema.parse({ teamId: 1, itemName: "Copper", unit: "Kg", specifications: {} });
        expect(parsed).not.toHaveProperty("conversionUnit");
        expect(parsed).not.toHaveProperty("conversionFactor");
    });

    it("preserves and validates a stored conversion when an unrelated field is patched", async () => {
        const existing = {
            id: 1, itemCode: "ITM-0001", itemGroup: null, teamId: 1, itemName: "Copper", itemType: "Pipe",
            description: null, specifications: { diameter: "12" }, unit: "Mtr", conversion: { value: "Mtr -> Ft" },
            conversionUnit: "Ft", conversionFactor: "3.2808400000", hsnCode: null, isActive: true,
            deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
        };
        let selectCount = 0;
        let updateValues: Record<string, unknown> | undefined;
        const db = {
            select: () => {
                selectCount += 1;
                return { from: () => ({ where: () => ({
                    limit: async () => selectCount === 1 ? [existing] : [{ name: "AC" }],
                    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve([]).then(resolve, reject),
                }) }) };
            },
            update: () => ({ set: (values: Record<string, unknown>) => {
                updateValues = values;
                return { where: () => ({ returning: async () => [{ ...existing, ...values }] }) };
            } }),
        };
        const service = new InventoryItemsService(db as never);
        await service.update(1, { itemName: "Copper Pipe Updated" });
        expect(updateValues).toBeDefined();
        expect(updateValues).toMatchObject({
            conversion: { value: "Mtr -> Ft" },
            conversionUnit: "Ft",
            conversionFactor: "3.28084",
        });
    });
});
