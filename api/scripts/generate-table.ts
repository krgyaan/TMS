import * as fs from 'fs';
import * as path from 'path';

const drizzleDir = path.resolve(__dirname, '../drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(drizzleDir, 'meta/_journal.json'), 'utf8'));
const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));

function summarize(content: string) {
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'));
    const ops: string[] = [];
    for (const line of lines) {
        let m = line.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) { ops.push(`CREATE TABLE ${m[1]}`); continue; }
        m = line.match(/DROP TABLE\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) { ops.push(`DROP TABLE ${m[1]}`); continue; }
        m = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) { ops.push(`ADD ${m[1]}.${m[2]}`); continue; }
        m = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+DROP COLUMN\s+(?:IF EXISTS\s+)?["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) { ops.push(`DROP ${m[1]}.${m[2]}`); continue; }
        m = line.match(/ALTER TABLE\s+["`]?([a-zA-Z0-9_]+)["`]?\s+ALTER COLUMN\s+["`]?([a-zA-Z0-9_]+)["`]?/i);
        if (m) { ops.push(`ALTER ${m[1]}.${m[2]}`); continue; }
        m = line.match(/CREATE TYPE\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s+AS ENUM/i);
        if (m) { ops.push(`CREATE ENUM ${m[2]}`); continue; }
        m = line.match(/ALTER TYPE\s+(?:["`]?([a-zA-Z0-9_]+)["`]?\.)?["`]?([a-zA-Z0-9_]+)["`]?\s+ADD VALUE/i);
        if (m) { ops.push(`ENUM ADD ${m[2]}`); continue; }
    }
    const u = Array.from(new Set(ops));
    if (u.length === 0) return lines[0]?.substring(0, 60) || 'EMPTY';
    if (u.length <= 2) return u.join('; ');
    return `${u.slice(0, 2).join('; ')} (+${u.length - 2} more)`;
}

const map = new Map<string, { idx: number; when: number; pos: number }>();
journal.entries.forEach((e: any, pos: number) => {
    map.set(e.tag, { idx: e.idx, when: e.when, pos });
});

let md = '| Filename | Journal idx | Array Pos | Status | One-Line Summary |\n|---|---|---|---|---|\n';
files.sort().forEach((f) => {
    const tag = f.replace('.sql', '');
    const j = map.get(tag);
    const content = fs.readFileSync(path.join(drizzleDir, f), 'utf8');
    const summary = summarize(content);
    const status = j ? 'Tracked' : '**UNTRACKED**';
    md += `| \`${f}\` | ${j ? j.idx : '-'} | ${j ? j.pos : '-'} | ${status} | ${summary} |\n`;
});

fs.writeFileSync(path.join(__dirname, 'migration-table.md'), md, 'utf8');
console.log('Saved to scripts/migration-table.md');

