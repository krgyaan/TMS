import "dotenv/config";
import { readFileSync } from "node:fs";
import { and, eq, inArray } from "drizzle-orm";
import { createDb, createPool } from "../src/db";
import { tallyLedgers, users } from "../src/db/schemas";
import type { TallyLedgerRole } from "../src/modules/integrations/tally/ledgers/ledger-name";
import { normalizeLedgerName, parseEmployeeLedgerName, roleFromSuffix } from "../src/modules/integrations/tally/ledgers/ledger-name";

type RoleColumn = "imprestLedgerId" | "salaryLedgerId" | "salaryPayableLedgerId";

const ROLE_COLUMN: Record<TallyLedgerRole, RoleColumn> = {
    imprest: "imprestLedgerId",
    salary: "salaryLedgerId",
    salary_payable: "salaryPayableLedgerId",
};

const USAGE = `Usage: pnpm tally:link-employee-ledgers --file=scripts/csv/tally-employee-ledgers.csv [--apply] [--company="VEPL 2025-26"]

CSV columns: user_id, ledger_name [, role]
  - user_id       TMS users.id
  - ledger_name   exact Tally ledger name, e.g. "PIYUSH GOYAL (VEP001) Imprest"
  - role          optional: imprest | salary | salary_payable; derived from the name when omitted

Without --apply it only validates and prints the planned changes.`;

interface CsvRow {
    line: number;
    userId: number;
    ledgerName: string;
    role: TallyLedgerRole | null;
    roleRaw: string;
    roleProvided: boolean;
}

interface PlannedLink {
    userId: number;
    userName: string;
    role: TallyLedgerRole;
    ledgerId: number;
    ledgerName: string;
    previousLedgerId: number | null;
}

function fail(message: string): never {
    console.error(message);
    process.exit(2);
}

function parseArgs(argv: string[]): { file: string; apply: boolean; company: string } {
    let file = "";
    let apply = false;
    let company = process.env.TALLY_COMPANY?.trim() ?? "";

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === "--help" || arg === "-h") {
            console.log(USAGE);
            process.exit(0);
        }

        if (arg === "--apply") {
            apply = true;
            continue;
        }

        const [key, inline] = arg.split("=", 2);
        const value = inline ?? argv[index + 1];

        if (inline === undefined) {
            index += 1;
        }

        if (key === "--file" && value) {
            file = value;
        } else if (key === "--company" && value) {
            company = value;
        } else {
            fail(`Unknown argument: ${arg}\n\n${USAGE}`);
        }
    }

    if (!file) {
        fail(`--file is required\n\n${USAGE}`);
    }

    if (!company) {
        fail("--company or TALLY_COMPANY is required");
    }

    return { file, apply, company };
}

function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (inQuotes) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char !== "\r") {
            field += char;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(cells => cells.some(cell => cell.trim().length > 0)).map(cells => cells.map(cell => cell.replace(/^\ufeff/, "").trim()));
}

function normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/^\ufeff/, "").replace(/\s+/g, "_");
}

function parseRole(value: string): TallyLedgerRole | null {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
        return null;
    }

    if (normalized === "imprest") {
        return "imprest";
    }

    if (normalized === "salary" || normalized === "salary_a/c" || normalized === "salary a/c") {
        return "salary";
    }

    if (normalized === "salary_payable" || normalized === "salary payable" || normalized === "salary_payable_a/c") {
        return "salary_payable";
    }

    return roleFromSuffix(value);
}

async function main(): Promise<void> {
    const { file, apply, company } = parseArgs(process.argv.slice(2));
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        fail("DATABASE_URL is not set");
    }

    const text = readFileSync(file, "utf8");
    const [header, ...dataRows] = parseCsv(text);

    if (!header) {
        fail("The CSV is empty");
    }

    const headerIndex = new Map(header.map((name, index) => [normalizeHeader(name), index]));
    const userIdIndex = headerIndex.get("user_id") ?? headerIndex.get("userid");
    const ledgerNameIndex = headerIndex.get("ledger_name");
    const roleIndex = headerIndex.get("role");

    if (userIdIndex === undefined || ledgerNameIndex === undefined) {
        fail("The CSV must contain user_id and ledger_name columns");
    }

    const rows: CsvRow[] = dataRows.map((cells, index) => {
        const roleRaw = roleIndex === undefined ? "" : (cells[roleIndex] ?? "").trim();

        return {
            line: index + 2,
            userId: Number(cells[userIdIndex]),
            ledgerName: cells[ledgerNameIndex] ?? "",
            role: parseRole(roleRaw),
            roleRaw,
            roleProvided: roleRaw.length > 0,
        };
    });

    const errors: string[] = [];
    const userIds = [...new Set(rows.map(row => row.userId).filter(id => Number.isInteger(id) && id > 0))];
    const normalizedNames = [...new Set(rows.map(row => normalizeLedgerName(row.ledgerName)).filter(name => name.length > 0))];

    const pool = createPool(databaseUrl);
    const db = createDb(pool);

    try {
        const userRows =
            userIds.length > 0
                ? await db
                      .select({
                          id: users.id,
                          name: users.name,
                          imprestLedgerId: users.imprestLedgerId,
                          salaryLedgerId: users.salaryLedgerId,
                          salaryPayableLedgerId: users.salaryPayableLedgerId,
                      })
                      .from(users)
                      .where(inArray(users.id, userIds))
                : [];

        const ledgerRows =
            normalizedNames.length > 0
                ? await db
                      .select({ id: tallyLedgers.id, name: tallyLedgers.name, nameNormalized: tallyLedgers.nameNormalized, isActive: tallyLedgers.isActive })
                      .from(tallyLedgers)
                      .where(and(eq(tallyLedgers.company, company), inArray(tallyLedgers.nameNormalized, normalizedNames)))
                : [];

        const usersById = new Map(userRows.map(user => [user.id, user] as const));
        const ledgersByName = new Map(ledgerRows.map(ledger => [ledger.nameNormalized, ledger] as const));
        const plannedKeys = new Set<string>();
        const planned: PlannedLink[] = [];

        for (const row of rows) {
            const label = `line ${row.line}`;

            if (!Number.isInteger(row.userId) || row.userId <= 0) {
                errors.push(`${label}: user_id "${row.userId}" is not a positive integer`);
                continue;
            }

            const user = usersById.get(row.userId);

            if (!user) {
                errors.push(`${label}: TMS user ${row.userId} does not exist`);
                continue;
            }

            const parsed = parseEmployeeLedgerName(row.ledgerName);

            if (!parsed) {
                errors.push(`${label}: "${row.ledgerName}" is not an employee ledger name`);
                continue;
            }

            if (row.roleProvided && row.role === null) {
                errors.push(`${label}: role "${row.roleRaw}" is not recognised (use imprest, salary or salary_payable)`);
                continue;
            }

            const role = row.role ?? parsed.role;

            if (row.roleProvided && row.role !== null && row.role !== parsed.role) {
                errors.push(`${label}: role "${row.role}" does not match the ledger suffix ("${parsed.role}")`);
                continue;
            }

            const key = `${row.userId}:${role}`;

            if (plannedKeys.has(key)) {
                errors.push(`${label}: user ${row.userId} has more than one ledger for role "${role}"`);
                continue;
            }

            const ledger = ledgersByName.get(normalizeLedgerName(row.ledgerName));

            if (!ledger) {
                errors.push(`${label}: ledger "${row.ledgerName}" is not synced; run pnpm tally:sync-ledgers first`);
                continue;
            }

            if (!ledger.isActive) {
                errors.push(`${label}: ledger "${row.ledgerName}" is inactive in Tally`);
                continue;
            }

            plannedKeys.add(key);
            planned.push({
                userId: row.userId,
                userName: user.name,
                role,
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                previousLedgerId: user[ROLE_COLUMN[role]],
            });
        }

        const output = {
            company,
            mode: apply ? "apply" : "dry-run",
            planned: planned.map(entry => ({ ...entry, changed: entry.previousLedgerId !== entry.ledgerId })),
            errors,
        };

        console.log(JSON.stringify(output, null, 2));

        if (errors.length > 0) {
            console.error(`${errors.length} row(s) failed validation; nothing was written.`);
            process.exitCode = 1;

            return;
        }

        if (!apply) {
            console.log("Dry run only. Re-run with --apply to write these links.");
            return;
        }

        await db.transaction(async tx => {
            for (const entry of planned) {
                const patch: Partial<Record<RoleColumn, number>> = {};
                patch[ROLE_COLUMN[entry.role]] = entry.ledgerId;
                await tx.update(users).set(patch).where(eq(users.id, entry.userId));
            }
        });

        console.log(`Linked ${planned.length} ledger(s) across ${new Set(planned.map(entry => entry.userId)).size} user(s).`);
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
