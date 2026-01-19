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
    courier_deadline: varchar('courier_deadline', { length: 20 }),
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
    bg_courier_deadline: varchar('bg_courier_deadline', { length: 20 }),
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

    // PHASE 1: CLEAN SLATE
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

    // PHASE 2: PARENT REQUESTS
    async migrateRequests() {
        console.log('\n🚀 Migrating Payment Requests (EMDs)...');
        const rows = await this.mysqlDb.select().from(mysqlEmds);
        let success = 0;

        for (const row of rows) {
            try {
                // Force ID insertion to preserve legacy ID
                await this.pgDb.insert(paymentRequests).values({
                    id: row.id,
                    tenderId: row.tender_id || 0,
                    type: (row.type as any) || 'TMS',
                    tenderNo: row.tender_no || 'NA',
                    projectName: Parsers.string(row.project_name, 500),
                    purpose: 'EMD',
                    amountRequired: '0.00', // Will update later
                    dueDate: Parsers.date(row.due_date),
                    requestedBy: Parsers.string(row.requested_by, 200),
                    status: 'Pending',
                    legacyEmdId: row.id, // Redundant but good for tracing
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                });
                success++;
            } catch (e) {
                logError('emds', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Requests.`);
    }

    // PHASE 3: STANDALONE INSTRUMENTS (FDR, DD, BG, BT, Portal)
    async migrateInstrument(
        type: 'FDR' | 'DD' | 'BG' | 'Bank Transfer' | 'Portal Payment',
        sourceTable: any,
        detailTable: any,
        mapperFn: (row: any, instId: number) => any,
        legacyIdCol: 'legacyFdrId' | 'legacyDdId' | 'legacyBgId' | 'legacyBtId' | 'legacyPortalId'
    ) {
        console.log(`\n🚀 Migrating ${type}...`);
        const rows = await this.mysqlDb.select().from(sourceTable);
        let success = 0;

        for (const row of rows) {
            try {
                // 1. Validate Parent Exists
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id));

                if (parentCheck.length === 0) {
                    throw new Error(`Parent EMD ID ${row.emd_id} not found in Postgres.`);
                }

                const mappedStatus = StatusMapper.map(type === 'Bank Transfer' ? 'BT' : type, row.status, row.action);

                // 2. Insert Base Instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id,
                    instrumentType: type,
                    amount: Parsers.amount(row.amount || row.fdr_amt || row.dd_amt || row.bg_amt || row.bt_amount),
                    status: mappedStatus,
                    currentStage: StatusMapper.getStage(mappedStatus),
                    action: Number(row.action) || 0,
                    favouring: Parsers.string(row.fdr_favour || row.dd_favour || row.bg_favour || row.cheque_favour, 500),
                    payableAt: Parsers.string(row.fdr_payable || row.dd_payable, 500),
                    issueDate: Parsers.dateString(row.fdr_date || row.dd_date || row.bg_date || row.date),
                    expiryDate: Parsers.dateString(row.fdr_expiry || row.bg_expiry),
                    utr: Parsers.string(row.utr || row.utr_num, 255),
                    remarks: Parsers.string(row.remarks || row.fdr_remark, 500),
                    [legacyIdCol]: row.id, // CRITICAL: Save MySQL ID for lookup later
                    legacyData: { original_status: row.status },
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // 3. Insert Specific Details
                const detailData = mapperFn(row, inst.id);
                if (detailData) {
                    await this.pgDb.insert(detailTable).values(detailData);
                }

                success++;
            } catch (e) {
                logError(type, row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} ${type}s.`);
    }

    // PHASE 4: DEPENDENT INSTRUMENTS (Cheques)
    async migrateCheques() {
        console.log('\n🔗 Migrating Cheques (With Dependencies)...');
        const rows = await this.mysqlDb.select().from(mysqlEmdCheques);
        let success = 0;

        for (const row of rows) {
            try {
                // 1. Validate Parent
                const parentCheck = await this.pgDb.select({ id: paymentRequests.id })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, row.emd_id as number));
                if (parentCheck.length === 0) throw new Error(`Parent EMD ID ${row.emd_id} not found.`);

                // 2. Resolve Dependencies (The Safe Way: Query Postgres)
                let linkedDdId: number | null = null;
                let linkedFdrId: number | null = null;

                if (row.dd_id) {
                    const dd = await this.pgDb.select({ id: paymentInstruments.id })
                        .from(paymentInstruments)
                        .where(eq(paymentInstruments.legacyDdId, row.dd_id))
                        .limit(1);
                    if (dd.length > 0) linkedDdId = dd[0].id;
                    else console.warn(`      ⚠ Cheque ${row.id}: Linked DD ${row.dd_id} missing. Setting NULL.`);
                }

                if (row.fdr_id) {
                    const fdr = await this.pgDb.select({ id: paymentInstruments.id })
                        .from(paymentInstruments)
                        .where(eq(paymentInstruments.legacyFdrId, row.fdr_id))
                        .limit(1);
                    if (fdr.length > 0) linkedFdrId = fdr[0].id;
                    else console.warn(`      ⚠ Cheque ${row.id}: Linked FDR ${row.fdr_id} missing. Setting NULL.`);
                }

                const mappedStatus = StatusMapper.map('CHEQUE', row.status, row.action);

                // 3. Insert Instrument
                const [inst] = await this.pgDb.insert(paymentInstruments).values({
                    requestId: row.emd_id as number,
                    instrumentType: 'Cheque',
                    amount: Parsers.amount(row.cheque_amt || row.amount),
                    status: mappedStatus,
                    currentStage: StatusMapper.getStage(mappedStatus),
                    favouring: Parsers.string(row.cheque_favour, 500),
                    issueDate: Parsers.dateString(row.cheque_date),
                    action: Number(row.action) || 0,
                    remarks: Parsers.string(row.remarks, 500),
                    legacyChequeId: row.id,
                    createdAt: Parsers.date(row.created_at) || new Date(),
                    updatedAt: Parsers.date(row.updated_at) || new Date()
                }).returning({ id: paymentInstruments.id });

                // 4. Insert Details
                await this.pgDb.insert(instrumentChequeDetails).values({
                    instrumentId: inst.id,
                    chequeNo: Parsers.string(row.cheque_no, 20),
                    chequeDate: Parsers.dateString(row.cheque_date),
                    bankName: Parsers.string(row.cheque_bank, 255),
                    linkedDdId: linkedDdId, // Resolved ID
                    linkedFdrId: linkedFdrId, // Resolved ID
                    reqType: Parsers.string(row.req_type, 50),
                    chequeReason: Parsers.string(row.cheque_reason),
                    dueDate: Parsers.dateString(row.duedate),
                    amount: Parsers.amount(row.amount)
                });

                success++;
            } catch (e) {
                logError('Cheque', row.id, e);
            }
        }
        console.log(`   ✓ Migrated ${success}/${rows.length} Cheques.`);
    }

    // PHASE 5: RECONCILIATION & CLEANUP
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

    // MAIN RUNNER
    async run() {
        try {
            await this.init();

            // 1. Clean
            await this.cleanDatabase();

            // 2. Base
            await this.migrateRequests();

            // 3. Instruments (Independent)

            // FDR
            await this.migrateInstrument('FDR', mysqlEmdFdrs, instrumentFdrDetails,
                (row, id) => ({
                    instrumentId: id,
                    fdrNo: Parsers.string(row.fdr_no),
                    fdrDate: Parsers.dateString(row.fdr_date),
                    fdrSource: Parsers.string(row.fdr_source),
                    fdrExpiryDate: Parsers.dateString(row.fdr_expiry),
                    fdrRemark: Parsers.string(row.fdr_remark)
                }), 'legacyFdrId'
            );

            // DD
            await this.migrateInstrument('DD', mysqlEmdDemandDrafts, instrumentDdDetails,
                (row, id) => ({
                    instrumentId: id,
                    ddNo: Parsers.string(row.dd_no),
                    ddDate: Parsers.dateString(row.dd_date),
                    ddPurpose: Parsers.string(row.dd_purpose),
                    ddRemarks: Parsers.string(row.remarks)
                }), 'legacyDdId'
            );

            // BG
            await this.migrateInstrument('BG', mysqlEmdBgs, instrumentBgDetails,
                (row, id) => ({
                    instrumentId: id,
                    bgNo: Parsers.string(row.bg_no),
                    bgDate: Parsers.dateString(row.bg_date),
                    bankName: Parsers.string(row.bg_bank || row.bg_bank_name),
                    beneficiaryName: Parsers.string(row.bg_favour),
                    validityDate: Parsers.dateString(row.bg_validity || row.bg_expiry),
                    claimExpiryDate: Parsers.dateString(row.bg_claim || row.claim_expiry),
                    cashMarginPercent: Parsers.amount(row.bg_cont_percent),
                    bgPurpose: Parsers.string(row.bg_purpose)
                }), 'legacyBgId'
            );

            // Bank Transfers
            await this.migrateInstrument('Bank Transfer', mysqlBankTransfers, instrumentTransferDetails,
                (row, id) => ({
                    instrumentId: id,
                    accountName: Parsers.string(row.bt_acc_name),
                    accountNumber: Parsers.string(row.bt_acc),
                    ifsc: Parsers.string(row.bt_ifsc),
                    transactionId: Parsers.string(row.utr || row.utr_num),
                    transactionDate: Parsers.date(row.date_time || row.transfer_date)
                }), 'legacyBtId'
            );

            // Portal
            await this.migrateInstrument('Portal Payment', mysqlPayOnPortals, instrumentTransferDetails,
                (row, id) => ({
                    instrumentId: id,
                    portalName: Parsers.string(row.portal),
                    paymentMethod: (row.is_netbanking === 'yes') ? 'Netbanking' : 'Debit Card',
                    transactionId: Parsers.string(row.utr || row.utr_num),
                    transactionDate: Parsers.date(row.date_time)
                }), 'legacyPortalId'
            );

            // 4. Instruments (Dependent)
            await this.migrateCheques();

            // 5. Cleanup
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
