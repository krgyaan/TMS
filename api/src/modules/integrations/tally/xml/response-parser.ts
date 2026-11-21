import { XMLParser, XMLValidator } from "fast-xml-parser";
import { TallyCompanyNotOpen, TallyLineError, TallyProtocolError } from "../errors/tally.errors";
import { MASTER_TALLY_TAGS, type MasterKind } from "./master-xml.builder";

const MAX_DEPTH = 24;
const HTML_START = /^\s*<(!doctype\s+html|html[\s>])/i;
const FORBIDDEN_XML_DECLARATION = /<!\s*(DOCTYPE|ENTITY)\b/i;

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    allowBooleanAttributes: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
    processEntities: false,
    htmlEntities: false,
});

export interface ParsedTallyResponse {
    root: "ENVELOPE" | "RESPONSE";
    status: number | null;
    version: string | null;
    data: unknown;
    envelope: Record<string, unknown>;
}

export interface TallyMasterRecord {
    name: string;
    parent: string | null;
}

export interface TallyImportResult {
    created: number;
    altered: number;
    ignored: number;
    errors: number;
    cancelled: number;
    lineErrors: string[];
    alreadyExists: boolean;
}

export interface TallyLiveness {
    running: boolean;
    message: string;
}

export interface ParseImportOptions {
    treatAlreadyExistsAsSuccess?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (Array.isArray(value)) {
        return value.length > 0 ? asRecord(value[0]) : null;
    }

    if (value !== null && typeof value === "object") {
        return value as Record<string, unknown>;
    }

    return null;
}

function extractText(value: unknown): string | null {
    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    const record = asRecord(value);

    if (record) {
        const text = record["#text"];

        if (typeof text === "string") {
            return text.trim();
        }

        if (typeof text === "number" || typeof text === "boolean") {
            return String(text);
        }
    }

    return null;
}

function toInt(value: unknown): number {
    const text = extractText(value);

    if (text === null || text === "") {
        return 0;
    }

    const parsed = Number.parseInt(text, 10);

    return Number.isFinite(parsed) ? parsed : 0;
}

function collectByTag(node: unknown, tag: string, out: unknown[] = [], depth = 0): unknown[] {
    if (depth > MAX_DEPTH || node === null || node === undefined) {
        return out;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            collectByTag(item, tag, out, depth + 1);
        }

        return out;
    }

    if (typeof node !== "object") {
        return out;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key.toUpperCase() === tag) {
            if (Array.isArray(value)) {
                out.push(...(value as unknown[]));
            } else {
                out.push(value);
            }

            continue;
        }

        collectByTag(value, tag, out, depth + 1);
    }

    return out;
}

function findFirstByTag(node: unknown, tag: string, depth = 0): unknown {
    if (depth > MAX_DEPTH || node === null || node === undefined) {
        return undefined;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            const found = findFirstByTag(item, tag, depth + 1);

            if (found !== undefined) {
                return found;
            }
        }

        return undefined;
    }

    if (typeof node !== "object") {
        return undefined;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key.toUpperCase() === tag) {
            return value;
        }

        const found = findFirstByTag(value, tag, depth + 1);

        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/** Rejects entity-bearing documents before the parser sees them (XXE hardening). */
export function assertSafeXml(xml: string): void {
    if (FORBIDDEN_XML_DECLARATION.test(xml)) {
        throw new TallyProtocolError("Tally response contained a DOCTYPE/ENTITY declaration; refusing to parse it");
    }
}

export function parseResponse(xml: string): ParsedTallyResponse {
    const trimmed = String(xml ?? "").trim();

    if (!trimmed) {
        throw new TallyCompanyNotOpen("Tally returned an empty response; this usually means no company is open");
    }

    if (HTML_START.test(trimmed)) {
        throw new TallyProtocolError("Tally returned an HTML page instead of an XML envelope");
    }

    assertSafeXml(trimmed);

    const validation = XMLValidator.validate(trimmed);

    if (validation !== true) {
        const detail = typeof validation === "object" ? validation.err?.msg : undefined;

        throw new TallyProtocolError(`Tally returned malformed or truncated XML${detail ? `: ${detail}` : ""}`);
    }

    let parsed: unknown;

    try {
        parsed = xmlParser.parse(trimmed);
    } catch (error) {
        throw new TallyProtocolError("Tally response could not be parsed", { cause: error });
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new TallyProtocolError("Tally response did not contain an XML envelope");
    }

    const document = parsed as Record<string, unknown>;
    const rootKey = Object.keys(document).find(key => {
        const upper = key.toUpperCase();

        return upper === "ENVELOPE" || upper === "RESPONSE";
    });

    if (!rootKey) {
        const first = Object.keys(document).find(key => !key.startsWith("@_") && key !== "#text");

        throw new TallyProtocolError(`Tally response had an unexpected root element${first ? ` (${first})` : ""}`);
    }

    const envelope = asRecord(document[rootKey]) ?? {};
    const header = asRecord(envelope.HEADER) ?? asRecord(findFirstByTag(envelope, "HEADER")) ?? {};
    const statusValue = header.STATUS ?? findFirstByTag(header, "STATUS");
    const statusText = extractText(statusValue);
    const status = statusText === null || statusText === "" ? null : toInt(statusValue);
    const version = extractText(header.VERSION ?? findFirstByTag(header, "VERSION"));
    const body = asRecord(envelope.BODY);
    const data = body?.DATA ?? body ?? envelope;

    return {
        root: rootKey.toUpperCase() === "RESPONSE" ? "RESPONSE" : "ENVELOPE",
        status,
        version,
        data,
        envelope,
    };
}

export function assertEnvelopeOk(parsed: ParsedTallyResponse): void {
    if (parsed.status !== null && parsed.status !== 1) {
        throw new TallyProtocolError(`Tally returned HEADER STATUS=${parsed.status}`, {
            details: { status: parsed.status },
        });
    }
}

const LIVENESS_BANNER = /TallyPrime\s+Server\s+is\s+Running/i;

/**
 * Parses the reverse proxy's liveness reply, e.g.
 * `<RESPONSE>TallyPrime Server is Running</RESPONSE>`.
 * This is not an ENVELOPE and carries no company data.
 */
export function parseLivenessBanner(xml: string): TallyLiveness {
    const trimmed = String(xml ?? "").trim();

    if (!trimmed) {
        throw new TallyProtocolError("Tally liveness probe returned an empty response");
    }

    if (HTML_START.test(trimmed)) {
        throw new TallyProtocolError("Tally liveness probe returned an HTML page");
    }

    assertSafeXml(trimmed);

    const validation = XMLValidator.validate(trimmed);

    if (validation !== true) {
        throw new TallyProtocolError("Tally liveness probe returned malformed XML");
    }

    let parsed: unknown;

    try {
        parsed = xmlParser.parse(trimmed);
    } catch (error) {
        throw new TallyProtocolError("Tally liveness probe response could not be parsed", { cause: error });
    }

    const document = (parsed ?? {}) as Record<string, unknown>;
    const rootKey = Object.keys(document).find(key => key.toUpperCase() === "RESPONSE");

    if (!rootKey) {
        throw new TallyProtocolError("Tally liveness probe returned an unexpected root element");
    }

    const text = extractText(document[rootKey]) ?? "";
    const running = LIVENESS_BANNER.test(text);

    return {
        running,
        message: running ? "TallyPrime Server is Running" : text.slice(0, 120),
    };
}

export function parseImportResult(xml: string, options: ParseImportOptions = {}): TallyImportResult {
    const parsed = parseResponse(xml);
    const resultNode = findFirstByTag(parsed.data, "IMPORTRESULT") ?? findFirstByTag(parsed.envelope, "IMPORTRESULT") ?? {};
    const record = asRecord(resultNode) ?? {};

    const lineErrors = collectByTag(parsed.envelope, "LINEERROR")
        .map(entry => extractText(entry))
        .filter((entry): entry is string => Boolean(entry));

    const alreadyExistsErrors = lineErrors.filter(entry => /already exists/i.test(entry));
    const otherErrors = lineErrors.filter(entry => !/already exists/i.test(entry));

    const result: TallyImportResult = {
        created: toInt(record.CREATED),
        altered: toInt(record.ALTERED),
        ignored: toInt(record.IGNORED),
        errors: toInt(record.ERRORS),
        cancelled: toInt(record.CANCELLED),
        lineErrors,
        alreadyExists: alreadyExistsErrors.length > 0,
    };

    if (result.errors > 0) {
        const onlyAlreadyExists = alreadyExistsErrors.length > 0 && otherErrors.length === 0;

        if (options.treatAlreadyExistsAsSuccess && onlyAlreadyExists) {
            return result;
        }

        const detail = otherErrors.length > 0 ? otherErrors.join("; ") : lineErrors.join("; ");

        throw new TallyLineError(`Tally rejected the import with ${result.errors} error(s)${detail ? `: ${detail}` : ""}`, { details: { errors: result.errors, lineErrors } });
    }

    if (parsed.status !== null && parsed.status !== 1) {
        throw new TallyProtocolError(`Tally returned HEADER STATUS=${parsed.status}`, {
            details: { status: parsed.status },
        });
    }

    return result;
}

export function parseMasterList(xml: string, kind: MasterKind): TallyMasterRecord[] {
    const tag = MASTER_TALLY_TAGS[kind];

    if (!tag) {
        throw new TallyProtocolError(`Unsupported master kind: ${String(kind)}`);
    }

    const parsed = parseResponse(xml);

    assertEnvelopeOk(parsed);

    if (parsed.root !== "ENVELOPE") {
        throw new TallyProtocolError("Expected an ENVELOPE response but received a RESPONSE banner");
    }

    const nodes = collectByTag(parsed.data ?? parsed.envelope, tag);
    const records: TallyMasterRecord[] = [];
    const seen = new Set<string>();

    for (const node of nodes) {
        const record = asRecord(node);

        if (!record) {
            continue;
        }

        const name = extractText(record.NAME) ?? extractText(record["@_NAME"]);

        if (!name) {
            continue;
        }

        const key = name.toLowerCase();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);

        records.push({
            name,
            parent: extractText(record.PARENT) ?? extractText(record["@_PARENT"]),
        });
    }

    return records;
}

export function parseCompanyNames(xml: string): string[] {
    const parsed = parseResponse(xml);

    assertEnvelopeOk(parsed);

    if (parsed.root !== "ENVELOPE") {
        throw new TallyProtocolError("Expected an ENVELOPE response but received a RESPONSE banner");
    }

    const nodes = collectByTag(parsed.data ?? parsed.envelope, "COMPANY");
    const names: string[] = [];
    const seen = new Set<string>();

    for (const node of nodes) {
        const record = asRecord(node);

        if (!record) {
            continue;
        }

        const name = extractText(record.NAME) ?? extractText(record["@_NAME"]);

        if (!name) {
            continue;
        }

        const key = name.toLowerCase();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        names.push(name);
    }

    return names;
}
