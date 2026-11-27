import "dotenv/config";
import { createPool } from "../src/db";

interface CategoryRow {
    id: number;
    name: string;
    status: boolean;
    tallyBlocked: boolean;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerParent: string | null;
    ledgerActive: boolean | null;
}

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    const company = process.env.TALLY_COMPANY?.trim();

    if (!databaseUrl) {
        console.error("DATABASE_URL is not set.");
        process.exitCode = 1;

        return;
    }

    if (!company) {
        console.error("TALLY_COMPANY is not set.");
        process.exitCode = 1;

        return;
    }

    const pool = createPool(databaseUrl);

    try {
        const result = await pool.query(
            `select c.id,
                    c.name,
                    c.status,
                    c.tally_blocked as "tallyBlocked",
                    l.id as "ledgerId",
                    l.name as "ledgerName",
                    l.parent as "ledgerParent",
                    l.is_active as "ledgerActive"
             from imprest_categories c
             left join tally_ledgers l on l.id = c.tally_ledger_id and l.company = $1
             where c.status = true
             order by c.name`,
            [company]
        );

        const categories = (result.rows as CategoryRow[]).map(row => {
            const ledgerId = row.ledgerId === null ? null : Number(row.ledgerId);
            const state = row.tallyBlocked ? "blocked" : ledgerId === null ? "unmapped" : row.ledgerActive ? "mapped" : "inactive-ledger";

            return { ...row, ledgerId, state };
        });

        const count = (state: string) => categories.filter(category => category.state === state).length;
        const summary = {
            company,
            total: categories.length,
            mapped: count("mapped"),
            blocked: count("blocked"),
            unmapped: count("unmapped"),
            inactiveLedger: count("inactive-ledger"),
        };

        console.log(JSON.stringify({ summary, categories }, null, 2));

        if (summary.unmapped > 0 || summary.inactiveLedger > 0) {
            console.error(
                `${summary.unmapped} category(ies) have no ledger and ${summary.inactiveLedger} point at an inactive ledger. Map them via PATCH /api/v1/imprest-categories/:id.`
            );
            process.exitCode = 1;
        }
    } finally {
        await pool.end();
    }
}

void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
