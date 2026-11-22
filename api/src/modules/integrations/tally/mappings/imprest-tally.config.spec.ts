import {
    IMPREST_TALLY_CONFIG,
    isBlockedCategory,
    resolveCategoryLedger,
    resolveCostCentre,
    resolveEmployeeLedger,
    resolveEmployeePayableGroup,
    type ImprestTallyConfig,
} from "./imprest-tally.config";

const config: ImprestTallyConfig = {
    employeePayableGroup: "Employee Payables",
    categoryLedgers: {
        5: { ledger: "  Site   Expenses ", group: "Indirect Expenses" },
    },
    blockedCategoryIds: [22, 8],
    employeeLedgers: {
        7: "Ravi Kumar Imprest",
    },
};

describe("resolveCostCentre", () => {
    it("uses the TMS project code as the cost-centre name", () => {
        expect(resolveCostCentre("HO/2526/VEPL/OE")).toBe("HO/2526/VEPL/OE");
    });

    it("normalises whitespace and rejects blanks", () => {
        expect(resolveCostCentre("  HO/2526/VEPL/OE  ")).toBe("HO/2526/VEPL/OE");
        expect(resolveCostCentre("   ")).toBeNull();
        expect(resolveCostCentre(null)).toBeNull();
        expect(resolveCostCentre(undefined)).toBeNull();
    });
});

describe("category mapping", () => {
    it("resolves a configured category and normalises the ledger", () => {
        expect(resolveCategoryLedger(config, 5)).toEqual({ ledger: "Site Expenses", group: "Indirect Expenses" });
    });

    it("does not guess an unknown category", () => {
        expect(resolveCategoryLedger(config, 999)).toBeNull();
        expect(resolveCategoryLedger(config, null)).toBeNull();
    });

    it("flags the blocked transfer and insurance categories", () => {
        expect(isBlockedCategory(config, 22)).toBe(true);
        expect(isBlockedCategory(config, 8)).toBe(true);
        expect(isBlockedCategory(config, 5)).toBe(false);
        expect(isBlockedCategory(config, null)).toBe(false);
    });

    it("ships with the transfer and insurance categories blocked", () => {
        expect(IMPREST_TALLY_CONFIG.blockedCategoryIds).toEqual(expect.arrayContaining([22, 8]));
    });
});

describe("employee ledger", () => {
    it("prefers the configured override", () => {
        expect(resolveEmployeeLedger(config, 7, "Someone Else")).toBe("Ravi Kumar Imprest");
    });

    it("falls back to the employee name", () => {
        expect(resolveEmployeeLedger(config, 9, "  Asha   Rao ")).toBe("Asha Rao");
    });

    it("returns null when neither is usable", () => {
        expect(resolveEmployeeLedger(config, null, null)).toBeNull();
        expect(resolveEmployeeLedger(config, 9, "   ")).toBeNull();
    });

    it("exposes the payable group with a safe default", () => {
        expect(resolveEmployeePayableGroup(config)).toBe("Employee Payables");
        expect(resolveEmployeePayableGroup({ ...config, employeePayableGroup: "  " })).toBe("Employee Payables");
    });
});
