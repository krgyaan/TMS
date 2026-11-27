/**
 * One-off import: reads the old bank-guarantee workbook (`old-bgs.xlsx`) and
 * creates Old Entry BG records in payment_requests / payment_instruments /
 * instrument_bg_details / instrument_status_history.
 *
 * Usage (from api/; DATABASE_URL is loaded from api/.env):
 *   pnpm import:old-bgs
 *   pnpm import:old-bgs --file ../old-bgs.xlsx --sheet Sheet1 --created-by 13
 *   pnpm import:old-bgs --apply
 *   pnpm import:old-bgs --rollback migration-logs/old-bgs-<runId>.manifest.ndjson
 *
 * Default is a dry run. `--apply` writes all valid rows in a single transaction
 * and produces a manifest so the run can be rolled back by ID.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { eq, inArray } from "drizzle-orm";
import { createDb, createPool } from "../src/db";
import {
    instrumentBgDetails,
    instrumentStatusHistory,
    paymentInstruments,
    paymentRequests,
} from "../src/db/schemas/tendering/payment-requests.schema";
import { tenderInfos } from "../src/db/schemas/tendering/tenders.schema";
import { projects } from "../src/db/schemas/master/projects.schema";
import { users } from "../src/db/schemas/auth/users.schema";

type Db = ReturnType<typeof createDb>;

const HEADERS = {
    reference: "Tender No./ PO No.",
    purpose: "Purpose",
    bgFavour: "BG in favour of",
    bgAddress: "BG Address",
    bgNo: "BG No.",
    bgDate: "BG Creation Date",
    bgExpiryDate: "BG Expiry date",
    bgClaimPeriod: "BG Claim period",
    amount: "BG Amount",
    stampValue: "BG Stamp paper value",
    bankName: "Bank Name",
    clientUserEmail: "Client mail Id( User)",
    clientCpEmail: "Client mail Id( C&P)",
    clientFinanceEmail: "Client mail Id(Finance)",
    accountName: "Client Account Name",
    accountNo: "Client Account No.",
    ifsc: "IFSC",
    fdrPer: "FDR %age",
    fdrAmt: "FDR amount",
    fdrNo: "FDR No.",
    fdrValidity: "FDR Validity",
    fdrRoi: "FDR ROI%",
    bgChargeDeducted: "BG Charges deducted",
    sfmsChargeDeducted: "SFMS Charges deducted",
    stampChargeDeducted: "Stamp Paper Charges deducted",
    otherChargeDeducted: "Other Charges deducted",
} as const;

const PURPOSE_CODE_MAP: Record<string, string> = {
    EMD: "EMD",
    ADVANCE_PAYMENT: "ADVANCE_PAYMENT",
    "ADVANCE PAYMENT": "ADVANCE_PAYMENT",
    SECURITY_BOND_DEPOSIT: "SECURITY_BOND_DEPOSIT",
    "SECURITY BOND/DEPOSIT": "SECURITY_BOND_DEPOSIT",
    "SECURITY BOND DEPOSIT": "SECURITY_BOND_DEPOSIT",
    SECURITY_DEPOSIT: "SECURITY_DEPOSIT",
    "SECURITY DEPOSIT": "SECURITY_DEPOSIT",
    PERFORMANCE_BG: "PERFORMANCE_BG",
    "PERFORMANCE BG": "PERFORMANCE_BG",
    PERFORMANCE: "PERFORMANCE_BG",
    FINANCIAL: "FINANCIAL",
    COUNTER_GUARANTEE: "COUNTER_GUARANTEE",
    "COUNTER GUARANTEE": "COUNTER_GUARANTEE",
    BANK_GUARANTEE: "BANK_GUARANTEE",
    "BANK GUARANTEE": "BANK_GUARANTEE",
};

const REQUEST_PURPOSE_MAP: Record<string, string> = {
    EMD: "EMD",
    ADVANCE_PAYMENT: "Advance Payment",
    SECURITY_BOND_DEPOSIT: "Security Bond/Deposit",
    SECURITY_DEPOSIT: "Security Deposit",
    PERFORMANCE_BG: "Performance BG",
    FINANCIAL: "Financial",
    COUNTER_GUARANTEE: "Counter Guarantee",
};

const BANK_BY_LABEL: Record<string, string> = {
    "BG LIMIT": "BGLIMIT_0771",
    BGLIMIT: "BGLIMIT_0771",
    "AU 8316": "AU_8316",
    "AU 5242": "AU_5242",
    "AU 5180": "AU_5180",
    "AU 5190": "AU_5190",
    "AU 9589": "AU_9589",
    "HDFC BANK 0026": "HDFC_0026",
    "HDFC BANK 2828": "HDFC_2828",
    "HDFC BANK 2501": "HDFC_2501",
    "HDFC BANK 6446": "HDFC_6446",
    "HDFC BANK 0445": "HDFC_0445",
    "PNB BANK 6011": "PNB_6011",
    "STATE BANK OF INDIA": "SBI",
    SBI: "SBI",
    "ICICI BANK": "ICICI",
    ICICI: "ICICI",
    "YES BANK 2011": "YESBANK_2011",
    "YES BANK 0771": "YESBANK_0771",
    "YESBANK 2011": "YESBANK_2011",
    "YESBANK 0771": "YESBANK_0771",
};

type TenderRow = {
    id: number;
    tenderNo: string;
    tenderName: string;
};

type ProjectRow = {
    id: number;
    poNo: string | null;
    projectName: string | null;
};

type Resolution =
    | {
        source: "tender";
        tenderId: number;
        projectId: null;
        tenderNo: string;
        projectName: string;
        candidates: string[];
    }
    | {
        source: "project";
        tenderId: 0;
        projectId: number;
        tenderNo: string;
        projectName: string;
        candidates: string[];
    }
    | {
        source: "unmatched" | "ambiguous";
        tenderId: 0;
        projectId: null;
        tenderNo: string;
        projectName: "Accounts/Admin";
        candidates: string[];
    };

type RowPlan = {
    rowNumber: number;
    reference: string | null;
    purposeCode: string;
    requestPurpose: string;
    bgNo: string;
    bankName: string | null;
    amount: number | null;
    bgFavour: string | null;
    bgAddress: string | null;
    bgDate: string | null;
    bgExpiryDate: string | null;
    bgClaimDate: string | null;
    stampValue: string | null;
    clientUserEmail: string | null;
    clientCpEmail: string | null;
    clientFinanceEmail: string | null;
    accountName: string | null;
    accountNo: string | null;
    ifsc: string | null;
    fdrPer: string | null;
    fdrAmt: string | null;
    fdrNo: string | null;
    fdrValidity: string | null;
    fdrRoi: string | null;
    bgChargeDeducted: string | null;
    sfmsChargeDeducted: string | null;
    stampChargeDeducted: string | null;
    otherChargeDeducted: string | null;
    resolution: Resolution;
    warnings: string[];
    invalidReason: string | null;
    skipReason: string | null;
};

type CreatedRow = {
    rowNumber: number;
    bgNo: string;
    requestId: number;
    instrumentId: number;
    resolution: Resolution["source"];
    matchedId: number | null;
};

const args = process.argv.slice(2);

const getArg = (name: string, fallback?: string): string | undefined => {
    const index = args.indexOf(name);
    if (index < 0) return fallback;
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : fallback;
};

const hasFlag = (name: string): boolean => args.includes(name);

const pad2 = (value: number): string => String(value).padStart(2, "0");

const formatYmd = (year: number, month: number, day: number): string | null => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return `${year}-${pad2(month)}-${pad2(day)}`;
};

const parseDate = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "") return null;

    if (value instanceof Date) {
        return formatYmd(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    const numeric = (input: unknown): string | null => {
        const number = typeof input === "number" ? input : Number(String(input).replace(/,/g, "").trim());
        if (!Number.isFinite(number)) return null;
        const whole = Math.trunc(number);

        if (whole >= 19000101 && whole <= 29991231) {
            const text = String(whole);
            return formatYmd(Number(text.slice(0, 4)), Number(text.slice(4, 6)), Number(text.slice(6, 8)));
        }

        if (whole <= 0 || whole > 100000) return null;
        const date = new Date(Date.UTC(1899, 11, 30) + whole * 86400000);
        return formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    };

    if (typeof value === "number") return numeric(value);

    const text = String(value).trim();
    if (!text) return null;

    if (/^\d+(\.\d+)?$/.test(text)) {
        const parsed = numeric(text);
        if (parsed) return parsed;
    }

    const dayFirst = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (dayFirst) {
        let year = Number(dayFirst[3]);
        if (dayFirst[3].length === 2) year += 2000;
        return formatYmd(year, Number(dayFirst[2]), Number(dayFirst[1]));
    }

    const yearFirst = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (yearFirst) {
        return formatYmd(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
    }

    return null;
};

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const cleaned = String(value).replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const toDecimal = (value: unknown, scale = 2): string | null => {
    const parsed = toNumber(value);
    return parsed === null ? null : parsed.toFixed(scale);
};

const toPercentDecimal = (value: unknown): string | null => {
    const parsed = toNumber(value);
    if (parsed === null) return null;
    const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
    return Number(percent.toFixed(4)).toFixed(2);
};

const cleanText = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    const text = typeof value === "string" ? value.trim() : String(value).trim();
    return text.length > 0 ? text : null;
};

const normalizeReference = (value: unknown): string =>
    String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s\u00a0]+/g, "")
        .replace(/[–—]/g, "-");

const normalizeBgNo = (value: unknown): string => String(value ?? "").trim().toUpperCase();

const purposeCodeFor = (value: unknown): string => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const key = text.toUpperCase().replace(/\s+/g, " ");
    return PURPOSE_CODE_MAP[key] ?? text.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
};

const requestPurposeFor = (purposeCode: string): string => REQUEST_PURPOSE_MAP[purposeCode] ?? "Other Payment";

const bankValueFor = (value: unknown): string | null => {
    const text = cleanText(value);
    if (!text) return null;
    const key = text.toUpperCase().replace(/\s+/g, " ");
    const mapped = BANK_BY_LABEL[key];
    if (mapped) return mapped;
    if (/^[A-Z0-9_]+$/.test(text.toUpperCase())) return text.toUpperCase();
    return text.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
};

const addToMap = <T>(map: Map<string, T[]>, key: string, value: T): void => {
    if (!key) return;
    const existing = map.get(key);
    if (existing) existing.push(value);
    else map.set(key, [value]);
};

const describeTender = (tender: TenderRow): string =>
    `tender #${tender.id} ${tender.tenderNo} (${tender.tenderName})`;

const describeProject = (project: ProjectRow): string =>
    `project #${project.id} ${project.poNo ?? "(no PO)"} (${project.projectName ?? "unnamed"})`;

const suggestReferences = (
    normalized: string,
    tenderMap: Map<string, TenderRow[]>,
    projectMap: Map<string, ProjectRow[]>,
): string[] => {
    const suggestions: string[] = [];

    for (const [key, rows] of tenderMap.entries()) {
        if (!key || !normalized) continue;
        if (key.includes(normalized) || normalized.includes(key)) {
            suggestions.push(...rows.map(describeTender));
            if (suggestions.length >= 3) return suggestions.slice(0, 3);
        }
    }

    for (const [key, rows] of projectMap.entries()) {
        if (!key || !normalized) continue;
        if (key.includes(normalized) || normalized.includes(key)) {
            suggestions.push(...rows.map(describeProject));
            if (suggestions.length >= 3) return suggestions.slice(0, 3);
        }
    }

    return suggestions.slice(0, 3);
};

const resolveReference = (
    rawReference: unknown,
    tenderMap: Map<string, TenderRow[]>,
    projectMap: Map<string, ProjectRow[]>,
): Resolution => {
    const reference = cleanText(rawReference);
    const normalized = normalizeReference(rawReference);

    if (!normalized) {
        return {
            source: "unmatched",
            tenderId: 0,
            projectId: null,
            tenderNo: reference ?? "NA",
            projectName: "Accounts/Admin",
            candidates: [],
        };
    }

    const tenders = tenderMap.get(normalized) ?? [];
    if (tenders.length === 1) {
        const tender = tenders[0];
        return {
            source: "tender",
            tenderId: tender.id,
            projectId: null,
            tenderNo: tender.tenderNo,
            projectName: tender.tenderName,
            candidates: [],
        };
    }

    const projectMatches = projectMap.get(normalized) ?? [];
    if (projectMatches.length === 1) {
        const project = projectMatches[0];
        return {
            source: "project",
            tenderId: 0,
            projectId: project.id,
            tenderNo: project.poNo ?? reference ?? "NA",
            projectName: project.projectName ?? "Accounts/Admin",
            candidates: [],
        };
    }

    if (tenders.length > 1 || projectMatches.length > 1) {
        return {
            source: "ambiguous",
            tenderId: 0,
            projectId: null,
            tenderNo: reference ?? "NA",
            projectName: "Accounts/Admin",
            candidates: [
                ...tenders.map(describeTender),
                ...projectMatches.map(describeProject),
            ].slice(0, 6),
        };
    }

    return {
        source: "unmatched",
        tenderId: 0,
        projectId: null,
        tenderNo: reference ?? "NA",
        projectName: "Accounts/Admin",
        candidates: suggestReferences(normalized, tenderMap, projectMap),
    };
};

const readWorkbook = (filePath: string, sheetName: string): unknown[][] => {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error(
            `Sheet "${sheetName}" not found in ${filePath}. Available sheets: ${workbook.SheetNames.join(", ")}`,
        );
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        raw: true,
        blankrows: false,
    });

    if (matrix.length === 0) {
        throw new Error(`Sheet "${sheetName}" is empty`);
    }

    return matrix;
};

const planRows = (
    matrix: unknown[][],
    tenderMap: Map<string, TenderRow[]>,
    projectMap: Map<string, ProjectRow[]>,
): { plans: RowPlan[]; headerError: string | null } => {
    const headerRow = matrix[0] ?? [];
    const headerIndex = new Map<string, number>();
    headerRow.forEach((header, index) => {
        const key = String(header ?? "").trim();
        if (key) headerIndex.set(key, index);
    });

    const missingHeaders = Object.values(HEADERS).filter((header) => !headerIndex.has(header));
    if (missingHeaders.length > 0) {
        return {
            plans: [],
            headerError: `Missing expected column(s): ${missingHeaders.join(", ")}`,
        };
    }

    const cell = (row: unknown[], header: string): unknown => {
        const index = headerIndex.get(header);
        if (index === undefined) return null;
        return row[index] ?? null;
    };

    const plans: RowPlan[] = [];

    for (let index = 1; index < matrix.length; index += 1) {
        const row = matrix[index] ?? [];
        const rowNumber = index + 1;
        const allEmpty = row.every((value) => value === null || value === undefined || String(value).trim() === "");
        if (allEmpty) continue;

        const warnings: string[] = [];
        const reference = cleanText(cell(row, HEADERS.reference));
        const bgNo = cleanText(cell(row, HEADERS.bgNo)) ?? "";
        const purposeCode = purposeCodeFor(cell(row, HEADERS.purpose));
        const requestPurpose = requestPurposeFor(purposeCode);
        const bankName = bankValueFor(cell(row, HEADERS.bankName));
        const amount = toNumber(cell(row, HEADERS.amount));

        const bgDateRaw = cell(row, HEADERS.bgDate);
        const bgExpiryRaw = cell(row, HEADERS.bgExpiryDate);
        const bgClaimRaw = cell(row, HEADERS.bgClaimPeriod);
        const fdrValidityRaw = cell(row, HEADERS.fdrValidity);

        const bgDate = parseDate(bgDateRaw);
        const bgExpiryDate = parseDate(bgExpiryRaw);
        const bgClaimDate = parseDate(bgClaimRaw);
        const fdrValidity = parseDate(fdrValidityRaw);

        if (cleanText(bgDateRaw) && !bgDate) warnings.push(`BG Creation Date could not be parsed: ${String(bgDateRaw)}`);
        if (cleanText(bgExpiryRaw) && !bgExpiryDate) warnings.push(`BG Expiry date could not be parsed: ${String(bgExpiryRaw)}`);
        if (cleanText(bgClaimRaw) && !bgClaimDate) warnings.push(`BG Claim period could not be parsed: ${String(bgClaimRaw)}`);
        if (cleanText(fdrValidityRaw) && !fdrValidity) warnings.push(`FDR Validity could not be parsed: ${String(fdrValidityRaw)}`);

        if (bgDate && bgExpiryDate && bgDate > bgExpiryDate) {
            warnings.push(`BG Creation Date (${bgDate}) is after BG Expiry date (${bgExpiryDate})`);
        }
        if (bgExpiryDate && bgClaimDate && bgExpiryDate > bgClaimDate) {
            warnings.push(`BG Expiry date (${bgExpiryDate}) is after BG Claim period (${bgClaimDate})`);
        }

        if (!bgDate) warnings.push("BG Creation Date is missing");
        if (!bgExpiryDate) warnings.push("BG Expiry date is missing");
        if (!bgClaimDate) warnings.push("BG Claim period is missing");
        if (!fdrValidity) warnings.push("FDR Validity is missing");
        if (!cleanText(cell(row, HEADERS.bgFavour))) warnings.push("BG in favour of is missing");
        if (!cleanText(cell(row, HEADERS.bgAddress))) warnings.push("BG Address is missing");
        if (toNumber(cell(row, HEADERS.stampValue)) === null) warnings.push("BG Stamp paper value is missing");
        if (toNumber(cell(row, HEADERS.fdrPer)) === null) warnings.push("FDR %age is missing");
        if (toNumber(cell(row, HEADERS.fdrAmt)) === null) warnings.push("FDR amount is missing");
        if (!cleanText(cell(row, HEADERS.fdrNo))) warnings.push("FDR No. is missing");
        if (toNumber(cell(row, HEADERS.fdrRoi)) === null) warnings.push("FDR ROI% is missing");

        const resolution = resolveReference(cell(row, HEADERS.reference), tenderMap, projectMap);
        if (resolution.source === "unmatched") {
            warnings.push("No tender/PO match; saved under Accounts/Admin");
        }
        if (resolution.source === "ambiguous") {
            warnings.push(
                `Multiple tender/PO matches; saved under Accounts/Admin (${resolution.candidates.join(" | ")})`,
            );
        }

        let invalidReason: string | null = null;
        if (!bgNo) invalidReason = "BG No. is missing";
        else if (!purposeCode) invalidReason = "Purpose is missing";
        else if (!bankName) invalidReason = "Bank Name is missing";
        else if (amount === null || amount <= 0) invalidReason = "BG Amount must be greater than 0";

        plans.push({
            rowNumber,
            reference,
            purposeCode,
            requestPurpose,
            bgNo,
            bankName,
            amount,
            bgFavour: cleanText(cell(row, HEADERS.bgFavour)),
            bgAddress: cleanText(cell(row, HEADERS.bgAddress)),
            bgDate,
            bgExpiryDate,
            bgClaimDate,
            stampValue: toDecimal(cell(row, HEADERS.stampValue)),
            clientUserEmail: cleanText(cell(row, HEADERS.clientUserEmail)),
            clientCpEmail: cleanText(cell(row, HEADERS.clientCpEmail)),
            clientFinanceEmail: cleanText(cell(row, HEADERS.clientFinanceEmail)),
            accountName: cleanText(cell(row, HEADERS.accountName)),
            accountNo: cleanText(cell(row, HEADERS.accountNo)),
            ifsc: cleanText(cell(row, HEADERS.ifsc)),
            fdrPer: toPercentDecimal(cell(row, HEADERS.fdrPer)),
            fdrAmt: toDecimal(cell(row, HEADERS.fdrAmt)),
            fdrNo: cleanText(cell(row, HEADERS.fdrNo)),
            fdrValidity,
            fdrRoi: toPercentDecimal(cell(row, HEADERS.fdrRoi)),
            bgChargeDeducted: toDecimal(cell(row, HEADERS.bgChargeDeducted)),
            sfmsChargeDeducted: toDecimal(cell(row, HEADERS.sfmsChargeDeducted)),
            stampChargeDeducted: toDecimal(cell(row, HEADERS.stampChargeDeducted)),
            otherChargeDeducted: toDecimal(cell(row, HEADERS.otherChargeDeducted)),
            resolution,
            warnings,
            invalidReason,
            skipReason: null,
        });
    }

    return { plans, headerError: null };
};

const markDuplicates = (plans: RowPlan[], existingBgNumbers: Set<string>): void => {
    const seen = new Set<string>();

    for (const plan of plans) {
        if (plan.invalidReason || !plan.bgNo) continue;
        const normalized = normalizeBgNo(plan.bgNo);

        if (seen.has(normalized)) {
            plan.skipReason = `Duplicate BG No. in workbook (${plan.bgNo})`;
            continue;
        }
        seen.add(normalized);

        if (existingBgNumbers.has(normalized)) {
            plan.skipReason = `BG No. already exists in database (${plan.bgNo})`;
        }
    }
};

const describeResolution = (resolution: Resolution): string => {
    switch (resolution.source) {
        case "tender":
            return `tender #${resolution.tenderId} (${resolution.tenderNo})`;
        case "project":
            return `project #${resolution.projectId} (${resolution.tenderNo})`;
        case "ambiguous":
            return "ambiguous -> Accounts/Admin";
        default:
            return "unmatched -> Accounts/Admin";
    }
};

const formatPlanLine = (plan: RowPlan): string => {
    const flags: string[] = [];
    if (plan.invalidReason) flags.push(`INVALID: ${plan.invalidReason}`);
    if (plan.skipReason) flags.push(`SKIP: ${plan.skipReason}`);
    if (plan.warnings.length > 0) flags.push(`WARN: ${plan.warnings.join("; ")}`);

    return (
        `row ${plan.rowNumber}: ${plan.reference ?? "(blank)"} | ${describeResolution(plan.resolution)} | ` +
        `BG ${plan.bgNo || "(blank)"} | ${plan.resolution.projectName}` +
        (flags.length > 0 ? ` | ${flags.join(" | ")}` : "")
    );
};

const insertPlans = async (
    db: Db,
    plans: RowPlan[],
    createdBy: number,
    importUser: { name: string; roleId: number | null },
    runId: string,
    sourceFile: string,
    sheetName: string,
    log: (line: string) => void,
): Promise<CreatedRow[]> => {
    const created: CreatedRow[] = [];

    await db.transaction(async (tx) => {
        for (const plan of plans) {
            if (!plan.bankName || plan.amount === null) {
                throw new Error(`Row ${plan.rowNumber}: bank and amount are required`);
            }

            const matchedId =
                plan.resolution.source === "tender"
                    ? plan.resolution.tenderId
                    : plan.resolution.source === "project"
                        ? plan.resolution.projectId
                        : null;

            const [request] = await tx
                .insert(paymentRequests)
                .values({
                    tenderId: plan.resolution.tenderId,
                    projectId: plan.resolution.projectId,
                    type: "Old Entries",
                    tenderNo: plan.resolution.tenderNo,
                    projectName: plan.resolution.projectName,
                    requestedBy: createdBy,
                    purpose: plan.requestPurpose as any,
                    amountRequired: plan.amount.toFixed(2),
                })
                .returning({ id: paymentRequests.id });

            const [instrument] = await tx
                .insert(paymentInstruments)
                .values({
                    requestId: request.id,
                    instrumentType: "BG",
                    purpose: plan.purposeCode,
                    amount: plan.amount.toFixed(2),
                    favouring: plan.bgFavour,
                    payableAt: plan.bgAddress,
                    issueDate: plan.bgDate,
                    expiryDate: plan.bgExpiryDate,
                    claimExpiryDate: plan.bgClaimDate,
                    action: 2,
                    status: "BG_CREATED",
                    isActive: true,
                    legacyData: {
                        source: path.basename(sourceFile),
                        sheet: sheetName,
                        row: plan.rowNumber,
                        runId,
                        importedAt: new Date().toISOString(),
                        matchedFrom: plan.resolution.source,
                        matchedId,
                        excelReference: plan.reference,
                    },
                })
                .returning({ id: paymentInstruments.id });

            await tx.insert(instrumentBgDetails).values({
                instrumentId: instrument.id,
                bgNo: plan.bgNo,
                bgDate: plan.bgDate,
                bgExpiryDate: plan.bgExpiryDate,
                bgClaim: plan.bgClaimDate,
                claimExpiryDate: plan.bgClaimDate,
                beneficiaryName: plan.bgFavour,
                beneficiaryAddress: plan.bgAddress,
                bankName: plan.bankName,
                bgBankAccName: plan.accountName,
                bgBankAcc: plan.accountNo,
                bgBankIfsc: plan.ifsc,
                bgPurpose: plan.purposeCode,
                bgClientUser: plan.clientUserEmail,
                bgClientCp: plan.clientCpEmail,
                bgClientFin: plan.clientFinanceEmail,
                stampCharges: plan.stampValue,
                fdrPer: plan.fdrPer,
                fdrAmt: plan.fdrAmt,
                fdrNo: plan.fdrNo,
                fdrValidity: plan.fdrValidity,
                fdrRoi: plan.fdrRoi,
                bgChargeDeducted: plan.bgChargeDeducted,
                sfmsChargesDeducted: plan.sfmsChargeDeducted,
                stampChargesDeducted: plan.stampChargeDeducted,
                otherChargesDeducted: plan.otherChargeDeducted,
            });

            await tx.insert(instrumentStatusHistory).values({
                instrumentId: instrument.id,
                fromStatus: "",
                toStatus: "BG_CREATED",
                fromAction: 0,
                toAction: 2,
                fromStage: 0,
                toStage: 2,
                formData: {
                    source: "Old BG import",
                    file: path.basename(sourceFile),
                    sheet: sheetName,
                    row: plan.rowNumber,
                },
                changedBy: createdBy,
                changedByName: importUser.name,
                changedByRole: String(importUser.roleId ?? ""),
                ipAddress: "",
                userAgent: "",
            });

            created.push({
                rowNumber: plan.rowNumber,
                bgNo: plan.bgNo,
                requestId: request.id,
                instrumentId: instrument.id,
                resolution: plan.resolution.source,
                matchedId,
            });

            log(`INSERTED row ${plan.rowNumber}: BG ${plan.bgNo} -> request ${request.id}, instrument ${instrument.id}`);
        }
    });

    return created;
};

const rollback = async (db: Db, manifestPath: string): Promise<void> => {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
    }

    const entries = fs
        .readFileSync(manifestPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { requestId: number; instrumentId: number });

    const requestIds = [...new Set(entries.map((entry) => entry.requestId).filter((id) => Number.isInteger(id)))];
    const instrumentIds = [...new Set(entries.map((entry) => entry.instrumentId).filter((id) => Number.isInteger(id)))];

    if (requestIds.length === 0 && instrumentIds.length === 0) {
        console.log("Manifest has no request/instrument IDs; nothing to roll back.");
        return;
    }

    await db.transaction(async (tx) => {
        if (instrumentIds.length > 0) {
            await tx.delete(instrumentStatusHistory).where(inArray(instrumentStatusHistory.instrumentId, instrumentIds));
            await tx.delete(instrumentBgDetails).where(inArray(instrumentBgDetails.instrumentId, instrumentIds));
            await tx.delete(paymentInstruments).where(inArray(paymentInstruments.id, instrumentIds));
        }
        if (requestIds.length > 0) {
            await tx.delete(paymentRequests).where(inArray(paymentRequests.id, requestIds));
        }
    });

    console.log(
        `Rolled back ${instrumentIds.length} instrument(s) and ${requestIds.length} payment request(s) from ${manifestPath}`,
    );
};

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set");
    }

    const rollbackPath = getArg("--rollback");
    const apply = hasFlag("--apply");
    const filePath = path.resolve(process.cwd(), getArg("--file", "../old-bgs.xlsx") ?? "../old-bgs.xlsx");
    const sheetName = getArg("--sheet", "Sheet1") ?? "Sheet1";
    const createdBy = Number(getArg("--created-by", "13"));

    if (!Number.isInteger(createdBy) || createdBy <= 0) {
        throw new Error(`Invalid --created-by value: ${getArg("--created-by", "13")}`);
    }
    if (apply && rollbackPath) {
        throw new Error("Use either --apply or --rollback, not both");
    }

    const pool = createPool(databaseUrl);
    const db = createDb(pool);

    try {
        if (rollbackPath) {
            await rollback(db, path.resolve(process.cwd(), rollbackPath));
            return;
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`Workbook not found: ${filePath}`);
        }

        const [importUser] = await db
            .select({ id: users.id, name: users.name, roleId: users.roleId, isActive: users.isActive })
            .from(users)
            .where(eq(users.id, createdBy))
            .limit(1);

        if (!importUser) {
            throw new Error(`User ${createdBy} (created by) was not found`);
        }

        const runId = new Date().toISOString().replace(/[:.]/g, "-");
        const logDir = path.resolve(process.cwd(), "migration-logs");
        fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, `old-bgs-${apply ? "" : "dryrun-"}${runId}.log.txt`);
        const manifestPath = path.join(logDir, `old-bgs-${runId}.manifest.ndjson`);

        const log = (line: string): void => {
            console.log(line);
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
        };

        log(`File: ${filePath}`);
        log(`Sheet: ${sheetName}`);
        log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
        log(`Created by: ${createdBy} (${importUser.name})`);
        log(`Log: ${logPath}`);
        if (apply) log(`Manifest: ${manifestPath}`);
        if (!importUser.isActive) log(`WARNING: user ${createdBy} is inactive`);

        const matrix = readWorkbook(filePath, sheetName);

        const tenderRows = await db
            .select({ id: tenderInfos.id, tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
            .from(tenderInfos)
            .where(eq(tenderInfos.deleteStatus, 0));

        const projectRows = await db
            .select({ id: projects.id, poNo: projects.poNo, projectName: projects.projectName })
            .from(projects);

        const tenderMap = new Map<string, TenderRow[]>();
        for (const tender of tenderRows) addToMap(tenderMap, normalizeReference(tender.tenderNo), tender);

        const projectMap = new Map<string, ProjectRow[]>();
        for (const project of projectRows) {
            if (project.poNo) addToMap(projectMap, normalizeReference(project.poNo), project);
        }

        const { plans, headerError } = planRows(matrix, tenderMap, projectMap);
        if (headerError) throw new Error(headerError);

        const existingBgRows = await db.select({ bgNo: instrumentBgDetails.bgNo }).from(instrumentBgDetails);
        const existingBgNumbers = new Set(
            existingBgRows.map((row) => normalizeBgNo(row.bgNo)).filter((bgNo) => bgNo.length > 0),
        );
        markDuplicates(plans, existingBgNumbers);

        log(`Rows read: ${plans.length}`);
        log(`Tenders loaded: ${tenderRows.length}`);
        log(`Projects loaded: ${projectRows.length}`);

        for (const plan of plans) {
            log(formatPlanLine(plan));
        }

        const ready = plans.filter((plan) => !plan.invalidReason && !plan.skipReason);
        const invalid = plans.filter((plan) => plan.invalidReason);
        const skipped = plans.filter((plan) => plan.skipReason);
        const warned = plans.filter((plan) => plan.warnings.length > 0);

        log(`Ready to import: ${ready.length}`);
        log(`Skipped: ${skipped.length}`);
        log(`Invalid: ${invalid.length}`);
        log(`Rows with warnings: ${warned.length}`);

        if (!apply) {
            log("Dry run complete. Re-run with --apply to write the ready rows.");
            return;
        }

        if (ready.length === 0) {
            log("Nothing to import.");
            return;
        }

        const created = await insertPlans(db, ready, createdBy, importUser, runId, filePath, sheetName, log);
        const manifest = created
            .map((row) => JSON.stringify({ ...row, runId, createdAt: new Date().toISOString() }))
            .join("\n");
        fs.writeFileSync(manifestPath, `${manifest}\n`);

        log(`Import complete: ${created.length} row(s) inserted.`);
        log(`Rollback with: pnpm import:old-bgs --rollback ${manifestPath}`);
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
