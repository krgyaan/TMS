import { buildCollectionExportRequest, buildImportMastersRequest, escapeXml, formatTallyDate } from "./xml-builder";

describe("escapeXml", () => {
    it("escapes all five XML metacharacters", () => {
        expect(escapeXml(`A & B < C > D "E" 'F'`)).toBe("A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;");
    });

    it("leaves ordinary text untouched", () => {
        expect(escapeXml("Site Expenses")).toBe("Site Expenses");
    });
});

describe("formatTallyDate", () => {
    it("formats as YYYYMMDD", () => {
        expect(formatTallyDate(new Date(2026, 0, 5))).toBe("20260105");
        expect(formatTallyDate(new Date(2026, 11, 31))).toBe("20261231");
    });
});

describe("buildCollectionExportRequest", () => {
    it("builds an Export/Collection envelope with company and methods", () => {
        const xml = buildCollectionExportRequest({
            collectionName: "TMS Ledger list",
            objectType: "LEDGER",
            nativeMethods: ["Name", "Parent"],
            variables: { company: "VEPL & Co" },
        });

        expect(xml).toContain("<ENVELOPE>");
        expect(xml).toContain("<TALLYREQUEST>Export</TALLYREQUEST>");
        expect(xml).toContain("<TYPE>Collection</TYPE>");
        expect(xml).toContain("<ID>TMS Ledger list</ID>");
        expect(xml).toContain('<COLLECTION NAME="TMS Ledger list">');
        expect(xml).toContain("<TYPE>LEDGER</TYPE>");
        expect(xml).toContain("<NATIVEMETHOD>Name</NATIVEMETHOD>");
        expect(xml).toContain("<SVCURRENTCOMPANY>VEPL &amp; Co</SVCURRENTCOMPANY>");
        expect(xml).toContain("<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>");
    });

    it("omits the company variable for the company list request", () => {
        const xml = buildCollectionExportRequest({
            collectionName: "List of Companies",
            objectType: "Company",
            nativeMethods: ["Name"],
        });

        expect(xml).not.toContain("<SVCURRENTCOMPANY>");
    });
});

describe("buildImportMastersRequest", () => {
    it("builds an Import/Data envelope for All Masters", () => {
        const xml = buildImportMastersRequest(['<LEDGER NAME="A" ACTION="Create"><NAME>A</NAME></LEDGER>'], {
            company: "VEPL",
        });

        expect(xml).toContain("<TALLYREQUEST>Import</TALLYREQUEST>");
        expect(xml).toContain("<TYPE>Data</TYPE>");
        expect(xml).toContain("<ID>All Masters</ID>");
        expect(xml).toContain("<REPORTNAME>All Masters</REPORTNAME>");
        expect(xml).toContain('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
        expect(xml).toContain("<SVCURRENTCOMPANY>VEPL</SVCURRENTCOMPANY>");
        expect(xml).toContain('ACTION="Create"');
    });

    it("refuses an empty import", () => {
        expect(() => buildImportMastersRequest([])).toThrow(/At least one master/);
    });
});
