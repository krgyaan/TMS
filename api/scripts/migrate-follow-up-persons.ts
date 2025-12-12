import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { getPgDb } from "./db-connections";
import { sql } from "drizzle-orm";

type OldPersonRow = {
    id: string;
    follwup_id: string;
    org: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
    updated_at: string | null;
};

const FILE_PATH = path.join(__dirname, "./csv/follow_up_persons.csv");
const rows: OldPersonRow[] = [];

// ---------- HELPERS -------------

function clean(v: string | null | undefined) {
    if (!v) return null;
    const t = v.trim();
    return t === "" || t === "null" ? null : t;
}

function safeTimestamp(v: string | null) {
    if (!v || v.trim() === "" || v === "null") return new Date().toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ---------- MIGRATION START -------------

fs.createReadStream(FILE_PATH)
    .pipe(csv())
    .on("data", data => rows.push(data))
    .on("end", async () => {
        console.log(`🚀 Migrating ${rows.length} follow_up_for records...\n`);

        const pgDb = getPgDb();

        for (const row of rows) {
            await pgDb.execute(sql`
                INSERT INTO follow_up_persons (
                    id,
                    follow_up_id,
                    name,
                    email,
                    phone,
                    organization,
                    created_at,
                    updated_at
                )
                VALUES (
                    ${Number(row.id)},
                    ${Number(row.follwup_id)},
                    ${clean(row.name)},
                    ${clean(row.email)},
                    ${clean(row.phone)},
                    ${clean(row.org)},
                    ${safeTimestamp(row.created_at)},
                    ${safeTimestamp(row.updated_at)}
                )
            `);
        }

        console.log("✅ follow_up_for migrated successfully");

        await pgDb.execute(sql`
            SELECT setval('follow_up_for_id_seq', (SELECT MAX(id) FROM follow_up_for));
        `);

        console.log("✅ Sequence reset completed");
        process.exit(0);
    });
