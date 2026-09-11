import * as fs from 'fs';
import * as path from 'path';

const drizzleDir = path.resolve(__dirname, '../drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(drizzleDir, 'meta/_journal.json'), 'utf8'));
const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));

// Sort files in execution order:
// First the journal entries in order of array index
// Then untracked files in alphabetical order
const fileOrder: { file: string; tag: string; idx: number | null; inJournal: boolean }[] = [];
journal.entries.forEach((e: any) => {
    fileOrder.push({ file: e.tag + '.sql', tag: e.tag, idx: e.idx, inJournal: true });
});
files.forEach((f) => {
    if (!journal.entries.some((e: any) => e.tag + '.sql' === f)) {
        fileOrder.push({ file: f, tag: f.replace('.sql', ''), idx: null, inJournal: false });
    }
});

const activeTables = new Map<string, { file: string; idx: any; line: number }>();
const collisionErrors: any[] = [];

fileOrder.forEach((fo) => {
    const content = fs.readFileSync(path.join(drizzleDir, fo.file), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, lineNo) => {
        // Check drop table
        const dropMatch = line.match(/DROP TABLE\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (dropMatch) {
            activeTables.delete(dropMatch[1]);
        }
        // Check create table
        const createMatch = line.match(/CREATE TABLE\s+(IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (createMatch) {
            const hasIfNotExists = !!createMatch[1];
            const table = createMatch[2];
            if (activeTables.has(table)) {
                collisionErrors.push({
                    table,
                    firstCreatedIn: activeTables.get(table),
                    recreatedIn: { file: fo.file, idx: fo.idx, inJournal: fo.inJournal, line: lineNo + 1, hasIfNotExists },
                });
            } else {
                activeTables.set(table, { file: fo.file, idx: fo.idx, line: lineNo + 1 });
            }
        }
    });
});

console.log('=== DUPLICATE CREATE TABLE OF STILL-ACTIVE TABLES ===');
console.log('Total collisions found:', collisionErrors.length);
collisionErrors.forEach((c) => {
    console.log(`Table: "${c.table}"`);
    console.log(`  1st Created: ${c.firstCreatedIn.file} (idx ${c.firstCreatedIn.idx}, line ${c.firstCreatedIn.line})`);
    console.log(`  2nd Created: ${c.recreatedIn.file} (idx ${c.recreatedIn.idx}, inJournal: ${c.recreatedIn.inJournal}, line ${c.recreatedIn.line}, IF NOT EXISTS: ${c.recreatedIn.hasIfNotExists})`);
});
