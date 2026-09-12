import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client } from 'pg';

async function audit() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
        // 1. Fetch dev DB ledger rows
        const ledgerRes = await client.query(
            `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC;`
        );
        const ledgerRows = ledgerRes.rows;

        const drizzleDir = path.resolve(__dirname, '../drizzle');
        const journalPath = path.join(drizzleDir, 'meta/_journal.json');
        const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

        console.log('=== FULL LEDGER IN DEV DB ===');
        ledgerRows.forEach((r) => {
            const matchingEntries = journal.entries.filter((e: any) => String(e.when) === String(r.created_at));
            const tags = matchingEntries.map((e: any) => `${e.tag} (idx ${e.idx})`).join(', ') || 'UNKNOWN_TAG';
            console.log(`id: ${r.id} | created_at: ${r.created_at} | hash: ${r.hash} | tag: ${tags}`);
        });

        // Map ledger rows by created_at
        const ledgerByCreatedAt = new Map<string, any>();
        ledgerRows.forEach((r) => {
            ledgerByCreatedAt.set(String(r.created_at), r);
        });

        console.log('\n=== LEDGER INTEGRITY CHECK (ALL APPLIED MIGRATIONS) ===');
        const appliedFilesAudit: any[] = [];
        for (const row of ledgerRows) {
            const matchingEntries = journal.entries.filter((e: any) => String(e.when) === String(row.created_at));
            if (matchingEntries.length === 0) {
                appliedFilesAudit.push({
                    ledgerId: row.id,
                    createdAt: row.created_at,
                    ledgerHash: row.hash,
                    file: 'NOT_FOUND_IN_JOURNAL',
                    status: 'ORPHAN_LEDGER_ROW',
                });
                continue;
            }

            for (const entry of matchingEntries) {
                const filePath = path.join(drizzleDir, `${entry.tag}.sql`);
                if (!fs.existsSync(filePath)) {
                    appliedFilesAudit.push({
                        ledgerId: row.id,
                        createdAt: row.created_at,
                        ledgerHash: row.hash,
                        tag: entry.tag,
                        status: 'FILE_MISSING_ON_DISK',
                    });
                    continue;
                }

                const rawContent = fs.readFileSync(filePath, 'utf8');
                const lfContent = rawContent.replace(/\r?\n/g, '\n');
                const crlfContent = rawContent.replace(/\r?\n/g, '\r\n');

                const asIsHash = crypto.createHash('sha256').update(rawContent).digest('hex');
                const lfHash = crypto.createHash('sha256').update(lfContent).digest('hex');
                const crlfHash = crypto.createHash('sha256').update(crlfContent).digest('hex');

                const matchesLf = lfHash === row.hash;
                const matchesCrlf = crlfHash === row.hash;
                const matchesAsIs = asIsHash === row.hash;
                const isMatch = matchesLf || matchesCrlf || matchesAsIs;

                appliedFilesAudit.push({
                    ledgerId: row.id,
                    createdAt: row.created_at,
                    tag: entry.tag,
                    idx: entry.idx,
                    ledgerHash: row.hash,
                    asIsHash,
                    lfHash,
                    crlfHash,
                    isMatch,
                    matchType: matchesLf ? 'LF' : matchesCrlf ? 'CRLF' : matchesAsIs ? 'AS_IS' : 'NONE',
                });
            }
        }

        const mismatches = appliedFilesAudit.filter((a) => !a.isMatch);
        console.log(`Total applied migrations audited: ${appliedFilesAudit.length}`);
        console.log(`Matching (accounting for CRLF/LF): ${appliedFilesAudit.length - mismatches.length}`);
        console.log(`True Mismatches: ${mismatches.length}`);

        if (mismatches.length > 0) {
            console.log('\n--- TRUE HASH MISMATCHES ---');
            mismatches.forEach((m) => {
                console.log(`Tag: ${m.tag} (idx: ${m.idx}, created_at: ${m.createdAt}, ledgerId: ${m.ledgerId})`);
                console.log(`  Ledger Hash: ${m.ledgerHash}`);
                console.log(`  File LF Hash: ${m.lfHash}`);
                console.log(`  File CRLF Hash: ${m.crlfHash}`);
            });
        } else {
            console.log('\nNo applied migrations have hash mismatches!');
        }

    } finally {
        await client.end();
    }
}

audit().catch((e) => {
    console.error(e);
    process.exit(1);
});

