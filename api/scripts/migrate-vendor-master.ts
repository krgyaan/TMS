/**
 * One-off data migration: reads the "VM" sheet of the creditor-master workbook
 * and upserts it into vendor_organizations / vendors / vendor_gsts.
 *
 * Usage (from the api/ directory; DATABASE_URL is loaded from api/.env):
 *   pnpm migrate:vendor-master ../Creditor_Master.xlsx --dry-run   # SELECT-only preview
 *   pnpm migrate:vendor-master ../Creditor_Master.xlsx             # apply
 *
 * Every write this run makes is recorded to ./migration-logs/:
 *   - vendor-master-<runId>.log.txt         human-readable log of every insert/update
 *   - vendor-master-<runId>.manifest.ndjson machine-readable record, needed for rollback
 * A --dry-run uses the label "vendor-master-dryrun" and never writes a manifest.
 *
 * If something looks wrong afterwards, undo ONLY this run's writes with:
 *   pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson --confirm
 * (see rollback-vendor-master.ts for details - it never touches rows outside this run's manifest)
 *
 * Safe to re-run the migration itself: organizations are upserted by (unique)
 * name, contacts are upserted by orgId, and GST rows are skipped if the same
 * (state, gstNo) already exists for that org.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { MigrationLogger } from "./migrationLogger";
import { parseVmSheet, type ParsedVendor } from "./parseVm";
import * as schema from "../src/db/schemas/vendors";

/** Read-only preview of a run: reports insert/update counts, performs no writes. */
async function reportDryRun(db: ReturnType<typeof createDb>, parsedVendors: ParsedVendor[], logger: MigrationLogger): Promise<void> {
    const orgRows = await db.select({ id: schema.vendorOrganizations.id, name: schema.vendorOrganizations.name }).from(schema.vendorOrganizations);
    const contactRows = await db.select({ orgId: schema.vendors.orgId }).from(schema.vendors);
    const gstRows = await db.select({ orgId: schema.vendorGsts.orgId, gstState: schema.vendorGsts.gstState, gstNo: schema.vendorGsts.gstNo }).from(schema.vendorGsts);

    const orgIdByName = new Map(orgRows.map(r => [r.name, r.id]));
    const orgsWithContact = new Set(contactRows.map(r => r.orgId));
    const existingGstKeys = new Set(gstRows.map(g => `${g.orgId}|${g.gstState}|${g.gstNo}`));

    let orgsToInsert = 0;
    let orgsToUpdate = 0;
    let contactsToInsert = 0;
    let contactsToUpdate = 0;
    let gstsToInsert = 0;
    let gstsToSkip = 0;

    for (const vendor of parsedVendors) {
        const orgId = orgIdByName.get(vendor.name);

        if (orgId === undefined) {
            orgsToInsert++;
            contactsToInsert++;
            gstsToInsert += vendor.gsts.length;
            continue;
        }

        orgsToUpdate++;
        if (orgsWithContact.has(orgId)) contactsToUpdate++;
        else contactsToInsert++;

        for (const g of vendor.gsts) {
            if (existingGstKeys.has(`${orgId}|${g.gstState}|${g.gstNo}`)) gstsToSkip++;
            else gstsToInsert++;
        }
    }

    const summary =
        `Organizations: ${orgsToInsert} insert, ${orgsToUpdate} update\n` +
        `Contacts:      ${contactsToInsert} insert, ${contactsToUpdate} update\n` +
        `GST rows:      ${gstsToInsert} insert, ${gstsToSkip} skipped (already present)`;
    console.log(`\nDry run complete - nothing was written.\n${summary}`);
    logger.summary(`Dry run complete (SELECT only, no writes).\n${summary}`);
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");
    const filePath = process.argv.slice(2).find(a => !a.startsWith("--"));
    if (!filePath) {
        console.error("Usage: npx tsx scripts/migrate-vendor-master.ts <path-to-xlsx> [--dry-run]");
        process.exit(1);
    }

    const { vendors: parsedVendors, warnings, anomalies } = parseVmSheet(filePath);
    const logger = new MigrationLogger("./migration-logs", dryRun ? "vendor-master-dryrun" : "vendor-master");

    console.log(`Parsed ${parsedVendors.length} vendors (deduped by name) from "${filePath}".`);
    console.log(`Log file:      ${logger.logPath}`);
    if (dryRun) {
        console.log("Mode:          DRY RUN - only SELECT statements will run.");
    } else {
        console.log(`Manifest file: ${logger.manifestPath}  (keep this - it's what rollback needs)`);
    }

    logger.log(`Source file: ${filePath}`);
    logger.log(`Vendors parsed: ${parsedVendors.length}`);
    logger.log(`Mode: ${dryRun ? "dry run (SELECT only)" : "apply"}`);

    if (warnings.length) {
        console.warn(`\n${warnings.length} GST cell(s) didn't match the expected "(GSTIN) address" pattern - stored as address-only:`);
        logger.summary(`${warnings.length} GST parse warning(s):`);
        for (const w of warnings) {
            console.warn(` - [${w.vendorName}] ${w.message}`);
            logger.log(`WARNING [${w.vendorName}] ${w.message}`);
        }
    }

    if (anomalies.length) {
        console.warn(`\n${anomalies.length} suspicious GSTIN value(s) - reported only, they are stored exactly as found in the workbook:`);
        logger.summary(`${anomalies.length} GSTIN data anomaly(s) (stored as-is):`);
        for (const a of anomalies) {
            console.warn(` - [${a.vendorName}] ${a.message}`);
            logger.log(`ANOMALY [${a.vendorName}] ${a.message}`);
        }
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    let orgsInserted = 0;
    let orgsUpdated = 0;
    let contactsInserted = 0;
    let contactsUpdated = 0;
    let gstRowsInserted = 0;

    try {
        if (dryRun) {
            await reportDryRun(db, parsedVendors, logger);
            return;
        }

        for (const vendor of parsedVendors) {
            await db.transaction(async tx => {
                // --- 1. Organization -------------------------------------------------
                const existingOrg = await tx.select().from(schema.vendorOrganizations).where(eq(schema.vendorOrganizations.name, vendor.name)).limit(1);

                const orgUpdatedAt = new Date();
                const [org] = await tx
                    .insert(schema.vendorOrganizations)
                    .values({
                        name: vendor.name,
                        pan: vendor.pan,
                        msme: vendor.msme,
                        updatedAt: orgUpdatedAt,
                    })
                    .onConflictDoUpdate({
                        target: schema.vendorOrganizations.name,
                        set: {
                            pan: vendor.pan ?? undefined,
                            msme: vendor.msme ?? undefined,
                            updatedAt: orgUpdatedAt,
                        },
                    })
                    .returning({ id: schema.vendorOrganizations.id });

                if (existingOrg.length > 0) {
                    orgsUpdated++;
                    logger.log(`vendor_organizations id=${org.id} UPDATE name="${vendor.name}" pan="${vendor.pan}" msme="${vendor.msme}"`);
                    logger.record({
                        table: "vendor_organizations",
                        action: "update",
                        id: org.id,
                        before: existingOrg[0],
                        checkUpdatedAt: orgUpdatedAt.toISOString(),
                    });
                } else {
                    orgsInserted++;
                    logger.log(`vendor_organizations id=${org.id} INSERT name="${vendor.name}" pan="${vendor.pan}" msme="${vendor.msme}"`);
                    logger.record({
                        table: "vendor_organizations",
                        action: "insert",
                        id: org.id,
                        checkUpdatedAt: orgUpdatedAt.toISOString(),
                    });
                }

                // --- 2. Contact record (one per org) ----------------------------------
                const existingContact = await tx.select().from(schema.vendors).where(eq(schema.vendors.orgId, org.id)).limit(1);

                const contactUpdatedAt = new Date();
                if (existingContact.length > 0) {
                    const contactId = existingContact[0].id;
                    await tx
                        .update(schema.vendors)
                        .set({
                            name: vendor.name,
                            email: vendor.email,
                            mobile: vendor.phone,
                            updatedAt: contactUpdatedAt,
                        })
                        .where(eq(schema.vendors.id, contactId));

                    contactsUpdated++;
                    logger.log(`vendors id=${contactId} UPDATE orgId=${org.id} email="${vendor.email}" mobile="${vendor.phone}"`);
                    logger.record({
                        table: "vendors",
                        action: "update",
                        id: contactId,
                        before: existingContact[0],
                        checkUpdatedAt: contactUpdatedAt.toISOString(),
                    });
                } else {
                    const [contact] = await tx
                        .insert(schema.vendors)
                        .values({
                            orgId: org.id,
                            name: vendor.name,
                            email: vendor.email,
                            mobile: vendor.phone,
                            createdAt: contactUpdatedAt,
                            updatedAt: contactUpdatedAt,
                        })
                        .returning({ id: schema.vendors.id });

                    contactsInserted++;
                    logger.log(`vendors id=${contact.id} INSERT orgId=${org.id} email="${vendor.email}" mobile="${vendor.phone}"`);
                    logger.record({
                        table: "vendors",
                        action: "insert",
                        id: contact.id,
                        checkUpdatedAt: contactUpdatedAt.toISOString(),
                    });
                }

                // --- 3. GST registrations (insert-only, duplicates skipped) ----------
                if (vendor.gsts.length > 0) {
                    const existingGsts = await tx
                        .select({ gstState: schema.vendorGsts.gstState, gstNo: schema.vendorGsts.gstNo })
                        .from(schema.vendorGsts)
                        .where(eq(schema.vendorGsts.orgId, org.id));

                    const existingKeys = new Set(existingGsts.map(g => `${g.gstState}|${g.gstNo}`));
                    const gstUpdatedAt = new Date();

                    const toInsert = vendor.gsts.filter(g => !existingKeys.has(`${g.gstState}|${g.gstNo}`));

                    for (const g of toInsert) {
                        const [row] = await tx
                            .insert(schema.vendorGsts)
                            .values({
                                orgId: org.id,
                                gstState: g.gstState,
                                gstNo: g.gstNo,
                                address: g.address,
                                createdAt: gstUpdatedAt,
                                updatedAt: gstUpdatedAt,
                            })
                            .returning({ id: schema.vendorGsts.id });

                        gstRowsInserted++;
                        logger.log(`vendor_gsts id=${row.id} INSERT orgId=${org.id} state="${g.gstState}" gstNo="${g.gstNo}"`);
                        logger.record({
                            table: "vendor_gsts",
                            action: "insert",
                            id: row.id,
                            checkUpdatedAt: gstUpdatedAt.toISOString(),
                        });
                    }
                }
            });
        }

        const summary =
            `Organizations: ${orgsInserted} inserted, ${orgsUpdated} updated\n` +
            `Contacts:      ${contactsInserted} inserted, ${contactsUpdated} updated\n` +
            `GST rows:      ${gstRowsInserted} inserted`;
        console.log(`\nDone.\n${summary}`);
        logger.summary(`Run complete.\n${summary}`);
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
