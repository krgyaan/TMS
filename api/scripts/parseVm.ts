import * as XLSX from "xlsx";

const DEFAULT_SHEET = "VM";
const HEADER_SCAN_ROWS = 12;

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
const GSTIN_SHAPE_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

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

export interface ParsedBank {
    bankAccountName: string;
    accountNum: string;
    ifscCode: string;
    branch: string | null;
    swiftCode: string | null;
}

export type MsmeType = "M" | "S" | "T";

export interface ParsedVendor {
    name: string;
    email: string | null;
    phone: string | null;
    pan: string | null;
    category: string | null;
    registrationType: "REGULAR" | "UNREGISTERED" | null;
    creditPeriodDays: number | null;
    creditAmount: number | null;
    msme: string | null;
    msmeSize: "Micro" | "Small" | "Medium" | null;
    msmeType: MsmeType | null;
    majorActivity: string | null;
    address: string | null;
    bank: ParsedBank | null;
    gsts: ParsedGst[];
}

export interface ParseWarning {
    vendorName: string;
    message: string;
}

export interface ParseResult {
    vendors: ParsedVendor[];
    warnings: ParseWarning[];
    anomalies: ParseWarning[];
    notes: ParseWarning[];
    corrections: ParseWarning[];
    sheetName: string;
    headerRowIndex: number;
}

function clean(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    // xlsx hands back Date objects for date-formatted cells; anything else that is
    // not a scalar would stringify to "[object Object]", so drop it instead of
    // storing that in a name/email/phone/PAN column.
    if (v instanceof Date) return v.toISOString();
    if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return null;
    const s = String(v).trim();
    if (!s || s.toUpperCase() === "N/A" || s.toUpperCase() === "UNKNOWN" || s === "-") return null;
    return s;
}

function findColumn(header: unknown[], patterns: RegExp[]): number {
    for (let i = 0; i < header.length; i++) {
        const label = (clean(header[i]) ?? "").toUpperCase();
        if (label && patterns.some(p => p.test(label))) return i;
    }
    return -1;
}

function findHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
        const labels = (rows[i] ?? []).map(v => (clean(v) ?? "").toUpperCase());
        const hasName = labels.some(l => /VENDER\s*NAME|VENDOR\s*NAME/.test(l) || l === "NAME");
        const hasPan = labels.some(l => /^PAN\b/.test(l));
        if (hasName && hasPan) return i;
    }
    return -1;
}

function sheetHasVendorHeader(wb: XLSX.WorkBook, sheetName: string): boolean {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return false;
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    return findHeaderRow(rows) >= 0;
}

function pickSheet(wb: XLSX.WorkBook, requested?: string): string {
    if (requested && wb.Sheets[requested]) return requested;
    if (wb.Sheets[DEFAULT_SHEET]) return DEFAULT_SHEET;
    for (const name of wb.SheetNames) {
        if (sheetHasVendorHeader(wb, name)) return name;
    }
    return wb.SheetNames[0];
}

function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanPan(v: unknown): string | null {
    const s = clean(v);
    return s ? s.toUpperCase().replace(/[^A-Z0-9]/g, "") : null;
}

function cleanMsme(v: unknown): string | null {
    const s = clean(v);
    if (!s) return null;
    // "NON-MSME" is a status flag, not a registration number - not worth storing in an `msme` column.
    if (s.toUpperCase() === "NON-MSME" || s.toUpperCase() === "NON MSME") return null;
    return s.toUpperCase();
}

function normalizeRegistrationType(v: unknown): { value: "REGULAR" | "UNREGISTERED" | null; invalid?: string } {
    const s = clean(v);
    if (!s) return { value: null };
    const upper = s.toUpperCase();
    if (upper === "REGULAR") return { value: "REGULAR" };
    if (upper === "UNREGISTERED") return { value: "UNREGISTERED" };
    return { value: null, invalid: s };
}

function normalizeMsmeSize(v: unknown): { value: "Micro" | "Small" | "Medium" | null; invalid?: string } {
    const s = clean(v);
    if (!s) return { value: null };
    const lower = s.toLowerCase();
    if (lower === "micro") return { value: "Micro" };
    if (lower === "small") return { value: "Small" };
    if (lower === "medium") return { value: "Medium" };
    return { value: null, invalid: s };
}

function normalizeMajorActivity(v: unknown): { value: string | null; invalid?: string } {
    const s = clean(v);
    if (!s) return { value: null };
    const lower = s.toLowerCase();
    if (lower.includes("manufact")) return { value: "Manufacturing" };
    if (lower.includes("trading")) return { value: lower.includes("service") ? "Services (Trading)" : "Trading" };
    if (lower.includes("service")) return { value: "Services" };
    return { value: s, invalid: s };
}

function deriveMsmeType(activity: string | null): MsmeType | null {
    if (!activity) return null;
    if (activity === "Manufacturing") return "M";
    if (activity === "Trading" || activity === "Services (Trading)") return "T";
    if (activity === "Services") return "S";
    return null;
}

function parseCreditPeriod(v: unknown): { value: number | null; invalid?: string } {
    const s = clean(v);
    if (!s) return { value: null };
    const match = s.match(/\d+/);
    if (!match) return { value: null, invalid: s };
    return { value: parseInt(match[0], 10) };
}

function parseCreditAmount(v: unknown): { value: number | null; invalid?: string } {
    const s = clean(v);
    if (!s) return { value: null };
    const match = s.match(/([\d.]+)\s*(lakh|lac|lacs|cr|crore|crores)?/i);
    if (!match) return { value: null, invalid: s };
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return { value: null, invalid: s };
    const unit = (match[2] ?? "").toLowerCase();
    const multiplier = unit.startsWith("cr") ? 10_000_000 : unit.startsWith("la") ? 100_000 : 1;
    return { value: amount * multiplier };
}

function parseBankDetails(v: unknown, vendorName: string): { value: ParsedBank | null; invalid?: string } {
    const s = clean(v);
    if (!s || /^NOT\s*MENTION$/i.test(s) || /^NO$/i.test(s)) return { value: null };

    const accountName = s.match(/(?:account\s*name|name)\s*[:\-]\s*([^,]+)/i)?.[1]?.trim();
    const accountNum = s.match(/account\s*(?:number|no\.?)\s*[:\-]?\s*([A-Za-z0-9]+)/i)?.[1]?.trim();
    const ifscCode = s.match(/ifsc\s*(?:code)?\s*[:\-]?\s*([A-Z]{4}0[A-Z0-9]{6})/i)?.[1]?.trim().toUpperCase();
    const branch = s.match(/branch\s*[:\-]\s*([^,]+)/i)?.[1]?.trim();
    const swiftCode = s.match(/swift\s*(?:code)?\s*[:\-]?\s*([A-Z0-9]+)/i)?.[1]?.trim().toUpperCase();

    if (!accountNum || !ifscCode) return { value: null, invalid: s };

    return {
        value: {
            bankAccountName: accountName || vendorName,
            accountNum,
            ifscCode,
            branch: branch || null,
            swiftCode: swiftCode || null,
        },
    };
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

function isGstinShape(value: string): boolean {
    return value.length === 15 && GSTIN_SHAPE_RE.test(value);
}

function normalizeGstToken(token: string, group: StateColumn): { gstNo: string; corrected: boolean } {
    const upper = token.toUpperCase();
    if (upper.length === 16 && upper.startsWith("9")) {
        const candidate = upper.slice(1);
        if (isGstinShape(candidate) && group.allowedCodes.includes(candidate.slice(0, 2))) {
            return { gstNo: candidate, corrected: true };
        }
    }
    return { gstNo: upper, corrected: false };
}

/**
 * The sheet's PAN column is occasionally mistyped even though its GSTINs are
 * internally consistent. Trust the GSTIN-embedded PAN when every valid GSTIN
 * agrees, except for names that need human review.
 */
const PAN_REVIEW_ONLY = new Set(["shinobies"]);

export function parseVmSheet(filePath: string, options?: { sheetName?: string }): ParseResult {
    const wb = XLSX.readFile(filePath);
    const sheetName = pickSheet(wb, options?.sheetName);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error(`Worksheet "${sheetName}" not found in ${filePath}`);

    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        raw: true,
    });
    if (rows.length < 2) throw new Error(`Worksheet "${sheetName}" has no data rows`);

    const headerRowIndex = findHeaderRow(rows);
    if (headerRowIndex < 0) throw new Error(`No vendor header row found in worksheet "${sheetName}"`);

    const header = rows[headerRowIndex] ?? [];
    const COL = {
        NAME: findColumn(header, [/VENDER\s*NAME/, /VENDOR\s*NAME/, /^NAME$/]),
        EMAIL: findColumn(header, [/E-?MAIL/]),
        PHONE: findColumn(header, [/PHONE/]),
        PAN: findColumn(header, [/^PAN\b/]),
        CATEGORY: findColumn(header, [/CATEGORY/]),
        REGISTRATION_TYPE: findColumn(header, [/REGISTRATION\s*TYPE/]),
        CREDIT_PERIOD: findColumn(header, [/CREDIT\s*PERIOD/]),
        CREDIT_AMOUNT: findColumn(header, [/CREDIT\s*AMOUNT/]),
        MSME_SIZE: findColumn(header, [/MSME\s*TYPE/]),
        MSME_NO: findColumn(header, [/MSME\s*NO/]),
        MAJOR_ACTIVITY: findColumn(header, [/MAJOR\s*ACTIVITY/]),
        BANK: findColumn(header, [/BANK\s*DETAIL/]),
        ADDRESS: findColumn(header, [/^INVOICE$/, /UNREGISTERED\s*ADDRESS/, /^ADDRESS$/]),
    };
    if (COL.NAME < 0) throw new Error(`Could not find a vendor name column in worksheet "${sheetName}"`);

    const stateColumns = deriveStateColumns(header);

    const warnings: ParseWarning[] = [];
    const anomalies: ParseWarning[] = [];
    const notes: ParseWarning[] = [];
    const corrections: ParseWarning[] = [];
    const byName = new Map<string, ParsedVendor>();

    for (const row of rows.slice(headerRowIndex + 1)) {
        const rawName = clean(row[COL.NAME]);
        if (!rawName) continue; // blank / placeholder rows

        const key = normalizeKey(rawName);
        let vendor = byName.get(key);
        if (!vendor) {
            vendor = {
                name: rawName,
                email: null,
                phone: null,
                pan: null,
                category: null,
                registrationType: null,
                creditPeriodDays: null,
                creditAmount: null,
                msme: null,
                msmeSize: null,
                msmeType: null,
                majorActivity: null,
                address: null,
                bank: null,
                gsts: [],
            };
            byName.set(key, vendor);
        }

        // Merge scalar fields without clobbering values already found on an earlier duplicate row.
        vendor.email = vendor.email ?? allEmails(row[COL.EMAIL]);
        vendor.phone = vendor.phone ?? firstPhone(row[COL.PHONE]);
        vendor.pan = vendor.pan ?? cleanPan(row[COL.PAN]);
        vendor.category = vendor.category ?? clean(row[COL.CATEGORY]);
        vendor.address = vendor.address ?? clean(row[COL.ADDRESS]);

        const registration = normalizeRegistrationType(row[COL.REGISTRATION_TYPE]);
        vendor.registrationType = vendor.registrationType ?? registration.value;
        if (registration.invalid) {
            warnings.push({ vendorName: rawName, message: `Unrecognised registration type "${registration.invalid}" - stored as null` });
        }

        const period = parseCreditPeriod(row[COL.CREDIT_PERIOD]);
        vendor.creditPeriodDays = vendor.creditPeriodDays ?? period.value;
        if (period.invalid) {
            warnings.push({ vendorName: rawName, message: `Could not parse credit period "${period.invalid}" - stored as null` });
        }

        const amount = parseCreditAmount(row[COL.CREDIT_AMOUNT]);
        vendor.creditAmount = vendor.creditAmount ?? amount.value;
        if (amount.invalid) {
            warnings.push({ vendorName: rawName, message: `Could not parse credit amount "${amount.invalid}" - stored as null` });
        }

        vendor.msme = vendor.msme ?? cleanMsme(row[COL.MSME_NO]);

        const msmeSize = normalizeMsmeSize(row[COL.MSME_SIZE]);
        vendor.msmeSize = vendor.msmeSize ?? msmeSize.value;
        if (msmeSize.invalid) {
            warnings.push({ vendorName: rawName, message: `Unrecognised MSME type "${msmeSize.invalid}" - stored as null` });
        }

        const activity = normalizeMajorActivity(row[COL.MAJOR_ACTIVITY]);
        vendor.majorActivity = vendor.majorActivity ?? activity.value;
        if (activity.invalid) {
            warnings.push({ vendorName: rawName, message: `Unrecognised major activity "${activity.invalid}" - stored as-is` });
        }
        vendor.msmeType = vendor.msmeType ?? deriveMsmeType(vendor.majorActivity);

        const bank = parseBankDetails(row[COL.BANK], rawName);
        vendor.bank = vendor.bank ?? bank.value;
        if (bank.invalid) {
            warnings.push({ vendorName: rawName, message: `Could not parse bank details "${bank.invalid.slice(0, 80)}" - skipped` });
        }

        for (const group of stateColumns) {
            for (const col of group.cols) {
                const cell = clean(row[col]);
                if (!cell) continue;

                const match = cell.match(GST_CELL_RE);
                let gstNo: string | null = null;
                let address = cell;
                if (match) {
                    const normalized = normalizeGstToken(match[1], group);
                    gstNo = normalized.gstNo;
                    address = match[2].trim();

                    if (normalized.corrected) {
                        corrections.push({
                            vendorName: rawName,
                            message: `${group.stateName}: corrected GSTIN "${match[1].toUpperCase()}" to "${gstNo}" (removed leading 9)`,
                        });
                    }

                    const code = gstNo.slice(0, 2);
                    if (gstNo.length !== 15) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${group.stateName}: GSTIN "${gstNo}" is ${gstNo.length} characters (expected 15) - stored as-is, review before relying on it`,
                        });
                    } else if (!isGstinShape(gstNo)) {
                        anomalies.push({
                            vendorName: rawName,
                            message: `${group.stateName}: GSTIN "${gstNo}" does not match the expected GSTIN shape - stored as-is`,
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
                } else if (/^v$/i.test(cell)) {
                    anomalies.push({
                        vendorName: rawName,
                        message: `${group.stateName}: junk cell "${cell}" - skipped`,
                    });
                    continue;
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

    // PAN reconciliation: the GSTINs are usually more trustworthy than the PAN cell.
    for (const vendor of byName.values()) {
        const embeddedPans = [
            ...new Set(vendor.gsts.filter(g => g.gstNo && isGstinShape(g.gstNo)).map(g => g.gstNo!.slice(2, 12))),
        ];

        if (embeddedPans.length > 1) {
            anomalies.push({
                vendorName: vendor.name,
                message: `GSTINs contain multiple PANs (${embeddedPans.join(", ")}) - PAN left as "${vendor.pan ?? "null"}"`,
            });
            continue;
        }

        if (embeddedPans.length !== 1) continue;
        const embeddedPan = embeddedPans[0];
        if (!vendor.pan) {
            vendor.pan = embeddedPan;
            corrections.push({ vendorName: vendor.name, message: `PAN filled from GSTIN: "${embeddedPan}"` });
        } else if (vendor.pan !== embeddedPan) {
            if (PAN_REVIEW_ONLY.has(normalizeKey(vendor.name))) {
                anomalies.push({
                    vendorName: vendor.name,
                    message: `PAN column "${vendor.pan}" does not match GSTIN PAN "${embeddedPan}" - review manually`,
                });
            } else {
                corrections.push({
                    vendorName: vendor.name,
                    message: `PAN corrected from "${vendor.pan}" to "${embeddedPan}" (GSTIN-embedded PAN)`,
                });
                vendor.pan = embeddedPan;
            }
        }

        if (vendor.pan && vendor.pan.length !== 10) {
            anomalies.push({
                vendorName: vendor.name,
                message: `PAN "${vendor.pan}" is ${vendor.pan.length} characters (expected 10) - stored as-is`,
            });
        }
    }

    return {
        vendors: Array.from(byName.values()),
        warnings,
        anomalies,
        notes,
        corrections,
        sheetName,
        headerRowIndex,
    };
}
