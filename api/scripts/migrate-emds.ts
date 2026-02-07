import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client, Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// MYSQL SCHEMA DEFINITIONS

const mysqlEmds = mysqlTable('emds', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    type: varchar('type', { length: 50 }),
    tender_id: bigint('tender_id', { mode: 'number' }),
    tender_no: varchar('tender_no', { length: 500 }),
    project_name: varchar('project_name', { length: 255 }),
    due_date: timestamp('due_date'),
    requested_by: varchar('requested_by', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlEmdFdrs = mysqlTable('emd_fdrs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    fdr_favour: varchar('fdr_favour', { length: 255 }),
    fdr_amt: varchar('fdr_amt', { length: 255 }),
    fdr_expiry: varchar('fdr_expiry', { length: 255 }),
    fdr_needs: varchar('fdr_needs', { length: 255 }),
    fdr_purpose: varchar('fdr_purpose', { length: 255 }),
    courier_deadline: int('courier_deadline'),
    courier_add: varchar('courier_add', { length: 255 }),
    fdr_no: varchar('fdr_no', { length: 200 }),
    fdr_date: date('fdr_date'),
    action: int('action'),
    fdr_source: varchar('fdr_source', { length: 200 }),
    fdr_remark: text('fdr_remark'),
    fdr_payable: varchar('fdr_payable', { length: 255 }),
    remarks: text('remarks'),
    status: varchar('status', { length: 100 }),
    generated_fdr: varchar('generated_fdr', { length: 500 }),
    fdrcancel_pdf: varchar('fdrcancel_pdf', { length: 500 }),
    req_receive: varchar('req_receive', { length: 500 }),
    covering_letter: varchar('covering_letter', { length: 500 }),
    req_no: varchar('req_no', { length: 200 }),
    docket_no: varchar('docket_no', { length: 200 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    reference_no: varchar('reference_no', { length: 200 }),
    date: date('date'),
    amount: varchar('amount', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlEmdDemandDrafts = mysqlTable('emd_demand_drafts', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_favour: varchar('dd_favour', { length: 255 }),
    dd_amt: varchar('dd_amt', { length: 255 }),
    dd_payable: varchar('dd_payable', { length: 255 }),
    dd_needs: varchar('dd_needs', { length: 255 }),
    dd_purpose: varchar('dd_purpose', { length: 255 }),
    courier_add: varchar('courier_add', { length: 255 }),
    courier_deadline: int('courier_deadline'),
    action: int('action'),
    status: varchar('status', { length: 100 }),
    dd_date: date('dd_date'),
    dd_no: varchar('dd_no', { length: 200 }),
    req_no: varchar('req_no', { length: 200 }),
    remarks: varchar('remarks', { length: 200 }),
    generated_dd: varchar('generated_dd', { length: 500 }),
    docket_no: varchar('docket_no', { length: 200 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    ddcancel_pdf: varchar('ddcancel_pdf', { length: 500 }),
    date: date('date'),
    amount: varchar('amount', { length: 200 }),
    reference_no: varchar('reference_no', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlEmdBgs = mysqlTable('emd_bgs', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bg_favour: varchar('bg_favour', { length: 255 }),
    bg_address: varchar('bg_address', { length: 255 }),
    bg_expiry: date('bg_expiry'),
    bg_claim: date('bg_claim'),
    bg_amt: varchar('bg_amt', { length: 255 }),
    bg_bank: varchar('bg_bank', { length: 255 }),
    bg_cont_percent: varchar('bg_cont_percent', { length: 255 }),
    bg_fdr_percent: varchar('bg_fdr_percent', { length: 255 }),
    bg_needs: varchar('bg_needs', { length: 255 }),
    bg_purpose: varchar('bg_purpose', { length: 255 }),
    bg_stamp: varchar('bg_stamp', { length: 255 }),
    bg_courier_addr: varchar('bg_courier_addr', { length: 255 }),
    bg_courier_deadline: int('bg_courier_deadline'),
    bg_soft_copy: varchar('bg_soft_copy', { length: 255 }),
    bg_po: varchar('bg_po', { length: 255 }),
    bg_client_user: varchar('bg_client_user', { length: 255 }),
    bg_client_cp: varchar('bg_client_cp', { length: 255 }),
    bg_client_fin: varchar('bg_client_fin', { length: 255 }),
    bg_bank_name: varchar('bg_bank_name', { length: 255 }),
    bg_bank_acc: varchar('bg_bank_acc', { length: 255 }),
    bg_bank_ifsc: varchar('bg_bank_ifsc', { length: 255 }),
    action: varchar('action', { length: 50 }),
    status: varchar('bg_req', { length: 255 }),
    reason_req: text('reason_req'),
    approve_bg: varchar('approve_bg', { length: 255 }),
    bg_format_te: varchar('bg_format_te', { length: 255 }),
    bg_format_tl: varchar('bg_format_imran', { length: 255 }),
    prefilled_signed_bg: text('prefilled_signed_bg'),
    bg_no: varchar('bg_no', { length: 255 }),
    bg_date: date('bg_date'),
    bg_validity: date('bg_validity'),
    claim_expiry: date('claim_expiry'),
    courier_no: varchar('courier_no', { length: 255 }),
    bg2_remark: text('bg2_remark'),
    sfms_conf: varchar('sfms_conf', { length: 255 }),
    fdr_amt: varchar('fdr_amt', { length: 255 }),
    fdr_per: varchar('fdr_per', { length: 255 }),
    fdr_copy: varchar('fdr_copy', { length: 255 }),
    fdr_no: varchar('fdr_no', { length: 255 }),
    fdr_validity: date('fdr_validity'),
    fdr_roi: varchar('fdr_roi', { length: 255 }),
    bg_charge_deducted: varchar('bg_charge_deducted', { length: 255 }),
    sfms_charge_deducted: varchar('sfms_charge_deducted', { length: 255 }),
    stamp_charge_deducted: varchar('stamp_charge_deducted', { length: 255 }),
    other_charge_deducted: varchar('other_charge_deducted', { length: 255 }),
    new_stamp_charge_deducted: decimal('new_stamp_charge_deducted', { precision: 10, scale: 2 }),
    new_bg_bank_name: varchar('new_bg_bank_name', { length: 255 }),
    new_bg_amt: decimal('new_bg_amt', { precision: 20, scale: 2 }),
    new_bg_expiry: date('new_bg_expiry'),
    new_bg_claim: decimal('new_bg_claim', { precision: 10, scale: 2 }),
    ext_letter: varchar('ext_letter', { length: 255 }),
    request_extension_pdf: varchar('request_extension_pdf', { length: 255 }),
    docket_no: varchar('docket_no', { length: 255 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    stamp_covering_letter: varchar('stamp_covering_letter', { length: 255 }),
    request_cancellation_pdf: varchar('request_cancellation_pdf', { length: 255 }),
    cancel_remark: text('cancel_remark'),
    cancell_confirm: text('cancell_confirm'),
    bg_fdr_cancel_date: varchar('bg_fdr_cancel_date', { length: 255 }),
    bg_fdr_cancel_amount: varchar('bg_fdr_cancel_amount', { length: 255 }),
    bg_fdr_cancel_ref_no: varchar('bg_fdr_cancel_ref_no', { length: 255 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlEmdCheques = mysqlTable('emd_cheques', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_id: bigint('dd_id', { mode: 'number' }),
    fdr_id: bigint('fdr_id', { mode: 'number' }),
    req_type: varchar('req_type', { length: 255 }),
    cheque_favour: varchar('cheque_favour', { length: 255 }),
    cheque_amt: varchar('cheque_amt', { length: 255 }),
    cheque_date: varchar('cheque_date', { length: 255 }),
    cheque_needs: varchar('cheque_needs', { length: 255 }),
    cheque_reason: varchar('cheque_reason', { length: 255 }),
    cheque_bank: varchar('cheque_bank', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 200 }),
    reason: varchar('reason', { length: 200 }),
    cheque_no: varchar('cheq_no', { length: 200 }),
    duedate: date('duedate'),
    handover: varchar('handover', { length: 200 }),
    cheque_img: varchar('cheq_img', { length: 200 }),
    confirmation: varchar('confirmation', { length: 200 }),
    remarks: varchar('remarks', { length: 200 }),
    stop_reason_text: text('stop_reason_text'),
    transfer_date: date('transfer_date'),
    amount: varchar('amount', { length: 200 }),
    utr: varchar('utr', { length: 200 }),
    bt_transfer_date: date('bt_transfer_date'),
    reference: varchar('reference', { length: 200 }),
    cancelled_img: varchar('cancelled_img', { length: 200 }),
    generated_pdfs: text('generated_pdfs'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlBankTransfers = mysqlTable('bank_transfers', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    purpose: varchar('purpose', { length: 255 }),
    bt_amount: varchar('bt_amount', { length: 200 }),
    bt_acc_name: varchar('bt_acc_name', { length: 255 }),
    bt_acc: varchar('bt_acc', { length: 255 }),
    bt_ifsc: varchar('bt_ifsc', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 200 }),
    reason: text('reason'),
    date_time: timestamp('date_time'),
    utr: varchar('utr', { length: 200 }),
    utr_msg: text('utr_mgs'),
    remarks: varchar('remarks', { length: 200 }),
    transfer_date: date('transfer_date'),
    utr_num: varchar('utr_num', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlPayOnPortals = mysqlTable('pay_on_portals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    purpose: varchar('purpose', { length: 255 }),
    portal: varchar('portal', { length: 255 }),
    is_netbanking: varchar('is_netbanking', { length: 255 }),
    is_debit: varchar('is_debit', { length: 255 }),
    amount: varchar('amount', { length: 255 }),
    action: int('action'),
    status: varchar('status', { length: 255 }),
    date_time: timestamp('date_time'),
    utr_num: varchar('utr_num', { length: 200 }),
    utr_msg: text('utr_mgs'),
    remarks: varchar('remarks', { length: 200 }),
    reason: text('reason'),
    transfer_date: date('transfer_date'),
    utr: varchar('utr', { length: 200 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});
import {
    paymentRequests, paymentInstruments, instrumentDdDetails,
    instrumentFdrDetails, instrumentBgDetails, instrumentChequeDetails,
    instrumentTransferDetails
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos, users } from '@/db/schemas';

// Configuration
const CONFIG = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms',
    mysql: process.env.MYSQL_URL || 'mysql://root:gyan@localhost:3306/mydb',
    batchSize: 100 // Process in chunks to save memory
};

// Logger Setup
const LOG_FILE = path.join(process.cwd(), 'migration_errors.json');
const errorLog: any[] = [];

function logError(table: string, id: number | string, error: any) {
    const errObj = {
        table,
        originalId: id,
        message: error.message,
        timestamp: new Date().toISOString()
    };
    console.error(`  ❌ Failed: ${table} ID ${id} - ${error.message}`);
    errorLog.push(errObj);
    // Write to disk immediately in case of crash
    fs.writeFileSync(LOG_FILE, JSON.stringify(errorLog, null, 2));
}

// ----------------------------------------------------------------------------
// UTILS & PARSERS
// ----------------------------------------------------------------------------

const Parsers = {
    amount: (val: any) => {
        if (!val) return '0.00';
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    },
    date: (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },
    dateString: (val: any) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    },
    // Safe truncate for strings to fit DB limits
    string: (val: any, limit = 255) => {
        if (!val) return null;
        const s = String(val).trim();
        return s.substring(0, limit);
    }
};

const StatusMapper = {
    getStage: (status: string) => {
        // Simplified logic based on previous context
        if (status.includes('SUBMITTED') || status.includes('PENDING')) return 1;
        if (status.includes('CREATED') || status.includes('CAPTURED')) return 2;
        if (status.includes('RETURN') || status.includes('STOP')) return 3;
        if (status.includes('SETTLED') || status.includes('DEPOSIT')) return 4;
        if (status.includes('CANCEL')) return 5;
        return 1;
    },
    map: (type: string, status: string | null, action: any) => {
        const s = (status || '').toUpperCase();
        const act = Number(action);

        // Default fallbacks
        if (s.includes('REJECTED')) return `${type}_ACCOUNTS_FORM_REJECTED`;
        if (s.includes('ACCEPTED')) return `${type}_ACCOUNTS_FORM_ACCEPTED`;

        // Specifics (Abbreviated for brevity, expand based on your business logic)
        if (act === 1) return `${type}_ACCOUNTS_FORM_SUBMITTED`;
        if (act === 3 || act === 4) return `${type}_RETURN_INITIATED`;

        return `${type}_ACCOUNTS_FORM_PENDING`;
    }
};

// ----------------------------------------------------------------------------
// MIGRATION CLASSES
// ----------------------------------------------------------------------------

class MigrationEngine {
    private pgClient: Client;
    private pgDb: ReturnType<typeof pgDrizzle>;
    private mysqlPool: mysql2.Pool;
    private mysqlDb: ReturnType<typeof mysqlDrizzle>;
    private userCache: Map<string, number> = new Map(); // Cache for user name -> user ID lookups

    constructor() {
        this.pgClient = new Client({ connectionString: CONFIG.postgres });
        this.mysqlPool = mysql2.createPool(CONFIG.mysql);
        this.pgDb = pgDrizzle(this.pgClient as unknown as Pool);
        this.mysqlDb = mysqlDrizzle(this.mysqlPool as any);
    }

    async init() {
        await this.pgClient.connect();
        console.log('🔌 Databases connected.');
    }

    async close() {
        await this.pgClient.end();
        await this.mysqlPool.end();
        console.log('🔌 Connections closed.');
    }

    async cleanDatabase() {
        console.log('\n🧹 Cleaning PostgreSQL Database (Clean Slate)...');
        const tables = [
            'instrument_cheque_details', 'instrument_bg_details', 'instrument_fdr_details',
            'instrument_dd_details', 'instrument_transfer_details',
            'payment_instruments', 'payment_requests'
        ];

        for (const table of tables) {
            await this.pgClient.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
        }
        console.log('   ✓ All target tables truncated.');
    }

    async postProcess() {
        console.log('\n⚖️  Running Post-Migration Updates...');

        // 1. Update Amounts in Payment Requests
        console.log('   ...Updating Request Total Amounts');
        await this.pgClient.query(`
            UPDATE payment_requests pr
            SET amount_required = (
                SELECT COALESCE(SUM(amount), 0)
                FROM payment_instruments pi
                WHERE pi.request_id = pr.id
            );
        `);

        // 2. Reset Sequences (Crucial because we inserted IDs manually for Requests)
        console.log('   ...Resetting Sequences');
        await this.pgClient.query(`
            SELECT setval('payment_requests_id_seq', (SELECT MAX(id) FROM payment_requests));
            SELECT setval('payment_instruments_id_seq', (SELECT MAX(id) FROM payment_instruments));
        `);

        console.log('   ✓ Post-processing complete.');
    }

    // Helper method to lookup user ID by name
    private async lookupUserIdByName(name: string | null | undefined): Promise<number> {
        // Default user ID if name is missing or empty
        if (!name || !name.trim()) {
            return 8;
        }

        const trimmedName = name.trim();

        // Check cache first
        if (this.userCache.has(trimmedName)) {
            return this.userCache.get(trimmedName)!;
        }

        // Query database for user
        try {
            const userResult = await this.pgDb
                .select({ id: users.id })
                .from(users)
                .where(eq(users.name, trimmedName))
                .limit(1);

            if (userResult.length > 0 && userResult[0].id) {
                const userId = userResult[0].id;
                // Cache the result
                this.userCache.set(trimmedName, userId);
                return userId;
            } else {
                // User not found, use default and log warning
                console.warn(`⚠️  User not found for name "${trimmedName}", using default user ID 8`);
                this.userCache.set(trimmedName, 8);
                return 8;
            }
        } catch (e) {
            console.error(`❌ Error looking up user "${trimmedName}":`, e);
            this.userCache.set(trimmedName, 8);
            return 8;
        }
    }

    // 1. Migrate Payment Requests (emds)
    async migratePaymentRequests() {
        console.log('\n🚀 Migrating Payment Requests (EMDs)...');
        const rows = await this.mysqlDb.select().from(mysqlEmds);
        let success = 0;

        for (const row of rows) {
            try {
                // Lookup user ID by name
                const requestedById = await this.lookupUserIdByName(row.requested_by);

                await this.pgDb.insert(paymentRequests).values({
                    id: row.id,
                    tenderId: row.tender_id || 0,
                    type: (row.type as any) || 'TMS',
                    tenderNo: row.tender_no || 'NA',
                    projectName: Parsers.string(row.project_name, 500),
                    purpose: 'EMD', // Default purpose for EMDs
                    amountRequired: '0.00', // Will update later
                    dueDate: row.due_date || null,
                    requestedBy: requestedById,
                    status: 'Pending',
                    legacyEmdId: row.id,
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                });
                success++;
            } catch (e) {
                logError('emds', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Payment Requests.`);
    }

    // 2. Migrate FDRs (emd_fdrs)
    async migrateFdrs() {
        console.log('\n🚀 Migrating FDRs...');
        const rows = await this.mysqlDb.select().from(mysqlEmdFdrs);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                const mappedStatus = StatusMapper.map('FDR', row.status, row.action);

                // Insert base instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'FDR',
                    purpose: row.fdr_purpose as any,
                    amount: Parsers.amount(row.fdr_amt),
                    status: mappedStatus,
                    action: Number(row.action) || 0,
                    favouring: Parsers.string(row.fdr_favour, 500),
                    payableAt: Parsers.string(row.fdr_payable, 500),
                    issueDate: Parsers.dateString(row.fdr_date),
                    expiryDate: Parsers.dateString(row.fdr_expiry),
                    utr: Parsers.string(row.utr, 255),
                    docketNo: Parsers.string(row.docket_no, 255),
                    courierAddress: Parsers.string(row.courier_add),
                    courierDeadline: row.courier_deadline || 0,
                    generatedPdf: Parsers.string(row.generated_fdr, 500),
                    cancelPdf: Parsers.string(row.fdrcancel_pdf, 500),
                    docketSlip: Parsers.string(row.docket_slip, 500),
                    coveringLetter: Parsers.string(row.covering_letter, 500),
                    reqNo: Parsers.string(row.req_no, 200),
                    reqReceive: Parsers.string(row.req_receive, 500),
                    referenceNo: Parsers.string(row.reference_no, 200),
                    transferDate: Parsers.dateString(row.transfer_date),
                    cancelledDate: Parsers.dateString(row.date),
                    amountCredited: Parsers.amount(row.amount),
                    legacyFdrId: row.id,
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // Insert FDR details
                await this.pgDb.insert(instrumentFdrDetails).values({
                    instrumentId: inst.id,
                    fdrNo: Parsers.string(row.fdr_no),
                    fdrDate: Parsers.dateString(row.fdr_date),
                    fdrSource: Parsers.string(row.fdr_source, 200),
                    fdrExpiryDate: Parsers.dateString(row.fdr_expiry),
                    fdrNeeds: Parsers.string(row.fdr_needs, 255),
                    fdrRemark: Parsers.string(row.fdr_remark)
                });

                success++;
            } catch (e) {
                logError('FDR', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} FDRs.`);
    }

    // 3. Migrate Demand Drafts (emd_demand_drafts) - Fixed version
    async migrateDemandDrafts() {
        console.log('\n🚀 Migrating Demand Drafts...');
        const rows = await this.mysqlDb.select().from(mysqlEmdDemandDrafts);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb
                    .select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found`);
                }

                const mappedStatus = StatusMapper.map('DD', row.status, row.action);

                // Parse DD date once
                const ddDate = row.dd_date
                    ? Parsers.dateString(row.dd_date) || null
                    : null;

                // Skip rows with no meaningful DD data
                if (
                    !row.dd_no &&
                    !ddDate &&
                    !row.dd_purpose &&
                    !row.remarks
                ) {
                    throw new Error('No usable DD data');
                }

                // Insert base instrument
                const [inst] = await this.pgDb
                    .insert(paymentInstruments)
                    .values({
                        requestId: row.emd_id as number,
                        instrumentType: 'DD',
                        purpose: row.dd_purpose as any,
                        amount: Parsers.amount(row.dd_amt || '0'),
                        status: mappedStatus,
                        action: Number(row.action) || 0,
                        favouring: Parsers.string(row.dd_favour, 500),
                        payableAt: Parsers.string(row.dd_payable, 500) || null,
                        issueDate: ddDate,
                        docketNo: Parsers.string(row.docket_no, 255) || null,
                        courierAddress: Parsers.string(row.courier_add) || null,
                        courierDeadline: row.courier_deadline || null,
                        generatedPdf: Parsers.string(row.generated_dd, 500) || null,
                        cancelPdf: Parsers.string(row.ddcancel_pdf, 500) || null,
                        docketSlip: Parsers.string(row.docket_slip, 500) || null,
                        reqNo: row.req_no || null,
                        referenceNo: Parsers.string(row.reference_no, 200) || null,
                        transferDate: Parsers.dateString(row.transfer_date) || null,
                        cancelledDate: Parsers.dateString(row.date) || null,
                        amountCredited: Parsers.amount(row.amount) || null,
                        legacyDdId: row.id,
                        legacyData: { original_status: row.status },
                        createdAt: Parsers.date(row.created_at) || new Date(),
                        updatedAt: Parsers.date(row.updated_at) || new Date()
                    })
                    .returning({ id: paymentInstruments.id, legacyDdId: paymentInstruments.legacyDdId });

                if (!inst?.id) {
                    console.warn('⚠️ Skipping DD: instrument not created', {
                        legacyId: `${row.id} - ${row.dd_no} - ${row.emd_id}`
                    });
                    continue;
                }

                const ddNo = Number.isFinite(Number(row.dd_no)) ? Number(row.dd_no) : null;
                const reqNo = Number.isFinite(Number(row.req_no)) ? Number(row.req_no) : null;
                const ddNeeds = Number.isFinite(Number(row.dd_needs)) ? Number(row.dd_needs) : null;

                // Insert DD details
                await this.pgDb.insert(instrumentDdDetails).values({
                    instrumentId: inst.id,
                    ddNo: ddNo ? String(ddNo) : null,
                    ddDate: row.dd_date ? Parsers.dateString(row.dd_date) : null,
                    reqNo: reqNo ? String(reqNo) : null,
                    ddNeeds: ddNeeds ? String(ddNeeds) : null,
                    ddPurpose: row.dd_purpose as any,
                    ddRemarks: Parsers.string(row.remarks) || null,
                });

                success++;
            } catch (e: any) {
                console.error('❌ DD MIGRATION FAILED', {
                    legacyId: row.id,
                    code: e.code,
                    message: e.message,
                    detail: e.detail
                });
            }
        }

        console.log(`   ✓ Migrated ${success}/${rows.length} Demand Drafts.`);
    }

    // 4. Migrate Bank Guarantees (emd_bgs) - Fixed version
    async migrateBankGuarantees() {
        console.log('\n🚀 Migrating Bank Guarantees...');
        const rows = await this.mysqlDb.select().from(mysqlEmdBgs);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                const mappedStatus = StatusMapper.map('BG', row.status, row.action);

                // Insert base instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'BG',
                    purpose: row.bg_purpose as any,
                    amount: Parsers.amount(row.bg_amt),
                    status: mappedStatus,
                    action: Number(row.action) || 0,
                    favouring: Parsers.string(row.bg_favour, 500) || null,
                    issueDate: Parsers.dateString(row.bg_date) || null,
                    expiryDate: Parsers.dateString(row.bg_expiry) || null,
                    validityDate: Parsers.dateString(row.bg_validity) || null,
                    claimExpiryDate: Parsers.dateString(row.claim_expiry) || null,
                    docketNo: Parsers.string(row.docket_no, 255) || null,
                    courierAddress: Parsers.string(row.bg_courier_addr) || null,
                    courierDeadline: row.bg_courier_deadline ? Number(row.bg_courier_deadline) : null,
                    docketSlip: Parsers.string(row.docket_slip, 500) || null,
                    extensionRequestPdf: Parsers.string(row.request_extension_pdf, 500) || null,
                    cancellationRequestPdf: Parsers.string(row.request_cancellation_pdf, 500) || null,
                    legacyBgId: row.id,
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // Parse all numeric fields - ensure they're numbers or null
                const cashMarginPercent = row.bg_cont_percent ? Parsers.amount(row.bg_cont_percent) : null;
                const fdrMarginPercent = row.bg_fdr_percent ? Parsers.amount(row.bg_fdr_percent) : null;
                const stampChargesDeducted = row.stamp_charge_deducted ? Parsers.amount(row.stamp_charge_deducted) : null;
                const sfmsChargesDeducted = row.sfms_charge_deducted ? Parsers.amount(row.sfms_charge_deducted) : null;
                const otherChargesDeducted = row.other_charge_deducted ? Parsers.amount(row.other_charge_deducted) : null;
                const newStampChargeDeducted = row.new_stamp_charge_deducted ? Parsers.amount(row.new_stamp_charge_deducted) : null;
                const extendedAmount = row.new_bg_amt ? Parsers.amount(row.new_bg_amt) : null;
                const fdrAmt = row.fdr_amt ? Parsers.amount(row.fdr_amt) : null;
                const fdrPer = row.fdr_per ? Parsers.amount(row.fdr_per) : null;
                const fdrRoi = row.fdr_roi ? Parsers.amount(row.fdr_roi) : null;
                const bgChargeDeducted = row.bg_charge_deducted ? Parsers.amount(row.bg_charge_deducted) : null;
                const bgFdrCancelAmount = row.bg_fdr_cancel_amount ? Parsers.amount(row.bg_fdr_cancel_amount) : null;

                // Insert BG details
                await this.pgDb.insert(instrumentBgDetails).values({
                    instrumentId: inst.id,
                    bgNo: Parsers.string(row.bg_no) || null,
                    bgDate: Parsers.dateString(row.bg_date) || null,
                    bankName: row.bg_bank,
                    validityDate: Parsers.dateString(row.bg_validity) || null,
                    claimExpiryDate: Parsers.dateString(row.claim_expiry) || null,
                    beneficiaryName: Parsers.string(row.bg_favour, 500) || null,
                    beneficiaryAddress: Parsers.string(row.bg_address) || null,
                    cashMarginPercent: cashMarginPercent,
                    fdrMarginPercent: fdrMarginPercent,
                    stampCharges: row.bg_stamp ? Parsers.amount(row.bg_stamp) : null,
                    stampChargesDeducted: stampChargesDeducted,
                    sfmsChargesDeducted: sfmsChargesDeducted,
                    otherChargesDeducted: otherChargesDeducted,
                    newStampChargeDeducted: newStampChargeDeducted,
                    extendedAmount: extendedAmount,
                    extendedBankName: Parsers.string(row.new_bg_bank_name, 300) || null,
                    extensionLetterPath: Parsers.string(row.request_extension_pdf, 500) || null,
                    cancellationLetterPath: Parsers.string(row.request_cancellation_pdf, 500) || null,
                    prefilledSignedBg: row.prefilled_signed_bg || null,
                    bgNeeds: Parsers.string(row.bg_needs, 255) || null,
                    bgPurpose: Parsers.string(row.bg_purpose, 255) || null,
                    bgSoftCopy: Parsers.string(row.bg_soft_copy, 255) || null,
                    bgPo: Parsers.string(row.bg_po, 255) || null,
                    bgClientUser: Parsers.string(row.bg_client_user, 255) || null,
                    bgClientCp: Parsers.string(row.bg_client_cp, 255) || null,
                    bgClientFin: Parsers.string(row.bg_client_fin, 255) || null,
                    bgBankAcc: Parsers.string(row.bg_bank_acc, 255) || null,
                    bgBankIfsc: Parsers.string(row.bg_bank_ifsc, 255) || null,
                    courierNo: Parsers.string(row.courier_no, 255) || null,
                    stampCharge: row.bg_stamp ? Parsers.amount(row.bg_stamp) : null,
                    extensionLetter: Parsers.string(row.ext_letter, 500) || null,
                    newBgClaim: row.new_bg_claim ? Parsers.amount(row.new_bg_claim) : null,
                    approveBg: Parsers.string(row.approve_bg, 255) || null,
                    bgFormatTe: Parsers.string(row.bg_format_te, 255) || null,
                    bgFormatTl: Parsers.string(row.bg_format_tl, 255) || null,
                    sfmsConf: Parsers.string(row.sfms_conf, 255) || null,
                    fdrAmt: fdrAmt,
                    fdrPer: fdrPer,
                    fdrCopy: Parsers.string(row.fdr_copy, 255) || null,
                    fdrNo: Parsers.string(row.fdr_no, 255) || null,
                    fdrValidity: Parsers.dateString(row.fdr_validity) || null,
                    fdrRoi: fdrRoi,
                    bgChargeDeducted: bgChargeDeducted,
                    stampCoveringLetter: Parsers.string(row.stamp_covering_letter, 255) || null,
                    cancelRemark: row.cancel_remark || null,
                    cancellConfirm: row.cancell_confirm || null,
                    bgFdrCancelDate: Parsers.string(row.bg_fdr_cancel_date, 255) || null,
                    bgFdrCancelAmount: bgFdrCancelAmount,
                    bgFdrCancelRefNo: Parsers.string(row.bg_fdr_cancel_ref_no, 255) || null,
                    bg2Remark: row.bg2_remark || null,
                    reasonReq: row.reason_req || null
                });

                success++;
            } catch (e) {
                logError('BG', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Bank Guarantees.`);
    }

    // 5. Migrate Cheques (emd_cheques)
    async migrateCheques() {
        console.log('\n🚀 Migrating Cheques...');
        const rows = await this.mysqlDb.select().from(mysqlEmdCheques);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                // Resolve linked DD and FDR IDs
                let linkedDdId: number | null = null;
                let linkedFdrId: number | null = null;

                if (row.dd_id) {
                    const dd = await this.pgDb.select({ id: paymentInstruments.id })
                        .from(paymentInstruments)
                        .where(eq(paymentInstruments.legacyDdId, row.dd_id))
                        .limit(1);
                    if (dd.length > 0) linkedDdId = dd[0].id;
                }

                if (row.fdr_id) {
                    const fdr = await this.pgDb.select({ id: paymentInstruments.id })
                        .from(paymentInstruments)
                        .where(eq(paymentInstruments.legacyFdrId, row.fdr_id))
                        .limit(1);
                    if (fdr.length > 0) linkedFdrId = fdr[0].id;
                }

                const mappedStatus = StatusMapper.map('CHEQUE', row.status, row.action);

                // Insert base instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'Cheque',
                    purpose: row.cheque_reason as any,
                    amount: Parsers.amount(row.cheque_amt),
                    status: mappedStatus,
                    favouring: Parsers.string(row.cheque_favour, 500),
                    issueDate: Parsers.dateString(row.cheque_date),
                    action: Number(row.action) || 0,
                    utr: Parsers.string(row.utr, 255),
                    referenceNo: Parsers.string(row.reference, 200),
                    transferDate: Parsers.dateString(row.transfer_date),
                    legacyChequeId: row.id,
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // Insert cheque details
                await this.pgDb.insert(instrumentChequeDetails).values({
                    instrumentId: inst.id,
                    chequeNo: Parsers.string(row.cheque_no, 50),
                    chequeDate: Parsers.dateString(row.cheque_date),
                    bankName: Parsers.string(row.cheque_bank, 300),
                    chequeImagePath: Parsers.string(row.cheque_img, 500),
                    cancelledImagePath: Parsers.string(row.cancelled_img, 500),
                    linkedDdId: linkedDdId,
                    linkedFdrId: linkedFdrId,
                    reqType: Parsers.string(row.req_type, 255),
                    chequeNeeds: Parsers.string(row.cheque_needs, 255),
                    chequeReason: Parsers.string(row.cheque_reason, 255),
                    dueDate: Parsers.dateString(row.duedate),
                    transferDate: Parsers.dateString(row.transfer_date),
                    btTransferDate: Parsers.dateString(row.bt_transfer_date),
                    handover: Parsers.string(row.handover, 200),
                    confirmation: Parsers.string(row.confirmation, 200),
                    reference: Parsers.string(row.reference, 200),
                    stopReasonText: row.stop_reason_text,
                    amount: Parsers.amount(row.amount)
                });

                success++;
            } catch (e) {
                logError('Cheque', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Cheques.`);
    }

    // 6. Migrate Bank Transfers (bank_transfers)
    async migrateBankTransfers() {
        console.log('\n🚀 Migrating Bank Transfers...');
        const rows = await this.mysqlDb.select().from(mysqlBankTransfers);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                const mappedStatus = StatusMapper.map('Bank Transfer', row.status, row.action);

                // Insert base instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'Bank Transfer',
                    purpose: row.purpose as any,
                    amount: Parsers.amount(row.bt_amount),
                    status: mappedStatus,
                    action: Number(row.action) || 0,
                    utr: Parsers.string(row.utr || row.utr_num, 255),
                    transferDate: Parsers.dateString(row.transfer_date),
                    legacyBtId: row.id,
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // Insert transfer details
                await this.pgDb.insert(instrumentTransferDetails).values({
                    instrumentId: inst.id,
                    accountName: Parsers.string(row.bt_acc_name, 500),
                    accountNumber: Parsers.string(row.bt_acc, 50),
                    ifsc: Parsers.string(row.bt_ifsc, 20),
                    utrNum: Parsers.string(row.utr_num, 500),
                    transactionDate: Parsers.date(row.date_time),
                    utrMsg: row.utr_msg,
                    returnUtr: Parsers.string(row.utr, 500),
                    returnTransferDate: row.transfer_date ? Parsers.dateString(row.transfer_date) : null,
                    reason: row.reason,
                    remarks: Parsers.string(row.remarks, 200)
                });

                success++;
            } catch (e) {
                logError('Bank Transfer', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Bank Transfers.`);
    }

    // 7. Migrate Portal Payments (pay_on_portals)
    async migratePortalPayments() {
        console.log('\n🚀 Migrating Portal Payments...');
        const rows = await this.mysqlDb.select().from(mysqlPayOnPortals);
        let success = 0;

        for (const row of rows) {
            try {
                // Validate parent exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                const mappedStatus = StatusMapper.map('Portal Payment', row.status, row.action);

                // Insert base instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'Portal Payment',
                    purpose: row.purpose as any,
                    amount: Parsers.amount(row.amount),
                    status: mappedStatus,
                    action: Number(row.action) || 0,
                    utr: Parsers.string(row.utr || row.utr_num, 255),
                    transferDate: Parsers.dateString(row.transfer_date),
                    legacyPortalId: row.id,
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // Insert transfer details
                await this.pgDb.insert(instrumentTransferDetails).values({
                    instrumentId: inst.id,
                    portalName: Parsers.string(row.portal, 200),
                    paymentMethod: (row.is_netbanking === 'yes') ? 'Netbanking' : 'Debit Card',
                    utrNum: Parsers.string(row.utr_num, 500),
                    transactionDate: Parsers.date(row.date_time),
                    isNetbanking: row.is_netbanking,
                    isDebit: row.is_debit,
                    returnUtr: Parsers.string(row.utr, 500),
                    returnTransferDate: row.transfer_date ? Parsers.dateString(row.transfer_date) : null,
                    reason: row.reason,
                    remarks: Parsers.string(row.remarks, 200)
                });

                success++;
            } catch (e) {
                logError('Portal Payment', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Portal Payments.`);
    }

    // Main runner with all migration steps
    async run() {
        try {
            await this.init();

            // 1. Clean database
            await this.cleanDatabase();

            // 2. Migrate base payment requests
            await this.migratePaymentRequests();

            // 3. Migrate all instrument types
            await this.migrateFdrs();
            await this.migrateDemandDrafts();
            await this.migrateBankGuarantees();
            await this.migrateBankTransfers();
            await this.migratePortalPayments();
            await this.migrateCheques();

            // 4. Post-processing
            await this.postProcess();

        } catch (error) {
            console.error('\n❌ FATAL MIGRATION ERROR:', error);
        } finally {
            await this.close();
            console.log(`\n📄 Check 'migration_errors.json' for logs. (${errorLog.length} errors)`);
        }
    }
}

// Execute
const engine = new MigrationEngine();
engine.run();
