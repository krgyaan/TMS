import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, time, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import {
    tenderInfos,
    tenderInformation,
    tenderClients,
    tenderTechnicalDocuments,
    tenderFinancialDocuments,
} from './src/db/schema';

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
const mysqlPool = mysql2.createPool(MYSQL_URL);

let db: ReturnType<typeof pgDrizzle>;
let mysqlDb: ReturnType<typeof mysqlDrizzle>;

// Old tender_infos table (MySQL)
const mysql_tender_infos = mysqlTable('tender_infos', {
    id: int('id').primaryKey().autoincrement(),
    team: varchar('team', { length: 10 }).notNull(),
    tender_no: varchar('tender_no', { length: 255 }).notNull(),
    organisation: varchar('organisation', { length: 255 }),
    tender_name: varchar('tender_name', { length: 255 }).notNull(),
    item: varchar('item', { length: 255 }).notNull(),
    gst_values: decimal('gst_values', { precision: 15, scale: 2 }).notNull(),
    tender_fees: decimal('tender_fees', { precision: 15, scale: 2 }).notNull(),
    emd: decimal('emd', { precision: 15, scale: 2 }).notNull(),
    team_member: int('team_member'),
    due_date: date('due_date').notNull(),
    due_time: time('due_time').notNull(),
    remarks: varchar('remarks', { length: 200 }),
    status: int('status').notNull(),
    location: int('location'),
    website: int('website'),
    deleteStatus: varchar('deleteStatus', { length: 1 }).notNull().default('0'),
    tlStatus: varchar('tlStatus', { length: 1 }).notNull().default('0'),
    tlRemarks: varchar('tlRemarks', { length: 200 }),
    rfq_to: varchar('rfq_to', { length: 255 }),
    oem_who_denied: varchar('oem_who_denied', { length: 255 }),
    costing_status: varchar('costing_status', { length: 20 }),
    costing_remarks: varchar('costing_remarks', { length: 500 }),
    client_mobile: varchar('client_mobile', { length: 20 }),
    client_organisation: varchar('client_organisation', { length: 255 }),
    client_designation: varchar('client_designation', { length: 255 }),
    courier_address: text('courier_address'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
    status_remark: text('status_remark'),
    project_id: bigint('project_id', { mode: 'number' }),
});

// Old tender_information table (MySQL)
const mysql_tender_information = mysqlTable('tender_information', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }).notNull(),
    is_rejectable: varchar('is_rejectable', { length: 10 }),
    reject_reason: varchar('reject_reason', { length: 10 }),
    reject_remarks: text('reject_remarks'),
    tender_fees: varchar('tender_fees', { length: 200 }),
    emd_req: varchar('emd_req', { length: 255 }),
    emd_opt: varchar('emd_opt', { length: 200 }),
    rev_auction: varchar('rev_auction', { length: 10 }),
    pt_supply: varchar('pt_supply', { length: 255 }),
    pt_ic: varchar('pt_ic', { length: 255 }),
    pbg: varchar('pbg', { length: 10 }),
    pbg_duration: varchar('pbg_duration', { length: 10 }),
    bid_valid: varchar('bid_valid', { length: 10 }),
    comm_eval: varchar('comm_eval', { length: 10 }),
    maf_req: varchar('maf_req', { length: 10 }),
    supply: varchar('supply', { length: 255 }),
    installation: varchar('installation', { length: 255 }),
    ldperweek: varchar('ldperweek', { length: 10 }),
    maxld: varchar('maxld', { length: 10 }),
    phyDocs: varchar('phyDocs', { length: 10 }),
    dead_date: date('dead_date'),
    dead_time: time('dead_time'),
    tech_eligible: varchar('tech_eligible', { length: 10 }),
    order1: varchar('order1', { length: 255 }),
    order2: varchar('order2', { length: 255 }),
    order3: varchar('order3', { length: 255 }),
    aat: varchar('aat', { length: 100 }),
    aat_amt: varchar('aat_amt', { length: 255 }),
    wc: varchar('wc', { length: 100 }),
    wc_amt: varchar('wc_amt', { length: 255 }),
    sc: varchar('sc', { length: 100 }),
    sc_amt: varchar('sc_amt', { length: 255 }),
    nw: varchar('nw', { length: 100 }),
    nw_amt: varchar('nw_amt', { length: 255 }),
    pqr_eligible: int('pqr_eligible'),
    fin_eligible: int('fin_eligible'),
    te_remark: text('te_remark'),
    rej_remark: varchar('rej_remark', { length: 1000 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Map old tender_infos.id -> new tenderInfos.id
const tenderInfoIdMap = new Map<number, number>();

// Store tender_information data for later use
interface TenderInformationData {
    tenderId: number;
    emdMode: string | null;
    tenderFeeMode: string | null;
    pqrEligible: number | null;
    finEligible: number | null;
    clientOrganisation: string | null;
    courierAddress: string | null;
}
const tenderInformationDataMap = new Map<number, TenderInformationData>();

const parseDecimal = (val: string | number | null | undefined): string | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
    return isNaN(num) ? null : num.toFixed(2);
};

const parseInteger = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
    return isNaN(num) ? null : num;
};

const parseDate = (val: string | Date | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateTimeFromDateAndTime = (dateVal: string | Date | null, timeVal: string | null): Date | null => {
    if (!dateVal) return null;

    const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString().split('T')[0];
    const timeStr = timeVal || '00:00:00';

    const combined = new Date(`${dateStr}T${timeStr}`);
    return isNaN(combined.getTime()) ? new Date(dateVal) : combined;
};

const parseBoolean = (val: string | number | null | undefined): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'number') return val === 1;
    const s = String(val).toLowerCase().trim();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y';
};

const parseArrayFromString = (val: string | null | undefined): string[] | null => {
    if (!val || val.trim() === '') return null;
    return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

const safeString = (val: string | null | undefined, maxLength?: number): string | null => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (str === '') return null;
    return maxLength ? str.substring(0, maxLength) : str;
};

async function preloadTenderInformationData() {
    console.log('Pre-loading tender_information data...');
    const rows = await mysqlDb.select().from(mysql_tender_information);

    for (const r of rows) {
        const tenderId = Number(r.tender_id);
        tenderInformationDataMap.set(tenderId, {
            tenderId: tenderId,
            emdMode: r.emd_opt ?? null,
            tenderFeeMode: r.tender_fees ?? null,
            pqrEligible: r.pqr_eligible ?? null,
            finEligible: r.fin_eligible ?? null,
            clientOrganisation: null, // Will get from tender_infos
            courierAddress: null, // Will get from tender_infos
        });
    }

    console.log(`Pre-loaded ${tenderInformationDataMap.size} tender_information records`);
}

async function migrateTenderInfos() {
    console.log('Migrating tender_infos...');
    const rows = await mysqlDb.select().from(mysql_tender_infos);
    let count = 0;
    let errorCount = 0;

    for (const r of rows) {
        try {
            // Parse team - might be a string ID or name
            const teamId = parseInteger(r.team) ?? 1;
            const itemId = parseInteger(r.item) ?? 1;
            const orgId = r.organisation ? (parseInteger(r.organisation) ?? null) : null;
            const dueDateTime = parseDateTimeFromDateAndTime(r.due_date, r.due_time);
            const infoData = tenderInformationDataMap.get(r.id);
            const emdModeArray = infoData ? parseArrayFromString(infoData.emdMode) : null;
            const tenderFeeModeArray = infoData ? parseArrayFromString(infoData.tenderFeeMode) : null;

            let approvePqrSelection: string | null = null;
            let approveFinanceDocSelection: string | null = null;

            if (infoData) {
                if (infoData.pqrEligible === 1) approvePqrSelection = 'Yes';
                else if (infoData.pqrEligible === 0) approvePqrSelection = 'No';

                if (infoData.finEligible === 1) approveFinanceDocSelection = 'Yes';
                else if (infoData.finEligible === 0) approveFinanceDocSelection = 'No';
            }

            if (infoData) {
                infoData.clientOrganisation = r.client_organisation ?? null;
                infoData.courierAddress = r.courier_address ?? null;
            }

            const [newRecord] = await db.insert(tenderInfos).values({
                team: teamId,
                tenderNo: r.tender_no,
                organization: orgId,
                tenderName: r.tender_name,
                item: itemId,
                gstValues: parseDecimal(r.gst_values) ?? '0',
                tenderFees: parseDecimal(r.tender_fees) ?? '0',
                emd: parseDecimal(r.emd) ?? '0',
                teamMember: r.team_member ?? 1,
                dueDate: dueDateTime ?? new Date(),
                remarks: safeString(r.remarks, 200),
                status: r.status ?? 1,
                location: r.location ?? null,
                website: r.website ?? null,
                courierAddress: r.courier_address ?? null,
                deleteStatus: r.deleteStatus === '1' ? 1 : 0,
                tlRemarks: safeString(r.tlRemarks, 200),
                rfqTo: safeString(r.rfq_to, 15),
                tlStatus: parseInteger(r.tlStatus) ?? 0,
                tenderFeeMode: tenderFeeModeArray ? tenderFeeModeArray.join(',') : null,
                emdMode: emdModeArray ? emdModeArray.join(',') : null,
                approvePqrSelection: approvePqrSelection,
                approveFinanceDocSelection: approveFinanceDocSelection,
                tenderApprovalStatus: r.costing_status ?? null,
                tlRejectionRemarks: r.costing_remarks ?? null,
                oemNotAllowed: r.oem_who_denied ?? null,

                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            }).returning({ id: tenderInfos.id });

            tenderInfoIdMap.set(r.id, newRecord.id);

            // Migrate client info to tenderClients table
            if (r.client_mobile || r.client_organisation || r.client_designation) {
                await db.insert(tenderClients).values({
                    tenderId: newRecord.id,
                    clientName: r.client_organisation ?? null, // Using organisation as name
                    clientDesignation: r.client_designation ?? null,
                    clientMobile: r.client_mobile ?? null,
                    clientEmail: null,
                    createdAt: parseDate(r.created_at) ?? new Date(),
                    updatedAt: parseDate(r.updated_at) ?? new Date(),
                });
            }

            count++;
        } catch (err) {
            console.error(`Error migrating tender_infos ${r.id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} tender_infos (${errorCount} errors)`);
}

async function migrateTenderInformation() {
    console.log('Migrating tender_information...');
    const rows = await mysqlDb.select().from(mysql_tender_information);
    let count = 0;
    let errorCount = 0;

    for (const r of rows) {
        try {
            // Get the new tender ID from the map
            const newTenderId = tenderInfoIdMap.get(Number(r.tender_id));

            if (!newTenderId) {
                console.warn(`No tender found for tender_id: ${r.tender_id}, skipping...`);
                continue;
            }

            // Get stored data from preload (includes client_organisation and courier_address)
            const infoData = tenderInformationDataMap.get(Number(r.tender_id));

            // Parse tender fees mode (comma-separated string to array)
            const tenderFeeMode = parseArrayFromString(r.tender_fees);

            // Parse EMD mode
            const emdMode = parseArrayFromString(r.emd_opt);

            // Combine dead_date and dead_time
            const physicalDocsDeadline = parseDateTimeFromDateAndTime(r.dead_date, r.dead_time);

            // Parse delivery time - supply might have format like "30 days" or just number
            const supplyDays = parseInteger(r.supply?.replace(/\D/g, ''));

            // Parse installation - might have format like "inclusive" or "30 days"
            const installationInclusive = r.installation?.toLowerCase().includes('inclusive') ?? false;
            const installationDays = parseInteger(r.installation?.replace(/\D/g, ''));

            await db.insert(tenderInformation).values({
                tenderId: newTenderId,

                // TE Recommendation
                teRecommendation: r.is_rejectable ?? 'Yes',
                teRejectionReason: parseInteger(r.reject_reason),
                teRejectionRemarks: r.reject_remarks ?? r.rej_remark ?? null,

                // Fees - Note: tender_fees in old table is mode, not amount
                processingFeeRequired: null, // Not in old schema separately
                processingFeeAmount: null, // Not in old schema separately
                processingFeeMode: null, // Not in old schema separately
                tenderFeeRequired: 'Yes', // Not in old schema separately
                tenderFeeAmount: null, // Not in old schema separately
                tenderFeeMode: tenderFeeMode,

                // EMD
                emdRequired: r.emd_req ?? null,
                emdMode: emdMode,

                // Auction & Terms
                reverseAuctionApplicable: r.rev_auction ?? null,
                paymentTermsSupply: parseInteger(r.pt_supply),
                paymentTermsInstallation: parseInteger(r.pt_ic),
                bidValidityDays: parseInteger(r.bid_valid),
                commercialEvaluation: r.comm_eval ?? null,
                mafRequired: r.maf_req ?? null,

                // Delivery Time
                deliveryTimeSupply: supplyDays,
                deliveryTimeInstallationInclusive: installationInclusive,
                deliveryTimeInstallationDays: installationDays,

                // PBG
                pbgRequired: 'Yes', // Not in old schema separately
                pbgMode: r.pbg ?? null,
                pbgPercentage: parseDecimal(r.pbg),
                pbgDurationMonths: parseInteger(r.pbg_duration),

                // Security Deposit - not in old schema
                sdRequired: 'No', // Not in old schema separately
                sdMode: null,
                sdPercentage: null,
                sdDurationMonths: null,

                // LD
                ldRequired: 'Yes', // Not in old schema separately
                ldPercentagePerWeek: parseDecimal(r.ldperweek),
                maxLdPercentage: parseDecimal(r.maxld),

                // Physical Docs
                physicalDocsRequired: r.phyDocs ?? null,
                physicalDocsDeadline: physicalDocsDeadline,

                // Technical Eligibility
                techEligibilityAge: parseInteger(r.tech_eligible),
                workOrderValue1Required: 'Yes', // Not in old schema separately
                orderValue1: parseDecimal(r.order1),
                wo1Custom: null, // Not in old schema separately
                workOrderValue2Required: 'Yes', // Not in old schema separately
                orderValue2: parseDecimal(r.order2),
                wo2Custom: null, // Not in old schema separately
                workOrderValue3Required: 'Yes', // Not in old schema separately
                orderValue3: parseDecimal(r.order3),
                wo3Custom: null, // Not in old schema separately

                // Financial Requirements
                avgAnnualTurnoverType: r.aat ?? null,
                avgAnnualTurnoverValue: parseDecimal(r.aat_amt),

                workingCapitalType: r.wc ?? null,
                workingCapitalValue: parseDecimal(r.wc_amt),

                solvencyCertificateType: r.sc ?? null,
                solvencyCertificateValue: parseDecimal(r.sc_amt),

                netWorthType: r.nw ?? null,
                netWorthValue: parseDecimal(r.nw_amt),

                // Client & Address - from tender_infos via preloaded data
                // Note: clientOrganisation is stored in tenderClients table, not here
                courierAddress: infoData?.courierAddress ?? null,

                // Final Remark
                teFinalRemark: r.te_remark ?? null,

                createdAt: parseDate(r.created_at) ?? new Date(),
                updatedAt: parseDate(r.updated_at) ?? new Date(),
            });

            count++;
        } catch (err) {
            console.error(`Error migrating tender_information ${r.id}:`, err);
            errorCount++;
        }
    }

    console.log(`Migrated ${count} tender_information (${errorCount} errors)`);
}

async function migrateTechnicalDocuments() {
    console.log('Migrating technical documents...');

    const rows = await mysqlDb.select().from(mysql_tender_information);
    let count = 0;

    for (const r of rows) {
        if (r.pqr_eligible === 1) {
            const newTenderId = tenderInfoIdMap.get(Number(r.tender_id));
            if (!newTenderId) continue;

            try {
                await db.insert(tenderTechnicalDocuments).values({
                    tenderId: newTenderId,
                    documentName: 'PQR Documents Required',
                    createdAt: parseDate(r.created_at) ?? new Date(),
                    updatedAt: parseDate(r.updated_at) ?? new Date(),
                });
                count++;
            } catch (err) {
                // Ignore duplicates
            }
        }
    }

    console.log(`Created ${count} technical document entries`);
}

async function migrateFinancialDocuments() {
    console.log('Migrating financial documents...');

    const rows = await mysqlDb.select().from(mysql_tender_information);
    let count = 0;

    for (const r of rows) {
        if (r.fin_eligible === 1) {
            const newTenderId = tenderInfoIdMap.get(Number(r.tender_id));
            if (!newTenderId) continue;

            try {
                await db.insert(tenderFinancialDocuments).values({
                    tenderId: newTenderId,
                    documentName: 'Financial Documents Required',
                    createdAt: parseDate(r.created_at) ?? new Date(),
                    updatedAt: parseDate(r.updated_at) ?? new Date(),
                });
                count++;
            } catch (err) {
                // Ignore duplicates
            }
        }
    }

    console.log(`Created ${count} financial document entries`);
}

async function runMigration() {
    try {
        console.log('='.repeat(60));
        console.log('Starting Tender Information Migration: MySQL → PostgreSQL');
        console.log('='.repeat(60));

        console.log('\nConnecting to databases...');
        await pgClient.connect();
        db = pgDrizzle(pgClient as any);
        mysqlDb = mysqlDrizzle(mysqlPool as any);
        console.log('Connected successfully!\n');

        // Step 0: Pre-load tender_information data
        console.log('Step 0/5: Pre-loading tender_information data...');
        await preloadTenderInformationData();

        // Step 1: Migrate tender_infos (main table)
        console.log('\nStep 1/5: Migrating tender_infos...');
        await migrateTenderInfos();

        // Step 2: Migrate tender_information (detail table)
        console.log('\nStep 2/5: Migrating tender_information...');
        await migrateTenderInformation();

        // Step 3: Create technical documents
        console.log('\nStep 3/5: Creating technical documents...');
        await migrateTechnicalDocuments();

        // Step 4: Create financial documents
        console.log('\nStep 4/5: Creating financial documents...');
        await migrateFinancialDocuments();

        // Step 5: Print summary
        console.log('\nStep 5/5: Generating Summary...');

        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total tender_infos migrated: ${tenderInfoIdMap.size}`);
        console.log(`Total tender_information pre-loaded: ${tenderInformationDataMap.size}`);
        console.log('='.repeat(60));
        console.log('Migration completed successfully!');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('\nMigration failed:', err);
        throw err;
    } finally {
        console.log('\nClosing database connections...');
        await pgClient.end();
        await mysqlPool.end();
        console.log('Connections closed.');
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\nExiting with success code 0');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\nExiting with error code 1');
        console.error(err);
        process.exit(1);
    });
