import { BadRequestException, ConflictException } from "@nestjs/common";
import { InventoryItemsService } from "./inventory-items.service";
import { itemSchema, updateItemSchema } from "./inventory-items.controller";
import { generateTemplatedItemCode } from "./item-code-generator";
import { validateCatalogItemValues } from "./item-catalog-validation";

const row = (overrides: Record<string, unknown> = {}) => ({
    id: 1, itemCode: "ITM-0001", itemGroup: null, teamId: null, category: null, makeBrand: null,
    createdBy: null, updatedBy: null, itemName: "Copper", itemType: "Pipe", description: null,
    specifications: { diameter: "12" }, unit: "Kg", conversion: {}, conversionUnit: null,
    conversionFactor: null, hsnCode: null, isActive: true, deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdByName: "—", ...overrides,
});

const serviceForTeam = (name?: string) => {
    const db = {
        select: () => ({ from: () => ({ where: () => ({ limit: async () => name ? [{ name }] : [] }) }) }),
    };
    return new InventoryItemsService(db as never);
};

const serviceForCrud = (options: { existing?: ReturnType<typeof row>; candidates?: ReturnType<typeof row>[] } = {}) => {
    const existing = options.existing;
    const candidates = options.candidates || [];
    let inserted: Record<string, unknown> | undefined;
    let updated: Record<string, unknown> | undefined;
    const selectQuery = () => ({
        limit: async () => candidates,
        then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(candidates).then(resolve, reject),
    });
    const db = {
        select: () => ({ from: () => ({
            leftJoin: () => ({ where: () => ({ limit: async () => {
                const current = inserted ? { ...row(), ...inserted, createdByName: "Creator" } : { ...existing, createdByName: "Creator" };
                return current ? [current] : [];
            } }) }),
            where: () => selectQuery(),
        }) }),
        insert: () => ({ values: (values: Record<string, unknown>) => {
            inserted = values;
            return { returning: async () => [{ id: 1 }] };
        } }),
        update: () => ({ set: (values: Record<string, unknown>) => {
            updated = values;
            return { where: () => ({ returning: async () => [{ id: 1 }] }) };
        } }),
        execute: async () => ({ rows: [{ nextval: "7" }] }),
    };
    return { service: new InventoryItemsService(db as never), inserted: () => inserted, updated: () => updated };
};

const payload = (overrides: Record<string, unknown> = {}) => ({
    category: "Batteries",
    itemName: "Ni-Cd Battery",
    specifications: { type: "KP", discharge: "L", capacity: "100" },
    unit: "Nos.",
    hsnCode: "0009997",
    isActive: true,
    ...overrides,
});

describe("InventoryItemsService.validateTeamId", () => {
    it.each(["AC", "DC"])("accepts supported team %s", async name => {
        await expect(serviceForTeam(name).validateTeamId(1)).resolves.toBeUndefined();
    });

    it.each(["Accounts", "Operations", "Other", undefined])("rejects unsupported team %s", async name => {
        await expect(serviceForTeam(name).validateTeamId(1)).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe("Item Master catalog codes and validation", () => {
    it.each([
        ["Batteries", "Ni-Cd Battery", { type: "KP", discharge: "L", capacity: "100.00" }, "NICD/KP/L/100"],
        ["Batteries", "VRLA Battery", { type: "TGel", voltage: "12V", capacity: "40.500" }, "VRLA/TGEL/12V/40.5"],
        ["Batteries", "Flooded Lead-Acid Battery", { type: "OPzS", capacity: "00120.0" }, "FLA/OPZS/120"],
    ])("generates the sheet code template for %s / %s", (category, name, specifications, expected) => {
        expect(generateTemplatedItemCode(category as string, name as string, specifications as Record<string, string>)).toBe(expected);
    });

    it("uses no catalog template for every non-sheet item", () => {
        expect(generateTemplatedItemCode("Battery Accessories", "ICC", { mRating: "M10", insulation: "Insulated", coating: "Nickel-Coated" })).toBe("ICC/M10/INSULATED/NICKEL-COATED");
        expect(generateTemplatedItemCode("Legacy", "Copper", { diameter: "12" })).toBeUndefined();
    });

    it("generates all conditional catalog code formats without empty tokens", () => {
        expect(generateTemplatedItemCode("Battery Accessories", "Shrouds", { type: "Linear", numberOfPoles: "6" })).toBe("Shrouds/L/6");
        expect(generateTemplatedItemCode("Battery Accessories", "Shrouds", { type: "Horizontal", numberOfPoles: "" })).toBe("Shrouds/H");
        expect(generateTemplatedItemCode("Lugs", "Lug", { type: "Pin", insulation: "Non-Insulated", material: "Copper", cableSize: "10", studHole: "" })).toBe("Lug/PIN/NI/Cu/10");
        expect(generateTemplatedItemCode("Battery Chargers", "Battery Charger", { chargerType: "FCBC", technology: "SCR", regulationType: "CC", voltage: "96", current: "200" })).toBe("FCBC/SCR/CC/96V/200A");
        expect(generateTemplatedItemCode("Battery Chargers", "Battery Charger", { chargerType: "FCBC", technology: "IGBT", regulationType: "CV", voltage: "48", current: "100", pulse: "12" })).toBe("FCBC/IGBT/CV/48V/100A/12");
        expect(generateTemplatedItemCode("Battery Chargers", "Battery Charger", { chargerType: "FCBC", technology: "SMPS", regulationType: "CC", voltage: "110", current: "200", moduleType: "Modular" })).toBe("FCBC/SMPS/CC/110V/200A/M");
    });

    it.each([
        ["Battery Accessories", "IPP", { numberOfPoles: "3", mRating: "M10", insulation: "Insulated", coating: "Tin-Coated" }, "IPP/3/M10/INSULATED/TIN-COATED"],
        ["Battery Accessories", "Vent Plug", { mRating: "M20", type: "Vented" }, "Vent/M20/VENTED"],
        ["Battery Accessories", "Electrolyte", { type: "DM Water" }, "Electrolyte/DM-WATER"],
        ["Battery Accessories", "Cell Lifter", { type: "Non-Insulated" }, "CellLifter/NI"],
        ["Battery Accessories", "Battery Stand", { material: "MS", steps: "4", tiers: "2", colourCode: "RED-1" }, "BStand/MS/4/2/RED-1"],
        ["Battery Accessories", "Battery Terminal Box", { numberOfPoles: "6", mRating: "M20" }, "BTerminal/6/M20"],
        ["Battery Accessories", "PP Sheet", { thickness: "2", dimensions: "1000 x 2000 mm" }, "PPSheet/2/1000-X-2000-MM"],
        ["Testing & Measuring Instruments", "Multimeter", { measurementType: "AC-DC", voltageRange: "600", currentRange: "10" }, "Multimeter/AC-DC/600/10"],
        ["Testing & Measuring Instruments", "Clamp Meter", { measurementType: "DC", voltageRange: "1000", currentRange: "400" }, "ClampMeter/DC/1000/400"],
        ["Testing & Measuring Instruments", "Torque Wrench", { torqueRange: "20-100" }, "TorqueWrench/20-100"],
        ["Testing & Measuring Instruments", "Thermometer", {}, "Thermometer"],
        ["Testing & Measuring Instruments", "Thermometer Stand", {}, "ThermometerStand"],
        ["Testing & Measuring Instruments", "Temperature Gun", {}, "TemperatureGun"],
        ["Testing & Measuring Instruments", "Hydrometer", {}, "Hydrometer"],
        ["Testing & Measuring Instruments", "Hydrometer Stand", {}, "HydrometerStand"],
        ["Testing & Measuring Instruments", "Earth Fault Locator", {}, "EarthFaultLocator"],
        ["Testing & Measuring Instruments", "Impedance Tester", {}, "ImpedanceTester"],
        ["Hardware & Fasteners", "Washer", { type: "Belleville", material: "SS", mRating: "M10" }, "Washer/B/SS/M10"],
        ["Hardware & Fasteners", "Bolt", { material: "GI", mRating: "M20", length: "25" }, "Bolt/GI/M20/25"],
        ["Hardware & Fasteners", "Nut", { material: "SS", mRating: "M10" }, "Nut/SS/M10"],
        ["Solar Power", "SPV (Solar Photovoltaic)", { type: "Mono Perc (MP)", manufacturing: "Non-DCR", wattage: "600" }, "SPV/MP/ND/600"],
        ["Solar Power", "MC4 Connector (in Pairs)", {}, "MC4"],
        ["Solar Power", "Earthing Insulator", {}, "EarthingInsulator"],
        ["Cables", "Cable", { currentType: "DC", voltage: "11 KV HT", material: "Aluminium", armouring: "Unarmoured", fireRating: "LSZH", cores: "4", thickness: "2.5" }, "Cable/DC/11HT/Al/UA/LSZH/4/2.5"],
        ["Lugs", "Lug", { type: "Ring", insulation: "Insulated", material: "Copper", cableSize: "25", studHole: "10" }, "Lug/RING/I/Cu/25/10"],
        ["Ferrules", "Ferrule", { type: "Alphabet" }, "Ferrule/A"],
    ])("generates the configured code for %s / %s", (category, itemName, specifications, expected) => {
        expect(generateTemplatedItemCode(category as string, itemName as string, specifications as Record<string, string>)).toBe(expected);
    });

    it("requires the conditional fields only when visible and validates ranges", () => {
        expect(validateCatalogItemValues("Battery Chargers", "Battery Charger", null, {
            chargerType: "FCBC", technology: "IGBT", regulationType: "CC", voltage: "48", current: "10", moduleType: "Modular",
        })).toBe("Pulse is required");
        expect(validateCatalogItemValues("Battery Chargers", "Battery Charger", null, {
            chargerType: "FCBC", technology: "SCR", regulationType: "CC", voltage: "48", current: "10", moduleType: "Modular", pulse: "6",
        })).toMatch(/Pulse is not available/);
        expect(validateCatalogItemValues("UPS", "UPS", null, {
            topology: "Online (Double Conversion)", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%",
        })).toBeUndefined();
        expect(validateCatalogItemValues("UPS", "UPS", null, {
            topology: "Offline", outputPowerFactor: "0.9", phaseConfiguration: "3/3", efficiency: "95%", zeroTransferTime: "No",
        })).toMatch(/Zero Transfer Time is not available/);
        expect(validateCatalogItemValues("Testing & Measuring Instruments", "Multimeter", null, {
            measurementType: "AC", voltageRange: "0", currentRange: "1",
        })).toBe("Voltage Range (V) must be greater than 0");
        expect(validateCatalogItemValues("Batteries", "Ni-Cd Battery", null, {
            type: "KP", discharge: "L", capacity: "0",
        })).toBe("Capacity must be greater than 0");
    });

    it("rejects unknown attribute keys", () => {
        expect(validateCatalogItemValues("Batteries", "Ni-Cd Battery", null, {
            type: "KP", discharge: "L", capacity: "100", madeUp: "value",
        })).toMatch(/Unknown specification key/);
    });

    it.each(["0009997", "2232", "122332"])("accepts HSN %s and strips client-controlled fields", hsnCode => {
        const parsed = itemSchema.parse({ ...payload({ hsnCode, createdBy: 99, updatedBy: 88, itemCode: "CLIENT-CODE" }) });
        expect(parsed.hsnCode).toBe(hsnCode);
        expect(parsed).not.toHaveProperty("createdBy");
        expect(parsed).not.toHaveProperty("updatedBy");
        expect(parsed).not.toHaveProperty("itemCode");
    });

    it.each(["123", "123456789", "12A4"])("rejects invalid create HSN %s", hsnCode => {
        expect(() => itemSchema.parse(payload({ hsnCode }))).toThrow();
    });

    it("allows partial updates without HSN and rejects invalid included HSN", () => {
        expect(updateItemSchema.parse({ isActive: false })).toEqual({ isActive: false });
        expect(() => updateItemSchema.parse({ hsnCode: "123" })).toThrow();
    });
});

describe("Item Master create, update, and audit behavior", () => {
    it("generates and stores a catalog code and authenticated audit IDs, ignoring the body creator", async () => {
        const { service, inserted } = serviceForCrud();
        const parsed = itemSchema.parse(payload({ createdBy: 999, updatedBy: 888 }));
        const result = await service.create(parsed, 42);
        expect(inserted()).toMatchObject({
            itemCode: "NICD/KP/L/100", teamId: null, createdBy: 42, updatedBy: 42,
            category: "Batteries", hsnCode: "0009997",
        });
        expect(inserted()).not.toHaveProperty("createdBy", 999);
        expect(result.createdByName).toBe("Creator");
    });

    it("uses the exact configured static code for an unparameterized catalog item", async () => {
        const { service, inserted } = serviceForCrud();
        await service.create(itemSchema.parse(payload({
            category: "Battery Accessories", itemName: "Eye Wash Bottle", specifications: {},
        })), 7);
        expect(inserted()).toMatchObject({ itemCode: "EyeWashBottle", category: "Battery Accessories" });
    });

    it("creates an AC copper fitting with the configured code and no conversion", async () => {
        const { service, inserted } = serviceForCrud();
        await service.create(itemSchema.parse(payload({
            category: "AC Accessories", itemName: "Copper", itemType: "Elbow",
            specifications: { type: "Elbow", diameter: "12", thickness: "1", strength: "Hard" },
            unit: "Nos.", hsnCode: "123456",
        })), 7);
        expect(inserted()).toMatchObject({ itemCode: "CU/Elbow/H/1/12", itemType: "Elbow", conversionUnit: null });
    });

    it("allows blank HSN only for definitions marked not applicable", async () => {
        const { service, inserted } = serviceForCrud();
        const body = itemSchema.parse(payload({ category: "Battery Accessories", itemName: "Eye Wash Bottle", specifications: {}, hsnCode: "" }));
        await service.create(body, 7);
        expect(inserted()).toMatchObject({ itemCode: "EyeWashBottle", hsnCode: null });
    });

    it("keeps UPS unavailable until its code and mandatory fields are finalized", async () => {
        const { service } = serviceForCrud();
        const body = itemSchema.parse(payload({ category: "UPS", itemName: "UPS", specifications: {} }));
        await expect(service.create(body, 7)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("uses the existing sequence code for an item without a code template", async () => {
        const { service, inserted } = serviceForCrud();
        await service.create(itemSchema.parse(payload({
            category: "Glands", itemName: "Gland", specifications: {},
        })), 7);
        expect(inserted()).toMatchObject({ itemCode: "ITM-0007" });
    });

    it("reports an existing templated code in duplicate conflicts", async () => {
        const duplicate = row({ itemCode: "NICD/KP/L/100", itemName: "Ni-Cd Battery", category: "Batteries", unit: "Nos.", specifications: { type: "KP", discharge: "L", capacity: "100" } });
        const { service } = serviceForCrud({ candidates: [duplicate] });
        await expect(service.create(itemSchema.parse(payload()), 7))
            .rejects.toThrow("code NICD/KP/L/100");
    });

    it("reports the existing code for an untemplated name, brand and unit duplicate", async () => {
        const duplicate = row({ itemCode: "ITM-0042", category: "Battery Accessories", itemName: "Eye Wash Bottle", makeBrand: "Acme", unit: "Nos.", specifications: {} });
        const { service } = serviceForCrud({ candidates: [duplicate] });
        await expect(service.create(itemSchema.parse(payload({
            category: "Battery Accessories", itemName: "Eye Wash Bottle", specifications: {}, makeBrand: "Acme",
        })), 7)).rejects.toThrow("code ITM-0042");
    });

    it("lists Legacy rows with their unchanged code and the Created By fallback", async () => {
        const legacy = row({ createdByName: "—" });
        let selection = 0;
        const db = {
            select: () => {
                selection += 1;
                return { from: () => ({
                    leftJoin: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: async () => [legacy] }) }) }) }),
                    where: () => ({ then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve([{ count: 1 }]).then(resolve, reject) }),
                }) };
            },
        };
        const result = await new InventoryItemsService(db as never).findAll({ page: 1 });
        expect(result.data[0]).toMatchObject({ itemCode: "ITM-0001", category: null, createdByName: "—" });
        expect(result.meta.total).toBe(1);
        expect(selection).toBe(2);
    });

    it("leaves a Legacy item code and team unchanged and sets updatedBy on edit", async () => {
        const existing = row({ hsnCode: null, createdBy: 13, teamId: 5 });
        const { service, updated } = serviceForCrud({ existing });
        const result = await service.update(1, updateItemSchema.parse({ description: "Updated description" }), 42);
        expect(updated()).toMatchObject({ description: "Updated description", updatedBy: 42 });
        expect(updated()).not.toHaveProperty("teamId");
        expect(updated()).not.toHaveProperty("createdBy");
        expect(result.itemCode).toBe("ITM-0001");
    });

    it("regenerates catalog item codes when code-forming fields change", async () => {
        const existing = row({
            itemCode: "NICD/KP/L/100", category: "Batteries", itemName: "Ni-Cd Battery",
            itemType: null, unit: "Nos.", specifications: { type: "KP", discharge: "L", capacity: "100" },
        });
        const { service, updated } = serviceForCrud({ existing });
        await service.update(1, { specifications: { type: "RGS", discharge: "L", capacity: "100" } }, 42);
        expect(updated()).toMatchObject({ itemCode: "NICD/RGS/L/100" });
    });
});
