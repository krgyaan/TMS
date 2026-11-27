import "dotenv/config";
import { readFileSync } from "node:fs";
import { and, eq, inArray } from "drizzle-orm";
import { createDb, createPool } from "../src/db";
import { imprestCategories, tallyLedgers } from "../src/db/schemas";
import { normalizeLedgerName } from "../src/modules/integrations/tally/ledgers/ledger-name";

const USAGE = `Usage: pnpm tally:link-imprest-categories --file=scripts/csv/tally-imprest-categories.csv [--apply] [--company="VEPL 2025-26"]

CSV columns: category_id, category_name, ledger_id, ledger_name, blocked
  - category_id    imprest_categories.id
  - ledger_id      tally_ledgers.id (leave empty when blocked=true)
  - ledger_name    exact Tally ledger name, for verification
  - blocked        true to block the category from posting

Without --apply it only validates and prints the planned changes.`;

interface CategoryRow {
    line: number;
    categoryId: number;
    categoryName: string;
    ledgerId: number | null;
    ledgerName: string;
    blocked: boolean;
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
    const categoryIdIndex = headerIndex.get("category_id");
    const categoryNameIndex = headerIndex.get("category_name");
    const ledgerIdIndex = headerIndex.get("ledger_id");
    const ledgerNameIndex = headerIndex.get("ledger_name");
    const blockedIndex = headerIndex.get("blocked");

    if (categoryIdIndex === undefined || ledgerIdIndex === undefined) {
        fail("The CSV must contain category_id and ledger_id columns");
    }

    const rows: CategoryRow[] = dataRows.map((cells, index) => {
        const ledgerIdRaw = ledgerIdIndex === undefined ? "" : (cells[ledgerIdIndex] ?? "");
        const blockedRaw = blockedIndex === undefined ? "" : (cells[blockedIndex] ?? "");

        return {
            line: index + 2,
            categoryId: Number(cells[categoryIdIndex]),
            categoryName: categoryNameIndex === undefined ? "" : (cells[categoryNameIndex] ?? ""),
            ledgerId: ledgerIdRaw.trim() === "" ? null : Number(ledgerIdRaw),
            ledgerName: ledgerNameIndex === undefined ? "" : (cells[ledgerNameIndex] ?? ""),
            blocked: blockedRaw.trim().toLowerCase() === "true",
        };
    });

    const errors: string[] = [];
    const categoryIds = [...new Set(rows.map(row => row.categoryId).filter(id => Number.isInteger(id) && id > 0))];
    const ledgerIds = [...new Set(rows.map(row => row.ledgerId).filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))];

    const pool = createPool(databaseUrl);
    const db = createDb(pool);

    try {
        const categoryRows =
            categoryIds.length > 0
                ? await db
                      .select({ id: imprestCategories.id, name: imprestCategories.name, tallyLedgerId: imprestCategories.tallyLedgerId, tallyBlocked: imprestCategories.tallyBlocked })
                      .from(imprestCategories)
                      .where(inArray(imprestCategories.id, categoryIds))
                : [];

        const ledgerRows =
            ledgerIds.length > 0
                ? await db
                      .select({ id: tallyLedgers.id, name: tallyLedgers.name, nameNormalized: tallyLedgers.nameNormalized, isActive: tallyLedgers.isActive })
                      .from(tallyLedgers)
                      .where(and(eq(tallyLedgers.company, company), inArray(tallyLedgers.id, ledgerIds)))
                : [];

        const categoriesById = new Map(categoryRows.map(category => [category.id, category] as const));
        const ledgersById = new Map(ledgerRows.map(ledger => [ledger.id, ledger] as const));
        const plannedIds = new Set<number>();
        const planned: Array<{
            categoryId: number;
            categoryName: string;
            ledgerId: number | null;
            ledgerName: string | null;
            blocked: boolean;
            previousLedgerId: number | null;
            previousBlocked: boolean;
        }> = [];

        for (const row of rows) {
            const label = `line ${row.line}`;

            if (!Number.isInteger(row.categoryId) || row.categoryId <= 0) {
                errors.push(`${label}: category_id "${row.categoryId}" is not a positive integer`);
                continue;
            }

            if (plannedIds.has(row.categoryId)) {
                errors.push(`${label}: category ${row.categoryId} appears more than once`);
                continue;
            }

            const category = categoriesById.get(row.categoryId);

            if (!category) {
                errors.push(`${label}: imprest category ${row.categoryId} does not exist`);
                continue;
            }

            if (row.categoryName && normalizeLedgerName(row.categoryName) !== normalizeLedgerName(category.name)) {
                errors.push(`${label}: category name "${row.categoryName}" does not match category ${row.categoryId} ("${category.name}")`);
                continue;
            }

            if (row.blocked) {
                if (row.ledgerId !== null) {
                    errors.push(`${label}: blocked category ${row.categoryId} must not have a ledger_id`);
                    continue;
                }

                plannedIds.add(row.categoryId);
                planned.push({
                    categoryId: row.categoryId,
                    categoryName: category.name,
                    ledgerId: null,
                    ledgerName: null,
                    blocked: true,
                    previousLedgerId: category.tallyLedgerId,
                    previousBlocked: category.tallyBlocked,
                });
                continue;
            }

            if (row.ledgerId === null) {
                errors.push(`${label}: category ${row.categoryId} needs a ledger_id or blocked=true`);
                continue;
            }

            const ledger = ledgersById.get(row.ledgerId);

            if (!ledger) {
                errors.push(`${label}: Tally ledger ${row.ledgerId} does not exist for this company`);
                continue;
            }

            if (row.ledgerName && normalizeLedgerName(row.ledgerName) !== ledger.nameNormalized) {
                errors.push(`${label}: ledger name "${row.ledgerName}" does not match ledger ${row.ledgerId} ("${ledger.name}")`);
                continue;
            }

            if (!ledger.isActive) {
                errors.push(`${label}: Tally ledger ${row.ledgerId} is inactive`);
                continue;
            }

            plannedIds.add(row.categoryId);
            planned.push({
                categoryId: row.categoryId,
                categoryName: category.name,
                ledgerId: ledger.id,
                ledgerName: ledger.name,
                blocked: false,
                previousLedgerId: category.tallyLedgerId,
                previousBlocked: category.tallyBlocked,
            });
        }

        console.log(JSON.stringify({ company, mode: apply ? "apply" : "dry-run", planned, errors }, null, 2));

        if (errors.length > 0) {
            console.error(`${errors.length} row(s) failed validation; nothing was written.`);
            process.exitCode = 1;

            return;
        }

        if (!apply) {
            console.log("Dry run only. Re-run with --apply to write these mappings.");
            return;
        }

        await db.transaction(async tx => {
            for (const entry of planned) {
                await tx
                    .update(imprestCategories)
                    .set({ tallyLedgerId: entry.ledgerId, tallyBlocked: entry.blocked, updatedAt: new Date() })
                    .where(eq(imprestCategories.id, entry.categoryId));
            }
        });

        console.log(`Mapped ${planned.filter(entry => !entry.blocked).length} category(ies) and blocked ${planned.filter(entry => entry.blocked).length}.`);
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
