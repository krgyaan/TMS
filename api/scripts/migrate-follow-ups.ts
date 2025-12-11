import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { getPgDb } from "./db-connections";
import { sql } from "drizzle-orm";

type OldFollowUpRow = {
    id: string;
    emd_id: string;
    area: string;
    party_name: string;
    followup_for: string | null;
    amount: string;
    details: string | null;
    attachments: string | null;
    assigned_to: string;
    frequency: string;
    stop_reason: string | null;
    proof_text: string | null;
    proof_img: string | null;
    stop_rem: string | null;
    assign_initiate: string | null;
    latest_comment: string | null;
    next_follow_up_date: string | null;
    follow_up_dates: string | null;
    comment: string | null;
    created_by: string;
    start_from: string | null;
    reminder_no: string;
    created_at: string;
    updated_at: string;
};

const FILE_PATH = path.join(__dirname, "./csv/follow_ups.csv");
const rows: OldFollowUpRow[] = [];

// -----------------------------
// HELPERS
// -----------------------------

function clean(v: string | null | undefined) {
    if (!v) return null;
    const trimmed = v.trim();
    return trimmed === "" || trimmed === "null" ? null : trimmed;
}

function safeJsonParse(value: string | null, fallback: any) {
    if (!value || value === "" || value === "null") return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeDateOnly(value: string | null) {
    if (!value || value.trim() === "" || value === "null") return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function safeTimestamp(value: string | null) {
    if (!value || value.trim() === "" || value === "null") return new Date().toISOString();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// -----------------------------
// START MIGRATION
// -----------------------------

fs.createReadStream(FILE_PATH)
    .pipe(csv())
    .on("data", data => rows.push(data))
    .on("end", async () => {
        console.log(`🚀 Migrating ${rows.length} follow_ups records...\n`);

        const pgDb = getPgDb();

        for (const row of rows) {
            const startFrom = safeDateOnly(row.start_from) ?? safeDateOnly(row.next_follow_up_date) ?? "2024-01-01";

            await pgDb.execute(sql`
                INSERT INTO follow_ups (
                    id,
                    emd_id,
                    area,
                    party_name,
                    amount,
                    followup_for,
                    assigned_to_id,
                    created_by_id,
                    assignment_status,
                    comment,
                    details,
                    latest_comment,
                    contacts,
                    follow_up_history,
                    attachments,
                    frequency,
                    start_from,
                    next_follow_up_date,
                    reminder_count,
                    stop_reason,
                    proof_text,
                    proof_image_path,
                    stop_remarks,
                    created_at,
                    updated_at,
                    deleted_at
                )
                VALUES (
                    ${Number(row.id)},
                    ${row.emd_id ? Number(row.emd_id) : null},
                    ${clean(row.area) ?? "Unknown"},
                    ${clean(row.party_name) ?? "Unknown"},
                    ${Number(row.amount) || 0},

                    ${clean(row.followup_for)}, 

                    ${Number(row.assigned_to)},
                    ${Number(row.created_by)},

                    'assigned',

                    ${clean(row.comment)},
                    ${clean(row.details)},
                    ${clean(row.latest_comment)},

                    ${JSON.stringify([])},
                    ${JSON.stringify(safeJsonParse(row.follow_up_dates, []))},
                    ${JSON.stringify(safeJsonParse(row.attachments, []))},

                    ${row.frequency ? Number(row.frequency) : null},

                    ${startFrom},
                    ${safeDateOnly(row.next_follow_up_date)},
                    ${Number(row.reminder_no || 1)},

                    ${clean(row.stop_reason)},
                    ${clean(row.proof_text)},
                    ${clean(row.proof_img)},
                    ${clean(row.stop_rem)},

                    ${safeTimestamp(row.created_at)},
                    ${safeTimestamp(row.updated_at)},
                    NULL
                )
            `);
        }

        console.log("✅ follow_ups migrated successfully");

        await pgDb.execute(sql`
            SELECT setval('follow_ups_id_seq', (SELECT MAX(id) FROM follow_ups));
        `);

        console.log("✅ Sequence reset completed");
        process.exit(0);
    });
