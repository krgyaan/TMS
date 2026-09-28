import * as XLSX from "xlsx";

// ---- Column layout of the worksheet (0-indexed, data rows) ----
// Single header row, data starts on the row after it.
const COL = {
    NAME: 0,
    EMAIL: 1,
    PHONE: 2,
    PAN: 3,
    MSME: 4,
} as const;

/**
 * Official GST state codes (state/UT name -> codes accepted on a GSTIN filed under
 * that state).
 *
 * These are deliberately NOT derived from the workbook: the sheet's own header
 * suffixes still carry the pre-merger numbering (DAMAN AND DIU-25, ANDHRA PRADESH-28)
 * while the current official list uses 26 for the merged
 * "Dadra and Nagar Haveli & Daman and Diu" and 37 for Andhra Pradesh.
 *
 * Keyed on the header label with the "-NN" suffix stripped and whitespace collapsed.
 */
const GST_STATE_CODES: Record<string, { stateName: string; codes: string[]; legacyCodes?: string[] }> = {
    "JAMMU AND KASHMIR": { stateName: "Jammu and Kashmir", codes: ["01"] },
    "HIMACHAL PRADESH": { stateName: "Himachal Pradesh", codes: ["02"] },
    PUNJAB: { stateName: "Punjab", codes: ["03"] },
    CHANDIGARH: { stateName: "Chandigarh", codes: ["04"] },
    UTTARAKHAND: { stateName: "Uttarakhand", codes: ["05"] },
    HARYANA: { stateName: "Haryana", codes: ["06"] },
    DELHI: { stateName: "Delhi", codes: ["07"] },
    RAJASTHAN: { stateName: "Rajasthan", codes: ["08"] },
    "UTTAR PRADESH": { stateName: "Uttar Pradesh", codes: ["09"] },
    BIHAR: { stateName: "Bihar", codes: ["10"] },
    SIKKIM: { stateName: "Sikkim", codes: ["11"] },
    "ARUNACHAL PRADESH": { stateName: "Arunachal Pradesh", codes: ["12"] },
    NAGALAND: { stateName: "Nagaland", codes: ["13"] },
    MANIPUR: { stateName: "Manipur", codes: ["14"] },
    MIZORAM: { stateName: "Mizoram", codes: ["15"] },
    TRIPURA: { stateName: "Tripura", codes: ["16"] },
    MEGHALAYA: { stateName: "Meghalaya", codes: ["17"] },
    ASSAM: { stateName: "Assam", codes: ["18"] },
    "WEST BENGAL": { stateName: "West Bengal", codes: ["19"] },
    JHARKHAND: { stateName: "Jharkhand", codes: ["20"] },
    ODISHA: { stateName: "Odisha", codes: ["21"] },
    CHATTISGARH: { stateName: "Chattisgarh", codes: ["22"] },
    "MADHYA PRADESH": { stateName: "Madhya Pradesh", codes: ["23"] },
    GUJARAT: { stateName: "Gujarat", codes: ["24"] },
    // 25 was Daman and Diu before the territory merged into 26 - still accepted so
    // pre-merger registrations aren't rejected, but logged for review.
    // codes[0] is always the current official code; any further entries are accepted alternates.
    "DAMAN AND DIU": { stateName: "Daman and Diu", codes: ["26", "25"], legacyCodes: ["25"] },
    "DADRA AND NAGAR HAVELI": { stateName: "Dadra and Nagar Haveli", codes: ["26"] },
    MAHARASHTRA: { stateName: "Maharashtra", codes: ["27"] },
    // The legacy "-28" column and the "(NEW)-37" column are the same state. Header
    // suffixes are ignored for codes, so both are Andhra Pradesh (New) / 37 - which
    // also makes the parser's exact-duplicate dedupe collapse identical cells that
    // were filed under both headings.
    "ANDHRA PRADESH": { stateName: "Andhra Pradesh (New)", codes: ["37"] },
    "ANDHRA PRADESH (NEW)": { stateName: "Andhra Pradesh (New)", codes: ["37"] },
    KARNATAKA: { stateName: "Karnataka", codes: ["29"] },
    GOA: { stateName: "Goa", codes: ["30"] },
    "LAKSHADWEEP ISLANDS": { stateName: "Lakshadweep Islands", codes: ["31"] },
    KERALA: { stateName: "Kerala", codes: ["32"] },
    "TAMIL NADU": { stateName: "Tamil Nadu", codes: ["33"] },
    PONDICHERRY: { stateName: "Pondicherry", codes: ["34"] },
    "ANDAMAN AND NICOBAR ISLAND": { stateName: "Andaman and Nicobar Island", codes: ["35"] },
    TELANGANA: { stateName: "Telangana", codes: ["36"] },
    LADAKH: { stateName: "Ladakh", codes: ["38"] },
};

const STATE_HEADER_RE = /^(.*?)-\s*(\d+)\s*$/;

interface StateColumn {
    stateName: string;
    allowedCodes: string[];
    legacyCodes: string[];
    cols: number[];
}

/**
 * Walk the header row: a cell labelled "<STATE>-<code>" starts a group, and any
 * following unlabelled cell joins it (the sheet gives a state 1-3 registration slots
 * but only labels the first one). Labelled cells that aren't GST state headers (the
 * scalar columns, and any trailing notes column) are skipped.
 */
function deriveStateColumns(header: unknown[]): StateColumn[] {
    const groups: StateColumn[] = [];
    let current: StateColumn | null = null;

    for (let i = 0; i < header.length; i++) {
        const label = clean(header[i]);
        if (label) {
            const m = label.match(STATE_HEADER_RE);
            if (m) {
                const key = m[1].replace(/\s+/g, " ").trim().toUpperCase();
                const meta = GST_STATE_CODES[key];
                if (!meta) throw new Error(`Unrecognised GST state column header "${label}"`);
                current = {
                    stateName: meta.stateName,
                    allowedCodes: meta.codes,
                    legacyCodes: meta.legacyCodes ?? [],
                    cols: [i],
                };
                groups.push(current);
            } else {
                current = null; // non-state labelled column ends the current group
            }
        } else if (current) {
            current.cols.push(i);
        }
    }

    if (groups.length === 0) throw new Error("No GST state columns found in the header row");
    return groups;
}

// "(09AABCH3162L2ZF) Plot H-6, Dmic ... 201308" -> { gstNo, address }
// A valid GSTIN is 15 chars, but a handful of source rows have data-entry slips
// (missing "(", stray space, an extra/missing character) - 13-17 tolerates those
// while still requiring the closing ")" that's consistently present.
const GST_CELL_RE = /^\(?\s*([A-Za-z0-9]{13,17})\)\s*(.*)$/s;

export interface ParsedGst {
    gstState: string;
    gstNo: string | null;
    address: string;
}

export interface ParsedVendor {
    name: string;
    email: string | null;
    phone: string | null;
    pan: string | null;
    msme: string | null;
    gsts: ParsedGst[];
}

export interface ParseWarning {
    vendorName: string;
    message: string;
}

function clean(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    // xlsx hands back Date objects for date-formatted cells; anything else that is
    // not a scalar would stringify to "[object Object]", so drop it instead of
    // storing that in a name/email/phone/PAN column.
    if (v instanceof Date) return v.toISOString();
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return null;
    const s = String(v).trim();
    if (!s || s.toUpperCase() === "N/A") return null;
    return s;
}

function cleanPan(v: unknown): string | null {
    return clean(v);
}

function cleanMsme(v: unknown): string | null {
    const s = clean(v);
    if (!s) return null;
    // "NON-MSME" is a status flag, not a registration number - not worth storing in an `msme` column.
    if (s.toUpperCase() === "NON-MSME" || s.toUpperCase() === "NON MSME") return null;
    return s;
}

/** First phone only (mobile column is varchar(22) - too tight for "num1 & num2"). */
function firstPhone(v: unknown): string | null {
    const s = clean(v);
    if (!s) return null;
    const first = s.split(/&|,|\band\b/i)[0].trim();
    const digits = first.replace(/[^\d+]/g, "");
    return digits ? digits.slice(0, 22) : null;
}

/** Keep every email, comma-joined (varchar(255) has room). */
function allEmails(v: unknown): string | null {
    const s = clean(v);
    if (!s) return null;
    const parts = s
        .split(/&|\band\b/i)
        .map(p => p.trim())
        .filter(Boolean);
    const joined = parts.join(", ");
    return joined.slice(0, 255);
}

export function parseVmSheet(filePath: string): {
    vendors: ParsedVendor[];
    warnings: ParseWarning[];
    anomalies: ParseWarning[];
    notes: ParseWarning[];
} {
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!sheet) throw new Error(`No worksheet found in ${filePath}`);

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        raw: true,
    });
    if (rows.length < 2) throw new Error(`Worksheet "${sheetName}" has no data rows`);

    const stateColumns = deriveStateColumns(rows[0]);

    const warnings: ParseWarning[] = [];
    const anomalies: ParseWarning[] = [];
    const notes: ParseWarning[] = [];
    const byName = new Map<string, ParsedVendor>();

    // Row 0 is the header; data starts on row 1.
    for (const row of rows.slice(1)) {
        const rawName = clean(row[COL.NAME]);
        if (!rawName) continue; // blank / placeholder rows

        const key = rawName.toLowerCase();
        let vendor = byName.get(key);
        if (!vendor) {
            vendor = { name: rawName, email: null, phone: null, pan: null, msme: null, gsts: [] };
            byName.set(key, vendor);
        }

        // Merge scalar fields without clobbering values already found on an earlier duplicate row.
        vendor.email = vendor.email ?? allEmails(row[COL.EMAIL]);
        vendor.phone = vendor.phone ?? firstPhone(row[COL.PHONE]);
        vendor.pan = vendor.pan ?? cleanPan(row[COL.PAN]);
        vendor.msme = vendor.msme ?? cleanMsme(row[COL.MSME]);

        for (const group of stateColumns) {
            for (const col of group.cols) {
                const cell = clean(row[col]);
                if (!cell) continue;

                const match = cell.match(GST_CELL_RE);
                let gstNo: string | null = null;
                let address = cell;
                if (match) {
                    gstNo = match[1].toUpperCase();
                    address = match[2].trim();

                    const code = gstNo.slice(0, 2);
                    if (gstNo.length !== 15) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${group.stateName}: GSTIN "${gstNo}" is ${gstNo.length} characters (expected 15) - stored as-is, review before relying on it`,
                        });
                    } else if (!group.allowedCodes.includes(code)) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${group.stateName}: GSTIN "${gstNo}" has state code ${code} but sits in the ${group.stateName} column (expects ${group.allowedCodes.join(" or ")}) - stored under state "${group.stateName}", the cell may be in the wrong column`,
                        });
                    } else if (group.legacyCodes.includes(code)) {
                        notes.push({
                            vendorName: rawName,
                            message: `${group.stateName}: GSTIN "${gstNo}" uses retired state code ${code} (the territory now files under ${group.allowedCodes[0]}) - accepted, but verify against the GST portal`,
                        });
                    }
                } else {
                    warnings.push({
                        vendorName: rawName,
                        message: `${group.stateName}: couldn't find a "(GSTIN) address" pattern in "${cell.slice(0, 60)}..." - stored as address only`,
                    });
                }

                // Same org can legitimately have >1 GSTIN in the same state - only dedupe exact repeats.
                const dupe = vendor.gsts.some(g2 => g2.gstState === group.stateName && g2.gstNo === gstNo && g2.address === address);
                if (!dupe) vendor.gsts.push({ gstState: group.stateName, gstNo, address });
            }
        }
    }

    return { vendors: Array.from(byName.values()), warnings, anomalies, notes };
}
