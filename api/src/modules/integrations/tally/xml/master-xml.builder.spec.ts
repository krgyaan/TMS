import { buildMasterCollectionRequest, buildMasterMessage } from "./master-xml.builder";

describe("buildMasterMessage", () => {
    it("builds a group create fragment", () => {
        const xml = buildMasterMessage({ kind: "group", name: "Employee Payables", parent: "Current Liabilities" });

        expect(xml).toBe('<GROUP NAME="Employee Payables" ACTION="Create"><NAME>Employee Payables</NAME><PARENT>Current Liabilities</PARENT></GROUP>');
    });

    it("builds a ledger create fragment", () => {
        const xml = buildMasterMessage({ kind: "ledger", name: "Site Expenses", parent: "Indirect Expenses" });

        expect(xml).toContain('<LEDGER NAME="Site Expenses" ACTION="Create">');
        expect(xml).toContain("<PARENT>Indirect Expenses</PARENT>");
    });

    it("builds a cost centre create fragment", () => {
        const xml = buildMasterMessage({ kind: "costCentre", name: "HO/2526/VEPL/OE", parent: "Primary" });

        expect(xml).toContain('<COSTCENTRE NAME="HO/2526/VEPL/OE" ACTION="Create">');
        expect(xml).toContain("<PARENT>Primary</PARENT>");
    });

    it("escapes names and parents", () => {
        const xml = buildMasterMessage({
            kind: "ledger",
            name: `R&D <Site> "Exp" 'A'`,
            parent: `A & B`,
        });

        expect(xml).toContain('NAME="R&amp;D &lt;Site&gt; &quot;Exp&quot; &apos;A&apos;"');
        expect(xml).toContain("<PARENT>A &amp; B</PARENT>");
        expect(xml).not.toContain("<Site>");
    });

    it("omits an empty parent", () => {
        const xml = buildMasterMessage({ kind: "group", name: "X" });

        expect(xml).not.toContain("<PARENT>");
    });

    it("rejects an empty name", () => {
        expect(() => buildMasterMessage({ kind: "ledger", name: "   " })).toThrow(/must not be empty/);
    });

    it("rejects an unsupported kind", () => {
        expect(() => buildMasterMessage({ kind: "voucher" as never, name: "X" })).toThrow(/Unsupported master kind/);
    });
});

describe("buildMasterCollectionRequest", () => {
    it("lists the requested master type for the configured company", () => {
        const xml = buildMasterCollectionRequest("costCentre", { company: "VEPL" });

        expect(xml).toContain("<TYPE>COSTCENTRE</TYPE>");
        expect(xml).toContain("<NATIVEMETHOD>Parent</NATIVEMETHOD>");
        expect(xml).toContain("<SVCURRENTCOMPANY>VEPL</SVCURRENTCOMPANY>");
    });

    it("requests GUIDs for ledgers", () => {
        const xml = buildMasterCollectionRequest("ledger");

        expect(xml).toContain("<NATIVEMETHOD>GUID</NATIVEMETHOD>");
    });
});
