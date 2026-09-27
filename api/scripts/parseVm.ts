import * as XLSX from "xlsx";

// ---- Column layout of the "VM" sheet (0-indexed, data rows) ----
const COL = {
    NAME: 2,
    EMAIL: 3,
    PHONE: 4,
    PAN: 5,
    MSME: 9,
} as const;

// State name -> the column indices that may hold a "(GSTIN) address" entry for that state.
// Derived from the merged header cells in the VM sheet (some states have 2-3 registration slots).
const STATE_COLUMN_GROUPS: Array<[string, number[]]> = [
    ["Jammu and Kashmir", [10, 11]],
    ["Himachal Pradesh", [12, 13]],
    ["Punjab", [14, 15]],
    ["Chandigarh", [16, 17]],
    ["Uttarakhand", [18, 19]],
    ["Haryana", [20, 21]],
    ["Delhi", [22, 23]],
    ["Rajasthan", [24, 25]],
    ["Uttar Pradesh", [26, 27, 28]],
    ["Bihar", [29, 30]],
    ["Sikkim", [31]],
    ["Arunachal Pradesh", [32]],
    ["Nagaland", [33]],
    ["Manipur", [34]],
    ["Mizoram", [35]],
    ["Tripura", [36]],
    ["Meghalaya", [37]],
    ["Assam", [38, 39, 40]],
    ["West Bengal", [41, 42]],
    ["Jharkhand", [43, 44]],
    ["Odisha", [45, 46]],
    ["Chattisgarh", [47, 48]],
    ["Madhya Pradesh", [49, 50, 51]],
    ["Gujarat", [52, 53]],
    ["Daman and Diu", [54]],
    ["Dadra and Nagar Haveli", [55]],
    ["Maharashtra", [56, 57]],
    ["Andhra Pradesh", [58]],
    ["Karnataka", [59, 60, 61]],
    ["Goa", [62, 63]],
    ["Lakshadweep Islands", [64]],
    ["Kerala", [65]],
    ["Tamil Nadu", [66, 67]],
    ["Pondicherry", [68]],
    ["Andaman and Nicobar Island", [69]],
    ["Telangana", [70]],
    ["Andhra Pradesh (New)", [71, 72, 73]],
    ["Ladakh", [74]],
];

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
} {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets["VM"];
    if (!sheet) throw new Error(`Sheet "VM" not found in ${filePath}`);

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        raw: true,
    });

    const warnings: ParseWarning[] = [];
    const anomalies: ParseWarning[] = [];
    const byName = new Map<string, ParsedVendor>();

    // Row 0-1 are header rows; data starts at row 2.
    for (const row of rows.slice(2)) {
        const rawName = clean(row[COL.NAME]);
        if (!rawName) continue; // blank / placeholder rows (e.g. leftover SR.NO with nothing else)

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

        // The group order matches the workbook's header suffixes ("...-1" .. "...-38"),
        // which are exactly the official GST state codes, so position+1 is the code a
        // GSTIN sitting in this column should be prefixed with.
        for (let g = 0; g < STATE_COLUMN_GROUPS.length; g++) {
            const [stateName, cols] = STATE_COLUMN_GROUPS[g];
            const expectedCode = String(g + 1).padStart(2, "0");
            for (const col of cols) {
                const cell = clean(row[col]);
                if (!cell) continue;

                const match = cell.match(GST_CELL_RE);
                let gstNo: string | null = null;
                let address = cell;
                if (match) {
                    gstNo = match[1].toUpperCase();
                    address = match[2].trim();

                    if (gstNo.length !== 15) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${stateName}: GSTIN "${gstNo}" is ${gstNo.length} characters (expected 15) - stored as-is, review before relying on it`,
                        });
                    } else if (gstNo.slice(0, 2) !== expectedCode) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${stateName}: GSTIN "${gstNo}" has state code ${gstNo.slice(0, 2)} but sits in the ${stateName} column (expects ${expectedCode}) - stored under state "${stateName}", the cell may be in the wrong column`,
                        });
                    }
                } else {
                    warnings.push({
                        vendorName: rawName,
                        message: `${stateName}: couldn't find a "(GSTIN) address" pattern in "${cell.slice(0, 60)}..." - stored as address only`,
                    });
                }

                // Same org can legitimately have >1 GSTIN in the same state - only dedupe exact repeats.
                const dupe = vendor.gsts.some(g2 => g2.gstState === stateName && g2.gstNo === gstNo && g2.address === address);
                if (!dupe) vendor.gsts.push({ gstState: stateName, gstNo, address });
            }
        }
    }

    return { vendors: Array.from(byName.values()), warnings, anomalies };
}
