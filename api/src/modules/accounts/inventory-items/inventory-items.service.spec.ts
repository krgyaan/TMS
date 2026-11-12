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

const itemRow = (teamId: number | null) => ({
    id: 1, itemCode: "ITM-0001", itemGroup: null, teamId, itemName: "Copper", itemType: "Pipe",
    description: null, specifications: { diameter: "12" }, unit: "Kg", conversion: {}, conversionUnit: null,
    conversionFactor: null, hsnCode: null, isActive: true, deletedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
});

const serviceForCrud = (existing?: ReturnType<typeof itemRow>) => {
    let inserted: Record<string, unknown> | undefined;
    let updated: Record<string, unknown> | undefined;
    const db = {
        select: () => ({ from: () => ({ where: () => ({
            limit: async () => existing ? [existing] : [],
            then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve([]).then(resolve, reject),
        }) }) }),
        insert: () => ({ values: (values: Record<string, unknown>) => {
            inserted = values;
            return { returning: async () => [{ ...itemRow(null), ...values }] };
        } }),
        update: () => ({ set: (values: Record<string, unknown>) => {
            updated = values;
            return { where: () => ({ returning: async () => [{ ...existing, ...values }] }) };
        } }),
        execute: async () => ({ rows: [{ nextval: "2" }] }),
    };
    return { service: new InventoryItemsService(db as never), inserted: () => inserted, updated: () => updated };
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
        const parsed = itemSchema.parse({ itemName: "Copper", unit: "Kg", specifications: {} });
        expect(parsed).not.toHaveProperty("conversionUnit");
        expect(parsed).not.toHaveProperty("conversionFactor");
    });

    it("creates an item without teamId and stores teamId as null", async () => {
        const { service, inserted } = serviceForCrud();
        const data = itemSchema.parse({ itemName: "Copper", unit: "Kg", specifications: {} });
        await service.create(data);
        expect(inserted()).toMatchObject({ teamId: null, itemName: "Copper" });
    });

    it("accepts and ignores legacy teamId on create", async () => {
        const { service, inserted } = serviceForCrud();
        const data = itemSchema.parse({ teamId: 5, itemName: "Copper", unit: "Kg", specifications: {} });
        await service.create(data);
        expect(inserted()).toMatchObject({ teamId: null });
    });

    it.each([null, 5])("updates an item whose existing teamId is %s without changing it", async teamId => {
        const existing = itemRow(teamId);
        const { service, updated } = serviceForCrud(existing);
        const data = itemSchema.partial().parse({ itemName: "Copper Updated" });
        await service.update(1, data);
        expect(updated()).not.toHaveProperty("teamId");
        expect(updated()).toMatchObject({ itemName: "Copper Updated" });
    });

    it("accepts and ignores legacy teamId on update", async () => {
        const existing = itemRow(null);
        const { service, updated } = serviceForCrud(existing);
        const data = itemSchema.partial().parse({ teamId: 5, itemName: "Copper Updated" });
        await service.update(1, data);
        expect(updated()).not.toHaveProperty("teamId");
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
