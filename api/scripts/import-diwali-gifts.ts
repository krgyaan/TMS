/**
 * One-off import: reads the Diwali gifts workbook (`Diwali Gifts.xlsx`) and
 * creates courier dispatch records in the `couriers` table.
 *
 * Usage (from api/; DATABASE_URL is loaded from api/.env):
 *   pnpm exec tsx scripts/import-diwali-gifts.ts
 *   pnpm exec tsx scripts/import-diwali-gifts.ts --file "/home/gyan/Downloads/Diwali Gifts.xlsx" --apply
 *   pnpm exec tsx scripts/import-diwali-gifts.ts --rollback migration-logs/diwali-gifts-<runId>.manifest.ndjson
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
import { couriers } from "../src/db/schemas/shared/couriers.schema";
import { users } from "../src/db/schemas/auth/users.schema";

type Db = ReturnType<typeof createDb>;

const COURIER_STATUS = {
    PENDING: 0,
    DISPATCHED: 2,
    NOT_DELIVERED: 3,
    DELIVERED: 4,
} as const;

const DEFAULTS = {
    file: "/home/gyan/Downloads/Diwali Gifts.xlsx",
    sheet: "Sheet1",
    sender: "75",
    urgency: "2",
    blankOrg: "Individual",
} as const;

const HEADERS = {
    from: "from ( name )",
    toOrg: "organization name",
    toName: "name",
    toAddr: "address",
    toPin: "pincode",
    toMobile: "mobile number",
    provider: "provider",
    pickup: "pickup date",
    docket: "docket no",
    delivery: "delivery date",
} as const;

type HeaderKey = keyof typeof HEADERS;

type RowPlan = {
    rowNumber: number;
    toOrg: string;
    toName: string;
    toAddr: string;
    toPin: string;
    toMobile: string;
    courierProvider: string | null;
    pickupDate: Date | null;
    docketNo: string | null;
    deliveryDate: Date | null;
    delDate: Date;
    urgency: number;
    status: number;
    warnings: string[];
    invalidReason: string | null;
    skipReason: string | null;
};

type CreatedRow = {
    rowNumber: number;
    courierId: number;
    toName: string;
    docketNo: string | null;
};

const args = process.argv.slice(2);

const getArg = (name: string, fallback?: string): string | undefined => {
    const index = args.indexOf(name);
    if (index < 0) return fallback;
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : fallback;
};

const hasFlag = (name: string): boolean => args.includes(name);

const normalizeText = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const normalizeHeader = (value: unknown): string => normalizeText(value).toLowerCase();

const toIdentifier = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return Number.isFinite(value) ? String(Math.trunc(value)) : "";
    return normalizeText(value);
};

const parseDateTime = (value: unknown): Date | null => {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const text = normalizeText(value);
    if (!text) return null;

    const match = text.match(
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i,
    );
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += 2000;

    let hour = match[4] ? Number(match[4]) : 0;
    const minute = match[5] ? Number(match[5]) : 0;
    const second = match[6] ? Number(match[6]) : 0;
    const meridiem = match[7]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    const date = new Date(year, month - 1, day, hour, minute, second);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour
    ) {
        return null;
    }

    return date;
};

const startOfToday = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

const buildHeaderIndex = (headerRow: unknown[]): Map<HeaderKey, number> => {
    const byName = new Map<string, number>();
    headerRow.forEach((cell, index) => {
        byName.set(normalizeHeader(cell), index);
    });

    const index = new Map<HeaderKey, number>();
    const missing: string[] = [];
    (Object.keys(HEADERS) as HeaderKey[]).forEach((key) => {
        const position = byName.get(HEADERS[key]);
        if (position === undefined) {
            missing.push(HEADERS[key]);
        } else {
            index.set(key, position);
        }
    });

    if (missing.length > 0) {
        throw new Error(`Missing expected column(s): ${missing.join(", ")}`);
    }

    return index;
};

const planRows = (
    matrix: unknown[][],
    urgency: number,
    blankOrg: string,
    fallbackDate: Date,
): { plans: RowPlan[]; headerError: string | null } => {
    const headerRow = matrix[0] ?? [];
    let headerIndex: Map<HeaderKey, number>;
    try {
        headerIndex = buildHeaderIndex(headerRow);
    } catch (error: unknown) {
        return { plans: [], headerError: error instanceof Error ? error.message : String(error) };
    }

    const cell = (row: unknown[], key: HeaderKey): unknown => {
        const position = headerIndex.get(key);
        return position === undefined ? null : row[position] ?? null;
    };

    const plans: RowPlan[] = [];

    for (let i = 1; i < matrix.length; i += 1) {
        const row = matrix[i];
        if (!row || row.every((value) => normalizeText(value) === "")) continue;

        const rowNumber = i + 1;
        const warnings: string[] = [];

        const toOrgRaw = normalizeText(cell(row, "toOrg"));
        const toName = normalizeText(cell(row, "toName"));
        const toAddr = normalizeText(cell(row, "toAddr"));
        const toPin = toIdentifier(cell(row, "toPin"));
        const toMobile = toIdentifier(cell(row, "toMobile"));
        const providerRaw = normalizeText(cell(row, "provider"));
        const docketRaw = toIdentifier(cell(row, "docket"));
        const pickupRaw = cell(row, "pickup");
        const deliveryRaw = cell(row, "delivery");

        const pickupDate = parseDateTime(pickupRaw);
        const isReturn = /return/i.test(normalizeText(deliveryRaw));
        const deliveryDate = isReturn ? null : parseDateTime(deliveryRaw);

        if (pickupRaw && !pickupDate) warnings.push(`Unparsed pickup date: ${normalizeText(pickupRaw)}`);
        if (deliveryRaw && !deliveryDate && !isReturn) {
            warnings.push(`Unparsed delivery date: ${normalizeText(deliveryRaw)}`);
        }

        let status = COURIER_STATUS.PENDING;
        if (deliveryDate) {
            status = COURIER_STATUS.DELIVERED;
        } else if (isReturn) {
            status = COURIER_STATUS.NOT_DELIVERED;
        } else if (providerRaw || docketRaw || pickupDate) {
            status = COURIER_STATUS.DISPATCHED;
        }

        const delDate = deliveryDate ?? pickupDate ?? fallbackDate;
        if (!deliveryDate && !pickupDate) {
            warnings.push("No delivery/pickup date; delDate fell back to default date");
        }

        const invalidReasons: string[] = [];
        if (!toName) invalidReasons.push("missing recipient name");
        if (!toAddr) invalidReasons.push("missing address");
        if (!toPin) invalidReasons.push("missing pincode");
        if (!toMobile) invalidReasons.push("missing mobile number");

        const toOrg = toOrgRaw || blankOrg;
        if (!toOrgRaw) warnings.push(`Blank organization set to "${blankOrg}"`);

        plans.push({
            rowNumber,
            toOrg,
            toName,
            toAddr,
            toPin,
            toMobile,
            courierProvider: providerRaw || null,
            pickupDate,
            docketNo: docketRaw || null,
            deliveryDate,
            delDate,
            urgency,
            status,
            warnings,
            invalidReason: invalidReasons.length > 0 ? invalidReasons.join(", ") : null,
            skipReason: null,
        });
    }

    return { plans, headerError: null };
};

const markDuplicates = (plans: RowPlan[], existingDockets: Set<string>): void => {
    const seenInFile = new Set<string>();

    for (const plan of plans) {
        if (!plan.docketNo) continue;

        const docket = plan.docketNo.toLowerCase();
        if (existingDockets.has(docket)) {
            plan.skipReason = `docket ${plan.docketNo} already exists in couriers`;
        } else if (seenInFile.has(docket)) {
            plan.skipReason = `docket ${plan.docketNo} duplicated in workbook`;
        }
        seenInFile.add(docket);
    }
};

const formatPlanLine = (plan: RowPlan): string => {
    const statusLabel = Object.entries(COURIER_STATUS).find(([, value]) => value === plan.status)?.[0] ?? String(plan.status);
    const parts = [
        `row ${plan.rowNumber}`,
        `${plan.toName} @ ${plan.toOrg}`,
        `docket=${plan.docketNo ?? "-"}`,
        `status=${statusLabel}`,
        `delDate=${plan.delDate.toISOString()}`,
    ];
    if (plan.invalidReason) parts.push(`INVALID: ${plan.invalidReason}`);
    if (plan.skipReason) parts.push(`SKIP: ${plan.skipReason}`);
    if (plan.warnings.length > 0) parts.push(`warnings: ${plan.warnings.join("; ")}`);
    return parts.join(" | ");
};

const insertPlans = async (db: Db, plans: RowPlan[], senderId: number, log: (line: string) => void): Promise<CreatedRow[]> => {
    const created: CreatedRow[] = [];

    await db.transaction(async (tx) => {
        const inserted = await tx
            .insert(couriers)
            .values(
                plans.map((plan) => ({
                    userId: senderId,
                    toOrg: plan.toOrg,
                    toName: plan.toName,
                    toAddr: plan.toAddr,
                    toPin: plan.toPin,
                    toMobile: plan.toMobile,
                    empFrom: senderId,
                    delDate: plan.delDate,
                    urgency: plan.urgency,
                    courierDocs: [],
                    status: plan.status,
                    trackingNumber: null,
                    courierProvider: plan.courierProvider,
                    pickupDate: plan.pickupDate,
                    docketNo: plan.docketNo,
                    docketSlip: null,
                    deliveryDate: plan.deliveryDate,
                    deliveryPod: null,
                    withinTime: null,
                })),
            )
            .returning({ id: couriers.id, toName: couriers.toName, docketNo: couriers.docketNo });

        inserted.forEach((row, index) => {
            const plan = plans[index];
            created.push({
                rowNumber: plan.rowNumber,
                courierId: row.id,
                toName: row.toName,
                docketNo: row.docketNo,
            });
            log(`INSERTED row ${plan.rowNumber}: courier ${row.id} -> ${row.toName} (${row.docketNo ?? "-"})`);
        });
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
        .map((line) => JSON.parse(line) as { courierId: number });

    const courierIds = [...new Set(entries.map((entry) => entry.courierId).filter((id) => Number.isInteger(id)))];

    if (courierIds.length === 0) {
        console.log("Manifest has no courier IDs; nothing to roll back.");
        return;
    }

    await db.delete(couriers).where(inArray(couriers.id, courierIds));

    console.log(`Rolled back ${courierIds.length} courier(s) from ${manifestPath}`);
};

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not set");
    }

    const rollbackPath = getArg("--rollback");
    const apply = hasFlag("--apply");
    const filePath = path.resolve(getArg("--file", DEFAULTS.file) ?? DEFAULTS.file);
    const sheetName = getArg("--sheet", DEFAULTS.sheet) ?? DEFAULTS.sheet;
    const senderId = Number(getArg("--sender", DEFAULTS.sender));
    const urgency = Number(getArg("--urgency", DEFAULTS.urgency));
    const blankOrg = getArg("--blank-org", DEFAULTS.blankOrg) ?? DEFAULTS.blankOrg;

    if (!Number.isInteger(senderId) || senderId <= 0) {
        throw new Error(`Invalid --sender value: ${getArg("--sender", DEFAULTS.sender)}`);
    }
    if (urgency !== 1 && urgency !== 2) {
        throw new Error(`Invalid --urgency value: ${urgency} (expected 1 or 2)`);
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

        const [sender] = await db
            .select({ id: users.id, name: users.name, isActive: users.isActive })
            .from(users)
            .where(eq(users.id, senderId))
            .limit(1);

        if (!sender) {
            throw new Error(`Sender user ${senderId} was not found`);
        }

        const runId = new Date().toISOString().replace(/[:.]/g, "-");
        const logDir = path.resolve(process.cwd(), "migration-logs");
        fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, `diwali-gifts-${apply ? "" : "dryrun-"}${runId}.log.txt`);
        const manifestPath = path.join(logDir, `diwali-gifts-${runId}.manifest.ndjson`);

        const log = (line: string): void => {
            console.log(line);
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
        };

        log(`File: ${filePath}`);
        log(`Sheet: ${sheetName}`);
        log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
        log(`Sender: ${senderId} (${sender.name})`);
        log(`Urgency: ${urgency}`);
        log(`Log: ${logPath}`);
        if (apply) log(`Manifest: ${manifestPath}`);
        if (!sender.isActive) log(`WARNING: sender ${senderId} is inactive`);

        const matrix = readWorkbook(filePath, sheetName);
        const fallbackDate = startOfToday();
        const { plans, headerError } = planRows(matrix, urgency, blankOrg, fallbackDate);
        if (headerError) throw new Error(headerError);

        const dockets = plans
            .map((plan) => plan.docketNo)
            .filter((docket): docket is string => Boolean(docket));

        const existingDockets = new Set<string>();
        if (dockets.length > 0) {
            const rows = await db
                .select({ docketNo: couriers.docketNo })
                .from(couriers)
                .where(inArray(couriers.docketNo, dockets));
            for (const row of rows) {
                if (row.docketNo) existingDockets.add(row.docketNo.toLowerCase());
            }
        }
        markDuplicates(plans, existingDockets);

        log(`Rows read: ${plans.length}`);
        for (const plan of plans) {
            log(formatPlanLine(plan));
        }

        const ready = plans.filter((plan) => !plan.invalidReason && !plan.skipReason);
        const invalid = plans.filter((plan) => plan.invalidReason);
        const skipped = plans.filter((plan) => plan.skipReason);

        log(`Ready to import: ${ready.length}`);
        log(`Skipped (duplicates): ${skipped.length}`);
        log(`Invalid: ${invalid.length}`);

        if (!apply) {
            log("Dry run complete. Re-run with --apply to write the ready rows.");
            return;
        }

        if (ready.length === 0) {
            log("Nothing to import.");
            return;
        }

        const created = await insertPlans(db, ready, senderId, log);
        const manifest = created
            .map((row) => JSON.stringify({ ...row, runId, createdAt: new Date().toISOString() }))
            .join("\n");
        fs.writeFileSync(manifestPath, `${manifest}\n`);

        log(`Import complete: ${created.length} row(s) inserted.`);
        log(`Rollback with: pnpm exec tsx scripts/import-diwali-gifts.ts --rollback ${manifestPath}`);
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
