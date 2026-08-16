/**
 * Backfill DB paths for uploads previously handled by multer endpoints that
 * were migrated to the File Upload module (FileUploader + JSON bodies).
 *
 * Legacy values are bare filenames (e.g. "fu-1712345678900.pdf") stored in
 * single-value varchar/text columns or JSON arrays. This script rewrites them
 * to the FileUploader format "<context>/<file>" so the shared display helpers
 * (getFileUrl / docUrl) resolve them to /uploads/<module>/<context>/<file>.
 *
 * Rules:
 *   - skip values that already contain "/" (already prefixed, or URL-like)
 *   - skip values starting with "http"
 *   - couriers.delivery_pod additionally normalizes the legacy "pod/<file>"
 *     prefix to "courier/<file>" (the file physically lives in uploads/courier/)
 *
 * Usage:
 *   pnpm run backfill:uploads-paths            # apply
 *   pnpm run backfill:uploads-paths -- --dry-run  # preview counts only
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../src/db';

const DRY_RUN = process.argv.includes('--dry-run');

const BARE_GUARD = `col IS NOT NULL AND col <> '' AND col NOT LIKE '%/%' AND col NOT LIKE 'http%'`;

const SINGLE_VALUE_REWRITES: Array<{ name: string; table: string; column: string; prefix: string }> = [
    { name: 'account_checklist_report.resp_result_file', table: 'account_checklist_report', column: 'resp_result_file', prefix: 'checklist/' },
    { name: 'account_checklist_report.acc_result_file', table: 'account_checklist_report', column: 'acc_result_file', prefix: 'checklist/' },
    { name: 'circulars.file', table: 'circulars', column: 'file', prefix: 'circulars/' },
    { name: 'couriers.docket_slip', table: 'couriers', column: 'docket_slip', prefix: 'courier/' },
    { name: 'hrms_employee_assets.purchase_invoice_url', table: 'hrms_employee_assets', column: 'purchase_invoice_url', prefix: 'assets/' },
    { name: 'hrms_employee_assets.warranty_card_url', table: 'hrms_employee_assets', column: 'warranty_card_url', prefix: 'assets/' },
    { name: 'hrms_employee_assets.assignment_form_url', table: 'hrms_employee_assets', column: 'assignment_form_url', prefix: 'assets/' },
    { name: 'hrms_onboarding_documents.file_url', table: 'hrms_onboarding_documents', column: 'file_url', prefix: 'employee-documents/' },
    { name: 'follow_ups.proof_image_path', table: 'follow_ups', column: 'proof_image_path', prefix: 'follow-ups/' },
];

const JSON_ARRAY_REWRITES: Array<{ name: string; table: string; column: string; prefix: string }> = [
    { name: 'couriers.courier_docs', table: 'couriers', column: 'courier_docs', prefix: 'courier/' },
    { name: 'hrms_employee_assets.asset_photos', table: 'hrms_employee_assets', column: 'asset_photos', prefix: 'assets/' },
    { name: 'follow_ups.attachments', table: 'follow_ups', column: 'attachments', prefix: 'follow-ups/' },
];

const CSV_REWRITES: Array<{ name: string; table: string; column: string; prefix: string }> = [
    { name: 'private_quotes.submitted_documents', table: 'private_quotes', column: 'submitted_documents', prefix: 'leads-quotations/' },
    { name: 'site_visits.documents', table: 'site_visits', column: 'documents', prefix: 'site-visit/' },
];

// Elements that look like JSON fragments (quotes/braces) or already-prefixed
// paths are left untouched — only plain bare filenames get the context prefix.
const csvElementGuard = (column: string) => sql`
    EXISTS (
        SELECT 1 FROM unnest(string_to_array(${sql.raw(column)}, ',')) AS v
        WHERE v ~ '^[^/]+$' AND v <> '' AND v NOT LIKE 'http%'
          AND v NOT LIKE '%"%' AND v NOT LIKE '%{%' AND v NOT LIKE '%}%'
    )
`;
const csvElementRewrite = (column: string, prefix: string) => sql`
    (
        SELECT string_agg(
            CASE
                WHEN v ~ '^[^/]+$' AND v <> '' AND v NOT LIKE 'http%'
                 AND v NOT LIKE '%"%' AND v NOT LIKE '%{%' AND v NOT LIKE '%}%'
                THEN ${sql.raw(`'${prefix}'`)} || v
                ELSE v
            END,
            ','
        )
        FROM unnest(string_to_array(${sql.raw(column)}, ',')) AS v
    )
`;

const courierPodRewrite = {
    name: 'couriers.delivery_pod (bare + legacy "pod/" -> courier/)',
    countSql: sql`
        SELECT count(*) FROM couriers
        WHERE delivery_pod IS NOT NULL AND delivery_pod <> ''
          AND (delivery_pod NOT LIKE '%/%' OR delivery_pod LIKE 'pod/%')
    `,
    applySql: sql`
        UPDATE couriers
        SET delivery_pod = CASE
            WHEN delivery_pod LIKE 'pod/courier/%' THEN 'courier/' || substring(delivery_pod from 12)
            WHEN delivery_pod LIKE 'pod/%' THEN 'courier/' || substring(delivery_pod from 5)
            WHEN delivery_pod <> '' AND delivery_pod NOT LIKE '%/%' AND delivery_pod NOT LIKE 'http%' THEN 'courier/' || delivery_pod
            ELSE delivery_pod
        END
        WHERE delivery_pod IS NOT NULL AND delivery_pod <> ''
          AND (delivery_pod NOT LIKE '%/%' OR delivery_pod LIKE 'pod/%')
    `,
};

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not set — set it in the environment or .env.');
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === 'true');
    const db = createDb(pool);

    console.log(`Backfill upload paths (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);

    try {
        for (const r of SINGLE_VALUE_REWRITES) {
            const where = BARE_GUARD.replaceAll('col', r.column);
            const count = Number((await db.execute(sql`SELECT count(*) FROM ${sql.raw(r.table)} WHERE ${sql.raw(where)}`)).rows?.[0]?.count ?? 0);
            console.log(`  ${String(count).padStart(6)}  ${r.name}`);
            if (!DRY_RUN && count > 0) {
                await db.execute(sql`UPDATE ${sql.raw(r.table)} SET ${sql.raw(r.column)} = ${sql.raw(`'${r.prefix}'`)} || ${sql.raw(r.column)} WHERE ${sql.raw(where)}`);
                console.log(`         applied`);
            }
        }

        for (const r of JSON_ARRAY_REWRITES) {
            const count = Number(
                (
                    await db.execute(sql`
                        SELECT count(*) FROM ${sql.raw(r.table)}
                        WHERE ${sql.raw(r.column)} IS NOT NULL AND ${sql.raw(r.column)}::text <> '[]'
                          AND EXISTS (
                              SELECT 1 FROM jsonb_array_elements_text(${sql.raw(r.column)}::jsonb) AS v
                              WHERE v ~ '^[^/]+$' AND v <> '' AND v NOT LIKE 'http%'
                          )
                    `)
                ).rows?.[0]?.count ?? 0
            );
            console.log(`  ${String(count).padStart(6)}  ${r.name}`);
            if (!DRY_RUN && count > 0) {
                await db.execute(sql`
                    UPDATE ${sql.raw(r.table)}
                    SET ${sql.raw(r.column)} = (
                        SELECT COALESCE(jsonb_agg(
                            CASE
                                WHEN v ~ '^[^/]+$' AND v <> '' AND v NOT LIKE 'http%' THEN '${sql.raw(r.prefix)}' || v
                                ELSE v
                            END
                        ), '[]'::jsonb)
                        FROM jsonb_array_elements_text(${sql.raw(r.column)}::jsonb) AS t(v)
                    )
                    WHERE ${sql.raw(r.column)} IS NOT NULL AND ${sql.raw(r.column)}::text <> '[]'
                      AND EXISTS (
                          SELECT 1 FROM jsonb_array_elements_text(${sql.raw(r.column)}::jsonb) AS v
                          WHERE v ~ '^[^/]+$' AND v <> '' AND v NOT LIKE 'http%'
                      )
                `);
                console.log(`         applied`);
            }
        }

        for (const r of CSV_REWRITES) {
            const count = Number(
                (
                    await db.execute(sql`
                        SELECT count(*) FROM ${sql.raw(r.table)}
                        WHERE ${sql.raw(r.column)} IS NOT NULL AND ${sql.raw(r.column)} <> ''
                          AND ${csvElementGuard(r.column)}
                    `)
                ).rows?.[0]?.count ?? 0
            );
            console.log(`  ${String(count).padStart(6)}  ${r.name}`);
            if (!DRY_RUN && count > 0) {
                await db.execute(sql`
                    UPDATE ${sql.raw(r.table)}
                    SET ${sql.raw(r.column)} = ${csvElementRewrite(r.column, r.prefix)}
                    WHERE ${sql.raw(r.column)} IS NOT NULL AND ${sql.raw(r.column)} <> ''
                      AND ${csvElementGuard(r.column)}
                `);
                console.log(`         applied`);
            }
        }

        const podCount = Number((await db.execute(courierPodRewrite.countSql)).rows?.[0]?.count ?? 0);
        console.log(`  ${String(podCount).padStart(6)}  ${courierPodRewrite.name}`);
        if (!DRY_RUN && podCount > 0) {
            await db.execute(courierPodRewrite.applySql);
            console.log(`         applied`);
        }
    } finally {
        await pool.end();
    }

    console.log(DRY_RUN ? '\nDry run complete — re-run without --dry-run to apply.' : '\nDone.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});