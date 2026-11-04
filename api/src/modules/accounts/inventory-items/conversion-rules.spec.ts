import { CONVERSION_RULES, getConversionRule } from "./conversion-rules";

describe("inventory item conversion rules", () => {
    it("allows only configured pairs", () => {
        expect(getConversionRule("Mtr", "Ft")?.factor).toBe(3.28084);
        expect(getConversionRule("Nos.", "Kg")).toBeUndefined();
        expect(CONVERSION_RULES.filter(rule => rule.from === "RMtr").map(rule => rule.to)).toEqual(["Sq. Mtr."]);
    });
});
