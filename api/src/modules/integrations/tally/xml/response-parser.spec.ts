import { TallyCompanyNotOpen, TallyLineError, TallyProtocolError } from "../errors/tally.errors";
import { assertEnvelopeOk, parseCompanyNames, parseImportResult, parseLivenessBanner, parseMasterList, parseResponse } from "./response-parser";

const envelope = (body: string, status = "1"): string => `<ENVELOPE><HEADER><VERSION>1</VERSION><STATUS>${status}</STATUS></HEADER><BODY>${body}</BODY></ENVELOPE>`;

const importResult = (options: { created?: number; errors?: number; lineError?: string }): string =>
    envelope(
        `<DATA><IMPORTRESULT><CREATED>${options.created ?? 0}</CREATED><ALTERED>0</ALTERED><IGNORED>0</IGNORED><ERRORS>${
            options.errors ?? 0
        }</ERRORS><CANCELLED>0</CANCELLED><LINEERROR>${options.lineError ?? ""}</LINEERROR></IMPORTRESULT></DATA>`
    );

describe("parseResponse", () => {
    it("parses an envelope and header status", () => {
        const parsed = parseResponse(envelope("<DATA></DATA>"));

        expect(parsed.root).toBe("ENVELOPE");
        expect(parsed.status).toBe(1);
        expect(parsed.version).toBe("1");
    });

    it("accepts a RESPONSE root", () => {
        const parsed = parseResponse("<RESPONSE><HEADER><STATUS>1</STATUS></HEADER><BODY><DATA></DATA></BODY></RESPONSE>");

        expect(parsed.root).toBe("RESPONSE");
        expect(parsed.status).toBe(1);
    });

    it("rejects an empty body as company-not-open", () => {
        expect(() => parseResponse("   ")).toThrow(TallyCompanyNotOpen);
    });

    it("rejects an HTML body", () => {
        expect(() => parseResponse("<html><body>502 Bad Gateway</body></html>")).toThrow(TallyProtocolError);
    });

    it("rejects a non-envelope root element", () => {
        expect(() => parseResponse("<FOO><BAR>1</BAR></FOO>")).toThrow(/unexpected root element \(FOO\)/);
    });

    it("rejects truncated XML", () => {
        expect(() => parseResponse("<ENVELOPE><HEADER><VERSION>1</VERSION>")).toThrow(/malformed or truncated/);
    });

    it("rejects DOCTYPE/ENTITY declarations before parsing", () => {
        expect(() => parseResponse('<!DOCTYPE ENVELOPE [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><ENVELOPE></ENVELOPE>')).toThrow(/DOCTYPE\/ENTITY/);
    });

    it("assertEnvelopeOk rejects a non-success status", () => {
        expect(() => assertEnvelopeOk(parseResponse(envelope("<DATA></DATA>", "0")))).toThrow(/STATUS=0/);
    });
});

describe("parseImportResult", () => {
    it("reads a successful create", () => {
        const result = parseImportResult(importResult({ created: 1 }));

        expect(result.created).toBe(1);
        expect(result.errors).toBe(0);
        expect(result.lineErrors).toEqual([]);
        expect(result.alreadyExists).toBe(false);
    });

    it("throws TallyLineError with the Tally message", () => {
        expect(() => parseImportResult(importResult({ errors: 1, lineError: "Ledger 'Site Expenses' does not exist!" }))).toThrow(TallyLineError);

        try {
            parseImportResult(importResult({ errors: 1, lineError: "Ledger 'Site Expenses' does not exist!" }));
        } catch (error) {
            expect((error as Error).message).toContain("does not exist");
        }
    });

    it('treats "already exists" as success when asked', () => {
        const xml = importResult({ errors: 1, lineError: "Ledger 'Site Expenses' already exists!" });

        const result = parseImportResult(xml, { treatAlreadyExistsAsSuccess: true });

        expect(result.alreadyExists).toBe(true);
        expect(result.errors).toBe(1);
    });

    it('still throws for "already exists" when not asked', () => {
        const xml = importResult({ errors: 1, lineError: "Ledger 'Site Expenses' already exists!" });

        expect(() => parseImportResult(xml)).toThrow(TallyLineError);
    });

    it("does not swallow other errors mixed with already-exists", () => {
        const xml = envelope(
            `<DATA><IMPORTRESULT><CREATED>0</CREATED><ERRORS>2</ERRORS><LINEERROR>Ledger 'A' already exists!</LINEERROR><LINEERROR>Voucher date out of range</LINEERROR></IMPORTRESULT></DATA>`
        );

        expect(() => parseImportResult(xml, { treatAlreadyExistsAsSuccess: true })).toThrow(/out of range/);
    });

    it("rejects an import with STATUS=0 and no line errors", () => {
        const xml = envelope("<DATA><IMPORTRESULT><CREATED>0</CREATED><ERRORS>0</ERRORS></IMPORTRESULT></DATA>", "0");

        expect(() => parseImportResult(xml)).toThrow(/STATUS=0/);
    });
});

describe("parseMasterList", () => {
    it("reads a single master object", () => {
        const xml = envelope('<DATA><TALLYMESSAGE><LEDGER NAME="Site Expenses"><NAME>Site Expenses</NAME><PARENT>Indirect Expenses</PARENT></LEDGER></TALLYMESSAGE></DATA>');

        expect(parseMasterList(xml, "ledger")).toEqual([{ name: "Site Expenses", parent: "Indirect Expenses", guid: null }]);
    });

    it("reads the ledger GUID when present", () => {
        const xml = envelope(
            '<DATA><TALLYMESSAGE><LEDGER NAME="Site Expenses"><NAME>Site Expenses</NAME><PARENT>Indirect Expenses</PARENT><GUID>abc-123</GUID></LEDGER></TALLYMESSAGE></DATA>'
        );

        expect(parseMasterList(xml, "ledger")).toEqual([{ name: "Site Expenses", parent: "Indirect Expenses", guid: "abc-123" }]);
    });

    it("reads an array of masters and de-duplicates by name", () => {
        const xml = envelope(
            "<DATA><TALLYMESSAGE>" +
                '<LEDGER NAME="A"><NAME>A</NAME><PARENT>P</PARENT></LEDGER>' +
                '<LEDGER NAME="B"><NAME>B</NAME><PARENT>P</PARENT></LEDGER>' +
                '<LEDGER NAME="a"><NAME>a</NAME><PARENT>P</PARENT></LEDGER>' +
                "</TALLYMESSAGE></DATA>"
        );

        const records = parseMasterList(xml, "ledger");

        expect(records).toHaveLength(2);
        expect(records.map(record => record.name)).toEqual(["A", "B"]);
    });

    it("returns an empty list when no masters exist", () => {
        expect(parseMasterList(envelope("<DATA></DATA>"), "group")).toEqual([]);
    });

    it("rejects a non-success envelope", () => {
        expect(() => parseMasterList(envelope("<DATA></DATA>", "0"), "group")).toThrow(/STATUS=0/);
    });
});

describe("parseCompanyNames", () => {
    it("reads company names from NAME elements and NAME attributes", () => {
        const xml = envelope('<DATA><COLLECTION><COMPANY NAME="VEPL"><NAME>VEPL</NAME></COMPANY><COMPANY NAME="Other Co"/></COLLECTION></DATA>');

        expect(parseCompanyNames(xml)).toEqual(["VEPL", "Other Co"]);
    });

    it("returns an empty list when no company is open", () => {
        expect(parseCompanyNames(envelope("<DATA><COLLECTION></COLLECTION></DATA>"))).toEqual([]);
    });

    it("rejects a liveness banner where a company list is expected", () => {
        expect(() => parseCompanyNames("<RESPONSE>TallyPrime Server is Running</RESPONSE>")).toThrow(/RESPONSE banner/);
    });
});

describe("parseLivenessBanner", () => {
    it("recognises the proxy banner", () => {
        expect(parseLivenessBanner("<RESPONSE>TallyPrime Server is Running</RESPONSE>")).toEqual({
            running: true,
            message: "TallyPrime Server is Running",
        });
    });

    it("reports an unrecognised banner without throwing", () => {
        expect(parseLivenessBanner("<RESPONSE>Something else</RESPONSE>")).toEqual({
            running: false,
            message: "Something else",
        });
    });

    it("rejects HTML, empty bodies and non-RESPONSE roots", () => {
        expect(() => parseLivenessBanner("<html></html>")).toThrow(TallyProtocolError);
        expect(() => parseLivenessBanner("")).toThrow(TallyProtocolError);
        expect(() => parseLivenessBanner("<ENVELOPE></ENVELOPE>")).toThrow(/unexpected root/);
    });
});
