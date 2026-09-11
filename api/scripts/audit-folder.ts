import * as fs from 'fs';
import * as path from 'path';

const drizzleDir = path.resolve(__dirname, '../drizzle');
const journalPath = path.join(drizzleDir, 'meta/_journal.json');
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

// 1. Get all .sql files in drizzle/
const allFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));

// Map journal entries by tag
const journalByTag = new Map<string, any>();
const journalByIdx = new Map<number, any[]>();
journal.entries.forEach((e: any, pos: number) => {
    journalByTag.set(e.tag, { ...e, journalPos: pos });
    const list = journalByIdx.get(e.idx) || [];
    list.push({ ...e, journalPos: pos });
    journalByIdx.set(e.idx, list);
});

console.log(`Total .sql files on disk: ${allFiles.length}`);
console.log(`Total entries in _journal.json: ${journal.entries.length}`);

// 2. Summary for each file
function summarizeSql(content: string): string {
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'));
    const ops: string[] = [];
    for (const line of lines) {
        const createTable = line.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (createTable) {
            ops.push(`CREATE TABLE "${createTable[1]}"`);
            continue;
        }
        const dropTable = line.match(/DROP TABLE\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (dropTable) {
            ops.push(`DROP TABLE "${dropTable[1]}"`);
            continue;
        }
        const addCol = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (addCol) {
            ops.push(`ADD "${addCol[1]}"."${addCol[2]}"`);
            continue;
        }
        const dropCol = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+DROP COLUMN\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (dropCol) {
            ops.push(`DROP "${dropCol[1]}"."${dropCol[2]}"`);
            continue;
        }
        const alterCol = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+ALTER COLUMN\s+["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (alterCol) {
            ops.push(`ALTER "${alterCol[1]}"."${alterCol[2]}"`);
            continue;
        }
        const update = line.match(/UPDATE\s+["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (update) {
            ops.push(`UPDATE "${update[1]}"`);
            continue;
        }
        const createEnum = line.match(/CREATE TYPE\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s+AS ENUM/i);
        if (createEnum) {
            ops.push(`CREATE ENUM "${createEnum[2]}"`);
            continue;
        }
        const addEnumValue = line.match(/ALTER TYPE\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s+ADD VALUE/i);
        if (addEnumValue) {
            ops.push(`ENUM ADD VALUE "${addEnumValue[2]}"`);
            continue;
        }
    }
    const uniqueOps = Array.from(new Set(ops));
    if (uniqueOps.length === 0) {
        return lines[0]?.substring(0, 80) || 'EMPTY';
    }
    if (uniqueOps.length <= 3) {
        return uniqueOps.join('; ');
    }
    return `${uniqueOps.slice(0, 3).join('; ')} (+${uniqueOps.length - 3} more)`;
}

// Build file listing
const fileList: any[] = [];
for (const file of allFiles) {
    const tag = file.replace(/\.sql$/, '');
    const j = journalByTag.get(tag);
    const content = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
    const summary = summarizeSql(content);
    fileList.push({
        file,
        tag,
        inJournal: !!j,
        idx: j ? j.idx : null,
        when: j ? j.when : null,
        journalPos: j ? j.journalPos : null,
        summary,
        content,
    });
}

// 3. Duplicate idx check in _journal.json
console.log('\n=== DUPLICATE IDX IN _JOURNAL.JSON ===');
const dupIdxs: any[] = [];
journalByIdx.forEach((entries, idx) => {
    if (entries.length > 1) {
        dupIdxs.push({ idx, entries });
        console.log(`idx: ${idx} has ${entries.length} entries:`);
        entries.forEach((e) => {
            console.log(`  - tag: ${e.tag} (when: ${e.when}, arrayPos: ${e.journalPos})`);
        });
    }
});

// 4. Filename prefix collisions
console.log('\n=== FILENAME PREFIX COLLISIONS ===');
const prefixMap = new Map<string, string[]>();
allFiles.forEach((f) => {
    const m = f.match(/^(\d{4})_/);
    if (m) {
        const prefix = m[1];
        const list = prefixMap.get(prefix) || [];
        list.push(f);
        prefixMap.set(prefix, list);
    }
});
const prefixCollisions: any[] = [];
prefixMap.forEach((files, prefix) => {
    if (files.length > 1) {
        prefixCollisions.push({ prefix, files });
        console.log(`Prefix ${prefix}: ${files.join(', ')}`);
    }
});

// 5. Duplicate CREATE TABLE check
console.log('\n=== DUPLICATE CREATE TABLE WITHOUT IF NOT EXISTS ===');
// Order files by journal sequence, or filename for untracked
const orderedFiles = [...fileList].sort((a, b) => {
    if (a.journalPos !== null && b.journalPos !== null) {
        return a.journalPos - b.journalPos;
    }
    if (a.journalPos !== null) return -1;
    if (b.journalPos !== null) return 1;
    return a.file.localeCompare(b.file);
});

const createdTables = new Map<string, { file: string; idx: any; hasIfNotExists: boolean; line: number }[]>();

orderedFiles.forEach((f) => {
    const lines = f.content.split('\n');
    lines.forEach((line: string, lineNo: number) => {
        const m = line.match(/CREATE TABLE\s+(IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) {
            const hasIfNotExists = !!m[1];
            const table = m[2];
            const list = createdTables.get(table) || [];
            list.push({ file: f.file, idx: f.idx, hasIfNotExists, line: lineNo + 1 });
            createdTables.set(table, list);
        }
    });
});

const duplicateCreates: any[] = [];
createdTables.forEach((creations, table) => {
    if (creations.length > 1) {
        duplicateCreates.push({ table, creations });
        console.log(`Table "${table}" created ${creations.length} times:`);
        creations.forEach((c) => {
            console.log(`  - File: ${c.file} (idx: ${c.idx}, line: ${c.line}) | IF NOT EXISTS: ${c.hasIfNotExists}`);
        });
    }
});

// 6. DROP vs Backfill / Read Inversions
console.log('\n=== DROP VS BACKFILL INVERSIONS ===');
// Track all dropped columns: { table, column, file, idx, journalPos }
const droppedColumns: { table: string; column: string; file: string; idx: any; journalPos: number }[] = [];
orderedFiles.forEach((f) => {
    const lines = f.content.split('\n');
    lines.forEach((line: string) => {
        const dropMatch = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+DROP COLUMN\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (dropMatch) {
            droppedColumns.push({
                table: dropMatch[1],
                column: dropMatch[2],
                file: f.file,
                idx: f.idx,
                journalPos: f.journalPos,
            });
        }
    });
});

console.log(`Total dropped columns found: ${droppedColumns.length}`);
const inversions: any[] = [];
droppedColumns.forEach((dc) => {
    // Look at migrations that appear LATER in execution sequence
    orderedFiles.forEach((f) => {
        const isLater = (f.journalPos !== null && dc.journalPos !== null && f.journalPos > dc.journalPos) ||
                        (f.journalPos === null && dc.journalPos !== null);
        if (!isLater) return;

        // Check if f reads or updates the dropped column
        const regex = new RegExp(`["\`]?${dc.column}["\`]?`, 'i');
        if (regex.test(f.content)) {
            // Further verify if the table or context matches
            const tableRegex = new RegExp(`["\`]?${dc.table}["\`]?`, 'i');
            if (tableRegex.test(f.content)) {
                inversions.push({
                    droppedColumn: dc.column,
                    table: dc.table,
                    dropFile: dc.file,
                    dropIdx: dc.idx,
                    dropJournalPos: dc.journalPos,
                    laterFile: f.file,
                    laterIdx: f.idx,
                    laterJournalPos: f.journalPos,
                });
                console.log(`INVERSION: Column "${dc.table}"."${dc.column}" dropped in ${dc.file} (idx ${dc.idx}, pos ${dc.journalPos}) but referenced later in ${f.file} (idx ${f.idx}, pos ${f.journalPos})`);
            }
        }
    });
});
