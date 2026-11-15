/**\
 * One-off data migration: reads the vendor-master workbook (`VM` by default) and
 * upserts it into vendor_organizations / vendors / vendor_gsts / vendor_accs.
 *
 * Usage (from the api/ directory; DATABASE_URL is loaded from api/.env):
 *   pnpm migrate:vendor-master ../tms_sheet.xlsx --dry-run   # SELECT-only preview
 *   pnpm migrate:vendor-master ../tms_sheet.xlsx             # apply
 *   pnpm migrate:vendor-master ../tms_sheet.xlsx --sheet VM  # explicit worksheet
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
 * Safe to re-run the migration itself: organizations are matched by normalized name,
 * contacts are never overwritten, bank accounts are matched by account number, and GST
 * rows are skipped if the same (state, gstNo) already exists for that org.
 */
import "dotenv/config";
import { eq, sql, desc, asc, and } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { MigrationLogger } from "./migrationLogger";
import { parseVmSheet, type ParsedVendor } from "./parseVm";
import * as schema from "../src/db/schemas/vendors";

const normalizeKey = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

/** Read-only preview of a run: reports insert/update counts, performs no writes. */
async function reportDryRun(db: ReturnType<typeof createDb>, parsedVendors: ParsedVendor[], logger: MigrationLogger): Promise<void> {
    const orgRows = await db
        .select({ id: schema.vendorOrganizations.id, name: schema.vendorOrganizations.name, status: schema.vendorOrganizations.status })
        .from(schema.vendorOrganizations)
        .orderBy(desc(schema.vendorOrganizations.status), asc(schema.vendorOrganizations.id));
    const contactRows = await db.select({ orgId: schema.vendors.orgId }).from(schema.vendors);
    const accountRows = await db.select({ orgId: schema.vendorAccs.orgId, accountNum: schema.vendorAccs.accountNum }).from(schema.vendorAccs);
    const gstRows = await db.select({ orgId: schema.vendorGsts.orgId, gstState: schema.vendorGsts.gstState, gstNo: schema.vendorGsts.gstNo }).from(schema.vendorGsts);

    const orgByNorm = new Map<string, { id: number; name: string }>();
    for (const org of orgRows) {
        const key = normalizeKey(org.name);
        if (!orgByNorm.has(key)) orgByNorm.set(key, { id: org.id, name: org.name });
    }
    const orgsWithContact = new Set(contactRows.map(r => r.orgId));
    const accountKeys = new Set(accountRows.map(a => `${a.orgId}|${(a.accountNum ?? "").trim().toLowerCase()}`));
    const existingGstKeys = new Set(gstRows.map(g => `${g.orgId}|${g.gstState}|${g.gstNo}`));

    let orgsToInsert = 0;
    let orgsToUpdate = 0;
    let contactsToInsert = 0;
    let contactsToSkip = 0;
    let banksToInsert = 0;
    let banksToSkip = 0;
    let gstsToInsert = 0;
    let gstsToSkip = 0;

    for (const vendor of parsedVendors) {
        const existingOrg = orgByNorm.get(normalizeKey(vendor.name));

        if (!existingOrg) {
            orgsToInsert++;
            contactsToInsert++;
            if (vendor.bank) banksToInsert++;
            gstsToInsert += vendor.gsts.length;
            continue;
        }

        orgsToUpdate++;
        if (orgsWithContact.has(existingOrg.id)) contactsToSkip++;
        else contactsToInsert++;

        if (vendor.bank) {
            const key = `${existingOrg.id}|${vendor.bank.accountNum.trim().toLowerCase()}`;
            if (accountKeys.has(key)) banksToSkip++;
            else banksToInsert++;
        }

        for (const g of vendor.gsts) {
            if (existingGstKeys.has(`${existingOrg.id}|${g.gstState}|${g.gstNo}`)) gstsToSkip++;
            else gstsToInsert++;
        }
    }

    const summary =
        `Organizations: ${orgsToInsert} insert, ${orgsToUpdate} update\n` +
        `Contacts:      ${contactsToInsert} insert, ${contactsToSkip} skipped (existing contacts)\n` +
        `Bank accounts: ${banksToInsert} insert, ${banksToSkip} skipped (already present)\n` +
        `GST rows:      ${gstsToInsert} insert, ${gstsToSkip} skipped (already present)`;
    console.log(`\nDry run complete - nothing was written.\n${summary}`);
    logger.summary(`Dry run complete (SELECT only, no writes).\n${summary}`);
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const sheetIndex = args.indexOf("--sheet");
    const requestedSheet = sheetIndex >= 0 ? args[sheetIndex + 1] : undefined;
    if (sheetIndex >= 0) args.splice(sheetIndex, 2);
    const filePath = args.find(a => !a.startsWith("--"));
    if (!filePath) {
        console.error("Usage: npx tsx scripts/migrate-vendor-master.ts <path-to-xlsx> [--sheet VM] [--dry-run]");
        process.exit(1);
    }

    const { vendors: parsedVendors, warnings, anomalies, notes, corrections, sheetName, headerRowIndex } = parseVmSheet(filePath, { sheetName: requestedSheet });
    const logger = new MigrationLogger("./migration-logs", dryRun ? "vendor-master-dryrun" : "vendor-master");

    console.log(`Parsed ${parsedVendors.length} vendors from worksheet "${sheetName}" (header row ${headerRowIndex + 1}).`);
    console.log(`Log file:      ${logger.logPath}`);
    if (dryRun) {
        console.log("Mode:          DRY RUN - only SELECT statements will run.");
    } else {
        console.log(`Manifest file: ${logger.manifestPath}  (keep this - it's what rollback needs)`);
    }

    logger.log(`Source file: ${filePath}`);
    logger.log(`Worksheet: ${sheetName} (header row ${headerRowIndex + 1})`);
    logger.log(`Vendors parsed: ${parsedVendors.length}`);
    logger.log(`Mode: ${dryRun ? "dry run (SELECT only)" : "apply"}`);

    if (corrections.length) {
        console.info(`\n${corrections.length} data correction(s) applied in memory:`);
        logger.summary(`${corrections.length} data correction(s):`);
        for (const c of corrections) {
            console.info(` - [${c.vendorName}] ${c.message}`);
            logger.log(`CORRECTION [${c.vendorName}] ${c.message}`);
        }
    }

    if (warnings.length) {
        console.warn(`\n${warnings.length} parse warning(s):`);
        logger.summary(`${warnings.length} parse warning(s):`);
        for (const w of warnings) {
            console.warn(` - [${w.vendorName}] ${w.message}`);
            logger.log(`WARNING [${w.vendorName}] ${w.message}`);
        }
    }

    if (anomalies.length) {
        console.warn(`\n${anomalies.length} suspicious/incomplete value(s) - reported for review:`);
        logger.summary(`${anomalies.length} data anomaly(s):`);
        for (const a of anomalies) {
            console.warn(` - [${a.vendorName}] ${a.message}`);
            logger.log(`ANOMALY [${a.vendorName}] ${a.message}`);
        }
    }

    if (notes.length) {
        console.info(`\n${notes.length} GSTIN note(s):`);
        logger.summary(`${notes.length} GSTIN note(s):`);
        for (const n of notes) {
            console.info(` - [${n.vendorName}] ${n.message}`);
            logger.log(`NOTE [${n.vendorName}] ${n.message}`);
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
    let contactsSkipped = 0;
    let banksInserted = 0;
    let banksSkipped = 0;
    let gstRowsInserted = 0;
    let gstRowsSkipped = 0;

    try {
        if (dryRun) {
            await reportDryRun(db, parsedVendors, logger);
            return;
        }

        for (const vendor of parsedVendors) {
            await db.transaction(async tx => {
                const normalizedName = normalizeKey(vendor.name);
                const existingOrg = await tx
                    .select()
                    .from(schema.vendorOrganizations)
                    .where(sql`lower(btrim(${schema.vendorOrganizations.name})) = ${normalizedName}`)
                    .orderBy(desc(schema.vendorOrganizations.status), asc(schema.vendorOrganizations.id))
                    .limit(1);

                const orgUpdatedAt = new Date();
                const orgValues = {
                    name: vendor.name,
                    category: vendor.category ?? undefined,
                    pan: vendor.pan ?? undefined,
                    msme: vendor.msme ?? undefined,
                    msmeSize: vendor.msmeSize ?? undefined,
                    msmeType: vendor.msmeType ?? undefined,
                    majorActivity: vendor.majorActivity ?? undefined,
                    registrationType: vendor.registrationType ?? undefined,
                    creditPeriodDays: vendor.creditPeriodDays ?? undefined,
                    creditAmount: vendor.creditAmount ?? undefined,
                    address: vendor.address ?? undefined,
                    updatedAt: orgUpdatedAt,
                };

                let orgId: number;
                if (existingOrg.length > 0) {
                    orgId = existingOrg[0].id;
                    await tx
                        .update(schema.vendorOrganizations)
                        .set(orgValues)
                        .where(eq(schema.vendorOrganizations.id, orgId));

                    orgsUpdated++;
                    logger.log(
                        `vendor_organizations id=${orgId} UPDATE name="${vendor.name}" pan="${vendor.pan}" msme="${vendor.msme}" category="${vendor.category}" registration="${vendor.registrationType}"`
                    );
                    logger.record({
                        table: "vendor_organizations",
                        action: "update",
                        id: orgId,
                        before: existingOrg[0],
                        checkUpdatedAt: orgUpdatedAt.toISOString(),
                    });
                } else {
                    const [org] = await tx
                        .insert(schema.vendorOrganizations)
                        .values(orgValues)
                        .returning({ id: schema.vendorOrganizations.id });
                    orgId = org.id;

                    orgsInserted++;
                    logger.log(
                        `vendor_organizations id=${orgId} INSERT name="${vendor.name}" pan="${vendor.pan}" msme="${vendor.msme}" category="${vendor.category}" registration="${vendor.registrationType}"`
                    );
                    logger.record({
                        table: "vendor_organizations",
                        action: "insert",
                        id: orgId,
                        checkUpdatedAt: orgUpdatedAt.toISOString(),
                    });
                }

                // --- 2. Contact record (never overwrite existing contacts) -------------
                const existingContact = await tx.select({ id: schema.vendors.id }).from(schema.vendors).where(eq(schema.vendors.orgId, orgId)).limit(1);

                if (existingContact.length > 0) {
                    contactsSkipped++;
                    logger.log(`vendors orgId=${orgId} SKIP existing contact id=${existingContact[0].id}`);
                } else {
                    const contactUpdatedAt = new Date();
                    const [contact] = await tx
                        .insert(schema.vendors)
                        .values({
                            orgId,
                            name: vendor.name,
                            email: vendor.email,
                            mobile: vendor.phone,
                            createdAt: contactUpdatedAt,
                            updatedAt: contactUpdatedAt,
                        })
                        .returning({ id: schema.vendors.id });

                    contactsInserted++;
                    logger.log(`vendors id=${contact.id} INSERT orgId=${orgId} email="${vendor.email}" mobile="${vendor.phone}"`);
                    logger.record({
                        table: "vendors",
                        action: "insert",
                        id: contact.id,
                        checkUpdatedAt: contactUpdatedAt.toISOString(),
                    });
                }

                // --- 3. Bank account (insert-only, matched by account number) ---------
                if (vendor.bank) {
                    const normalizedAccount = vendor.bank.accountNum.trim().toLowerCase();
                    const existingAccount = await tx
                        .select({ id: schema.vendorAccs.id })
                        .from(schema.vendorAccs)
                        .where(and(eq(schema.vendorAccs.orgId, orgId), sql`lower(btrim(${schema.vendorAccs.accountNum})) = ${normalizedAccount}`))
                        .limit(1);

                    if (existingAccount.length > 0) {
                        banksSkipped++;
                        logger.log(`vendor_accs orgId=${orgId} SKIP existing account id=${existingAccount[0].id}`);
                    } else {
                        const accountUpdatedAt = new Date();
                        const [account] = await tx
                            .insert(schema.vendorAccs)
                            .values({
                                orgId,
                                bankAccountName: vendor.bank.bankAccountName,
                                accountNum: vendor.bank.accountNum,
                                ifscCode: vendor.bank.ifscCode,
                                branch: vendor.bank.branch,
                                swiftCode: vendor.bank.swiftCode,
                                createdAt: accountUpdatedAt,
                                updatedAt: accountUpdatedAt,
                            })
                            .returning({ id: schema.vendorAccs.id });

                        banksInserted++;
                        logger.log(`vendor_accs id=${account.id} INSERT orgId=${orgId} account="${vendor.bank.accountNum}" ifsc="${vendor.bank.ifscCode}"`);
                        logger.record({
                            table: "vendor_accs",
                            action: "insert",
                            id: account.id,
                            checkUpdatedAt: accountUpdatedAt.toISOString(),
                        });
                    }
                }

                // --- 4. GST registrations (insert-only, duplicates skipped) ----------
                if (vendor.gsts.length > 0) {
                    const existingGsts = await tx
                        .select({ gstState: schema.vendorGsts.gstState, gstNo: schema.vendorGsts.gstNo })
                        .from(schema.vendorGsts)
                        .where(eq(schema.vendorGsts.orgId, orgId));

                    const existingKeys = new Set(existingGsts.map(g => `${g.gstState}|${g.gstNo}`));
                    const gstUpdatedAt = new Date();

                    const toInsert = vendor.gsts.filter(g => !existingKeys.has(`${g.gstState}|${g.gstNo}`));
                    gstRowsSkipped += vendor.gsts.length - toInsert.length;

                    for (const g of toInsert) {
                        const [row] = await tx
                            .insert(schema.vendorGsts)
                            .values({
                                orgId,
                                gstState: g.gstState,
                                gstNo: g.gstNo,
                                address: g.address,
                                createdAt: gstUpdatedAt,
                                updatedAt: gstUpdatedAt,
                            })
                            .returning({ id: schema.vendorGsts.id });

                        gstRowsInserted++;
                        logger.log(`vendor_gsts id=${row.id} INSERT orgId=${orgId} state="${g.gstState}" gstNo="${g.gstNo}"`);
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
            `Contacts:      ${contactsInserted} inserted, ${contactsSkipped} skipped (existing contacts)\n` +
            `Bank accounts: ${banksInserted} inserted, ${banksSkipped} skipped\n` +
            `GST rows:      ${gstRowsInserted} inserted, ${gstRowsSkipped} skipped`;
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
