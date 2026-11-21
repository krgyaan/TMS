const XML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
};

/** Escapes the five XML metacharacters in text and attribute values. */
export function escapeXml(value: string): string {
    return String(value ?? "").replace(/[&<>"']/g, char => XML_ESCAPES[char] ?? char);
}

/** Tally voucher/master dates use YYYYMMDD. */
export function formatTallyDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
}

export interface TallyStaticVariables {
    company?: string;
    fromDate?: string;
    toDate?: string;
}

function renderStaticVariables(variables: TallyStaticVariables | undefined): string {
    const parts: string[] = ["<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>"];

    if (variables?.company) {
        parts.unshift(`<SVCURRENTCOMPANY>${escapeXml(variables.company)}</SVCURRENTCOMPANY>`);
    }

    if (variables?.fromDate) {
        parts.push(`<SVFROMDATE>${escapeXml(variables.fromDate)}</SVFROMDATE>`);
    }

    if (variables?.toDate) {
        parts.push(`<SVTODATE>${escapeXml(variables.toDate)}</SVTODATE>`);
    }

    return `<STATICVARIABLES>${parts.join("")}</STATICVARIABLES>`;
}

function buildEnvelope(header: string, body: string): string {
    return `<?xml version="1.0" encoding="utf-8"?><ENVELOPE><HEADER>${header}</HEADER><BODY>${body}</BODY></ENVELOPE>`;
}

export interface CollectionExportRequest {
    collectionName: string;
    objectType: string;
    nativeMethods: string[];
    variables?: TallyStaticVariables;
}

/**
 * Builds an `Export / Collection` request. The collection name is declared
 * inline so the request works even when the collection does not exist in Tally.
 */
export function buildCollectionExportRequest(request: CollectionExportRequest): string {
    const { collectionName, objectType, nativeMethods, variables } = request;

    const header = ["<VERSION>1</VERSION>", "<TALLYREQUEST>Export</TALLYREQUEST>", "<TYPE>Collection</TYPE>", `<ID>${escapeXml(collectionName)}</ID>`].join("");

    const methods = nativeMethods.map(method => `<NATIVEMETHOD>${escapeXml(method)}</NATIVEMETHOD>`).join("");

    const body = [
        "<DESC>",
        renderStaticVariables(variables),
        "<TDL><TDLMESSAGE>",
        `<COLLECTION NAME="${escapeXml(collectionName)}">`,
        `<TYPE>${escapeXml(objectType)}</TYPE>`,
        methods,
        "</COLLECTION>",
        "</TDLMESSAGE></TDL>",
        "</DESC>",
    ].join("");

    return buildEnvelope(header, body);
}

/**
 * Builds an `Import / Data` request for masters. `messages` are the already
 * rendered master fragments (GROUP / LEDGER / COSTCENTRE elements).
 */
export function buildImportMastersRequest(messages: string[], variables?: TallyStaticVariables): string {
    if (messages.length === 0) {
        throw new Error("At least one master message is required");
    }

    const header = ["<VERSION>1</VERSION>", "<TALLYREQUEST>Import</TALLYREQUEST>", "<TYPE>Data</TYPE>", "<ID>All Masters</ID>"].join("");

    const body = [
        "<IMPORTDATA>",
        "<REQUESTDESC>",
        renderStaticVariables(variables),
        "<REPORTNAME>All Masters</REPORTNAME>",
        "</REQUESTDESC>",
        "<REQUESTDATA>",
        '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
        messages.join(""),
        "</TALLYMESSAGE>",
        "</REQUESTDATA>",
        "</IMPORTDATA>",
    ].join("");

    return buildEnvelope(header, body);
}
