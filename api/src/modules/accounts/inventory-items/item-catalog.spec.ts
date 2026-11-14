import { AC_ITEM_CATALOG, DC_ITEM_CATALOG, getAllowedConversionPairs, getAllowedUnits } from "./item-catalog";
import { generateTemplatedItemCode } from "./item-code-generator";
import { validateCatalogItemValues } from "./item-catalog-validation";

const category = "AC Accessories";
const acExamples: [string, Record<string, string>, string][] = [
    ["Copper", { type: "Pipe", diameter: "12", thickness: "0.5", strength: "Hard" }, "CU/Pipe/H/0.5/12"],
    ["Copper", { type: "Elbow", diameter: "12", thickness: "1", strength: "Soft" }, "CU/Elbow/S/1/12"],
    ["PVC Pipe", { type: "Pipe", diameter: "20", thickness: "40", strength: "Hard" }, "PVC/Pipe/H/40/20"],
    ["UPVC Pipe", { type: "Tee", diameter: "25", thickness: "50", strength: "Soft" }, "UPVC/Tee/S/50/25"],
    ["CPVC Pipe", { type: "Pipe", diameter: "32", thickness: "11", strength: "Hard" }, "CPVC/Pipe/H/11/32"],
    ["MS", { type: "Reducer", diameter: "40", thickness: "12", strength: "Soft" }, "MS/Reducer/S/12/40"],
    ["Sleeve Insulation", { diameter: "20", thickness: "10", class: "1" }, "SI/1/20/10"],
    ["Round Duct with Aluminium Foil", { construction: "Rigid", insulationStatus: "Insulated", insulationThickness: "25", diameter: "300" }, "RoundDuct/R/I/25"],
    ["GI Duct / MS Duct", { material: "GI", shape: "Rectangular", fabrication: "Factory", thickness: "24", coating: "120" }, "Duct/GI/Re/F/24G/120"],
    ["GI Sheet / MS Sheet", { material: "MS", width: "900 mm", coating: "120", thickness: "24" }, "Sheet/MS/900/120/24"],
    ["Canvas", { type: "Roll" }, "Canvas/R"],
    ["Nitrile Insulation Sheet / XLPE Insulation Sheet", { material: "Nitrile", coating: "Aluminium Foil", class: "1", thickness: "10" }, "InsulationSheet/N/AF/1/10"],
    ["Acoustic Insulation", { type: "Glasswool", thickness: "25" }, "AcousticInsulation/G/25"],
    ["Underdeck Insulation", { type: "Glasswool (Roll)", thickness: "50" }, "UnderdeckInsulation/G-Roll/50"],
    ["Aluminium Perforated Sheet", { thickness: "24" }, "AlPerforatedSheet/24"],
    ["Tissue Paper", { thickness: "10" }, "TissuePaper/10"],
    ["AC Stand", { type: "Powder Coated", mounting: "Wall", size: "18" }, "ACStand/PC/W/18"],
    ["Rubber Pad", { thickness: "3", size: "4" }, "RubberPad/3/4"],
];

describe("AC item catalog", () => {
    it("contains the 18 specified configurations and keeps DC definitions separate", () => {
        const acItems = AC_ITEM_CATALOG[0].items.filter(item => !item.pending && item.name !== "Stand Insulator");
        expect(acItems.length + 1).toBe(18); // Copper Pipe and Copper fittings are separate configurations.
        expect(DC_ITEM_CATALOG.flatMap(group => group.items).some(item => item.name === "Ni-Cd Battery")).toBe(true);
    });

    it("keeps representative DC templates unchanged", () => {
        expect(generateTemplatedItemCode("Batteries", "Ni-Cd Battery", { type: "KP", discharge: "L", capacity: "100" })).toBe("NICD/KPL/100");
        expect(generateTemplatedItemCode("Batteries", "VRLA Battery", { type: "TGel", voltage: "12V", capacity: "200" })).toBe("VRLA/TGEL/12V/200");
        expect(generateTemplatedItemCode("Batteries", "Flooded Lead-Acid (FLA) Battery", { type: "OPzS", capacity: "500" })).toBe("FLA/OPZS/500");
    });

    it.each(acExamples)("generates the specified %s code", (name, specifications, expected) => {
        expect(generateTemplatedItemCode(category, name, specifications)).toBe(expected);
    });

    it("excludes non-applicable insulation thickness and rejects a supplied N/A value", () => {
        const specs = { construction: "Rigid", insulationStatus: "Non-Insulated", diameter: "300" };
        expect(generateTemplatedItemCode(category, "Round Duct with Aluminium Foil", specs)).toBe("RoundDuct/R/NI");
        expect(validateCatalogItemValues(category, "Round Duct with Aluminium Foil", undefined, { ...specs, insulationThickness: "N/A" })).toMatch(/not available/);
        expect(generateTemplatedItemCode(category, "Underdeck Insulation", { type: "Glasswool (Roll)", thickness: "50" })).not.toBe(generateTemplatedItemCode(category, "Underdeck Insulation", { type: "Glasswool (Bag)", thickness: "50" }));
    });

    it("enforces Pipe versus fittings units and conversion availability", () => {
        expect(getAllowedUnits(category, "PVC Pipe", { type: "Pipe" })).toEqual(["Mtr", "Ft"]);
        expect(getAllowedUnits(category, "PVC Pipe", { type: "Elbow" })).toContain("Nos.");
        expect(getAllowedConversionPairs(category, "Copper", { type: "Elbow" })).toEqual([]);
        expect(getAllowedConversionPairs(category, "Copper", { type: "Pipe" })).toContainEqual({ from: "Kg", to: "Ft" });
    });

    it("rejects nonnumeric values and unsupported dropdown values", () => {
        expect(validateCatalogItemValues(category, "Rubber Pad", undefined, { thickness: "three", size: "4" })).toMatch(/must be a number/);
        expect(validateCatalogItemValues(category, "AC Stand", undefined, { type: "Chrome", mounting: "Wall", size: "18" })).toMatch(/invalid option/);
    });

    it("generates all four HVAC codes and validates their numeric attributes", () => {
        const inputs = [
            ["Split AC", "SAC/F/C/1.5T/18000/5", "Fixed Speed", "Cooling", "1.5", "18000", "5"],
            ["Window AC", "WAC/I/HC/1.5T/18000/5", "Inverter", "Hot & Cold", "1.5", "18000", "5"],
            ["Tower AC", "TAC/F/C/2T/24000/3", "Fixed Speed", "Cooling", "2", "24000", "3"],
            ["Cassette AC", "CAC/I/HC/3T/36000/5", "Inverter", "Hot & Cold", "3", "36000", "5"],
        ] as const;
        for (const [name, expected, type, operation, tonnage, btu, starRating] of inputs) {
            const specs = { type, operation, tonnage, btu, starRating };
            expect(generateTemplatedItemCode("HVAC", name, specs)).toBe(expected);
            expect(validateCatalogItemValues("HVAC", name, null, specs)).toBeUndefined();
        }
        expect(validateCatalogItemValues("HVAC", "Split AC", null, { type: "Fixed Speed", operation: "Cooling", tonnage: "one", btu: "18000", starRating: "5" })).toMatch(/Tonnage.*number/);
    });

    it("includes only applicable duct attributes in the code", () => {
        expect(generateTemplatedItemCode("AC Accessories", "GI Duct / MS Duct", { material: "GI", shape: "Round", fabrication: "Hand", thickness: "22", coating: "120" })).toBe("Duct/GI/Rd/H/22G/120");
        expect(generateTemplatedItemCode("AC Accessories", "GI Duct / MS Duct", { material: "MS", shape: "Oval", fabrication: "Factory", thickness: "16", insulationStatus: "Insulated", insulationThickness: "9" })).toBe("Duct/MS/Ov/F/16G/I/9");
        expect(generateTemplatedItemCode("AC Accessories", "GI Duct / MS Duct", { material: "MS", shape: "Rectangular", fabrication: "Factory", thickness: "16" })).toBe("Duct/MS/Re/F/16G");
        expect(generateTemplatedItemCode("AC Accessories", "Round Duct with Aluminium Foil", { construction: "Rigid", insulationStatus: "Non-Insulated", diameter: "300" })).toBe("RoundDuct/R/NI");
    });
});
