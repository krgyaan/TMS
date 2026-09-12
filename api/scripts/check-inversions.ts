import * as fs from 'fs';
import * as path from 'path';

const drizzleDir = path.resolve(__dirname, '../drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(drizzleDir, 'meta/_journal.json'), 'utf8'));
const allFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));

// Establish the exact order of execution:
// 1. Journal entries in order of array index
const orderedFiles: { file: string; tag: string; idx: number | null; when: number | null; inJournal: boolean }[] = [];
journal.entries.forEach((e: any) => {
    orderedFiles.push({ file: e.tag + '.sql', tag: e.tag, idx: e.idx, when: e.when, inJournal: true });
});
// 2. Untracked files appended in numerical/alphabetical order
allFiles.forEach((f) => {
    if (!journal.entries.some((e: any) => e.tag + '.sql' === f)) {
        orderedFiles.push({ file: f, tag: f.replace('.sql', ''), idx: null, when: null, inJournal: false });
    }
});

interface DroppedCol {
    table: string;
    column: string;
    file: string;
    idx: number | null;
    orderPos: number;
    rawLine: string;
}

const droppedCols: DroppedCol[] = [];

orderedFiles.forEach((fo, pos) => {
    const content = fs.readFileSync(path.join(drizzleDir, fo.file), 'utf8');
    // Normalize statements
    const statements = content.split('--> statement-breakpoint').map((s) => s.trim());
    statements.forEach((stmt) => {
        // match ALTER TABLE <table> DROP COLUMN [IF EXISTS] <col>
        // Note: multiple columns can be dropped in one ALTER TABLE statement:
        // ALTER TABLE "t" DROP COLUMN "c1", DROP COLUMN "c2";
        const tableMatch = stmt.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (!tableMatch) return;
        const tableName = tableMatch[2];

        // Find all DROP COLUMN occurrences in this statement
        const dropRegex = /DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/gi;
        let match;
        while ((match = dropRegex.exec(stmt)) !== null) {
            droppedCols.push({
                table: tableName,
                column: match[1],
                file: fo.file,
                idx: fo.idx,
                orderPos: pos,
                rawLine: match[0],
            });
        }
    });
});

console.log(`Total dropped columns found across all files: ${droppedCols.length}`);

// Now check if any later file references tableName AND columnName in a query (SELECT, INSERT, UPDATE, backfill)
interface InversionMatch {
    droppedCol: DroppedCol;
    laterFile: string;
    laterIdx: number | null;
    laterOrderPos: number;
    matchedSnippet: string;
}

const verifiedInversions: InversionMatch[] = [];

droppedCols.forEach((dc) => {
    for (let i = dc.orderPos + 1; i < orderedFiles.length; i++) {
        const later = orderedFiles[i];
        const content = fs.readFileSync(path.join(drizzleDir, later.file), 'utf8');

        // Check if table and column are mentioned
        // Ignore files that are just dropping or adding other things unless they actually select/read/update the dropped column
        const colRegex = new RegExp(`["\`]?${dc.column}["\`]?`, 'i');
        const tableRegex = new RegExp(`["\`]?${dc.table}["\`]?`, 'i');

        if (colRegex.test(content) && tableRegex.test(content)) {
            // Find the line that mentions it
            const lines = content.split('\n');
            const matchingLines = lines.filter((l) => colRegex.test(l) && !l.trim().startsWith('--'));
            // Filter out lines that are themselves DROP COLUMN or ALTER COLUMN
            const nonDropLines = matchingLines.filter((l) => !/DROP\s+COLUMN/i.test(l));
            if (nonDropLines.length > 0) {
                verifiedInversions.push({
                    droppedCol: dc,
                    laterFile: later.file,
                    laterIdx: later.idx,
                    laterOrderPos: i,
                    matchedSnippet: nonDropLines.slice(0, 3).join(' \n '),
                });
            }
        }
    }
});

console.log(`\n=== VERIFIED DROP VS LATER-READ INVERSIONS ===`);
console.log(`Found: ${verifiedInversions.length}`);
verifiedInversions.forEach((inv) => {
    console.log(`\n[INVERSION] Table "${inv.droppedCol.table}", Column "${inv.droppedCol.column}"`);
    console.log(`  Dropped in: ${inv.droppedCol.file} (idx ${inv.droppedCol.idx}, orderPos ${inv.droppedCol.orderPos})`);
    console.log(`  Referenced in: ${inv.laterFile} (idx ${inv.laterIdx}, orderPos ${inv.laterOrderPos})`);
    console.log(`  Snippet:\n    ${inv.matchedSnippet}`);
});
