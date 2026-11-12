import { CONVERSION_RULES, getConversionOptions, getConversionRule, resolveConversion } from "./conversion-rules";

describe("inventory item conversion rules", () => {
    it("allows only configured pairs", () => {
        expect(getConversionRule("Mtr", "Ft")?.factor).toBe(3.28084);
        expect(getConversionRule("Nos.", "Kg")).toBeUndefined();
        expect(CONVERSION_RULES.filter(rule => rule.from === "RMtr").map(rule => rule.to)).toEqual(["Sq. Mtr."]);
    });

    it.each([["Mtr", "Ft", "3.28084"], ["Ft", "Mtr", "0.3048"]])("uses fixed factors for %s to %s", (from, to, factor) => {
        expect(resolveConversion(from, to, "999", {}).conversionFactor).toBe(factor);
    });

    it("derives RMtr conversion from a parseable Width spec in millimetres", () => {
        expect(resolveConversion("RMtr", "Sq. Mtr.", "77", { width: "900 mm" }).conversionFactor).toBe("0.9");
        expect(resolveConversion("Sq. Mtr.", "RMtr", "77", { width: "1200 mm" }).conversionFactor).toBe(String(1000 / 1200));
    });

    it("returns valid targets and factor modes for the Settings form", () => {
        expect(getConversionOptions("Mtr", {})).toEqual([
            { to: "Kg", factor: null, factorMode: "manual" },
            { to: "Ft", factor: 3.28084, factorMode: "fixed" },
        ]);
        expect(getConversionOptions("RMtr", { width: "1000 mm" })).toEqual([
            { to: "Sq. Mtr.", factor: 1, factorMode: "width" },
        ]);
    });

    it("uses the submitted factor if Width is missing or malformed", () => {
        expect(resolveConversion("RMtr", "Sq. Mtr.", "1.25", {}).conversionFactor).toBe("1.25");
        expect(resolveConversion("RMtr", "Sq. Mtr.", "1.25", { width: "wide" }).conversionFactor).toBe("1.25");
        expect(resolveConversion("RMtr", "Sq. Mtr.", "1.0000000000", {}).conversionFactor).toBe("1");
    });

    it.each(["0", "-1", "1.1234567", "1e-3"]) ("rejects invalid manual factor %s", factor => {
        expect(() => resolveConversion("Kg", "Mtr", factor, {})).toThrow();
    });

    it("rejects manual and width-derived factors outside the database numeric range", () => {
        expect(() => resolveConversion("Kg", "Mtr", "10000000000", {})).toThrow(/less than 10000000000/);
        expect(() => resolveConversion("Sq. Mtr.", "RMtr", null, { width: "0.00000001 mm" })).toThrow(/less than 10000000000/);
    });

    it("rejects identical or unconfigured pairs and incomplete conversion data", () => {
        expect(() => resolveConversion("Mtr", "Mtr", null, {})).toThrow();
        expect(() => resolveConversion("Nos.", "Kg", "1", {})).toThrow();
        expect(() => resolveConversion("Kg", undefined, "1", {})).toThrow();
        expect(() => resolveConversion("Kg", "Mtr", null, {})).toThrow();
    });
});
