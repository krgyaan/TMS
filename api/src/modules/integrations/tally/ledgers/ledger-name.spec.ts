import { normalizeEmployeeCode, normalizeLedgerName, parseEmployeeLedgerName, roleFromSuffix } from "./ledger-name";

describe("parseEmployeeLedgerName", () => {
    it("parses the three employee ledger roles", () => {
        expect(parseEmployeeLedgerName("PIYUSH GOYAL (VEP001) Imprest")).toEqual({
            displayName: "PIYUSH GOYAL",
            employeeCode: "VEP001",
            normalizedEmployeeCode: "VE001",
            role: "imprest",
        });
        expect(parseEmployeeLedgerName("PIYUSH GOYAL (VEP001) Salary A/c")?.role).toBe("salary");
        expect(parseEmployeeLedgerName("PIYUSH GOYAL (VEP001) Salary Payable A/c")?.role).toBe("salary_payable");
    });

    it("normalises whitespace and is case-insensitive", () => {
        expect(parseEmployeeLedgerName("  piyush   goyal   (vep001)   salary  payable  a/c ")).toMatchObject({
            displayName: "piyush goyal",
            role: "salary_payable",
        });
    });

    it("ignores ledgers that are not employee ledgers", () => {
        expect(parseEmployeeLedgerName("Site Expenses")).toBeNull();
        expect(parseEmployeeLedgerName("PIYUSH GOYAL (VEP001) Loan A/c")).toBeNull();
        expect(parseEmployeeLedgerName("PIYUSH GOYAL Imprest")).toBeNull();
    });
});

describe("normalizeEmployeeCode", () => {
    it("maps Tally VEP codes onto the TMS VE format", () => {
        expect(normalizeEmployeeCode("vep001")).toBe("VE001");
        expect(normalizeEmployeeCode("VE001")).toBe("VE001");
        expect(normalizeEmployeeCode(" VEP046 ")).toBe("VE046");
    });
});

describe("roleFromSuffix", () => {
    it("recognises only the supported suffixes", () => {
        expect(roleFromSuffix("Imprest")).toBe("imprest");
        expect(roleFromSuffix("Salary A/c")).toBe("salary");
        expect(roleFromSuffix("Salary Payable A/c")).toBe("salary_payable");
        expect(roleFromSuffix("Loan A/c")).toBeNull();
    });
});

describe("normalizeLedgerName", () => {
    it("collapses whitespace and lowercases", () => {
        expect(normalizeLedgerName("  Site   Expenses ")).toBe("site expenses");
    });
});
