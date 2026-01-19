import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client, Pool } from 'pg';
import { sql } from 'drizzle-orm';
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

// CONFIG
const CONFIG = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms',
    mysql: process.env.MYSQL_URL || 'mysql://root:gyan@localhost:3306/mydb',
};

async function verify() {
    const pgClient = new Client({ connectionString: CONFIG.postgres });
    await pgClient.connect();
    const pgDb = pgDrizzle(pgClient as unknown as Pool);

    const mysqlPool = mysql2.createPool(CONFIG.mysql);
    const mysqlDb = mysqlDrizzle(mysqlPool as any);

    console.log('\n📊 MIGRATION VERIFICATION REPORT\n');
    console.log('Type'.padEnd(20) + 'MySQL (Source)'.padEnd(20) + 'Postgres (Target)'.padEnd(20) + 'Status');
    console.log('-'.repeat(75));

    // Helper to print rows
    const printRow = (label: string, mysqlCount: number, pgCount: number, expectedDiff: number = 0) => {
        const diff = mysqlCount - pgCount;
        const status = (diff === expectedDiff) ? '✅ OK' : `❌ Mismatch (Diff: ${diff})`;
        console.log(
            label.padEnd(20) +
            String(mysqlCount).padEnd(20) +
            String(pgCount).padEnd(20) +
            status + (expectedDiff > 0 ? ` (Exp. ${expectedDiff} skipped)` : '')
        );
    };

    // 1. PAYMENT REQUESTS
    const [mysqlReq] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlEmds);
    const pgReq = await pgClient.query(`SELECT COUNT(*) as count FROM payment_requests`);
    printRow('Requests (EMDs)', Number(mysqlReq.count), Number(pgReq.rows[0].count));

    // 2. FDRs
    const [mysqlFdr] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlEmdFdrs);
    const pgFdr = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'FDR'`);
    // We expect 6 skipped (Orphans)
    printRow('FDRs', Number(mysqlFdr.count), Number(pgFdr.rows[0].count), 6);

    // 3. DDs
    const [mysqlDd] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlEmdDemandDrafts);
    const pgDd = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'DD'`);
    printRow('DDs', Number(mysqlDd.count), Number(pgDd.rows[0].count));

    // 4. BGs
    const [mysqlBg] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlEmdBgs);
    const pgBg = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'BG'`);
    printRow('BGs', Number(mysqlBg.count), Number(pgBg.rows[0].count));

    // 5. Cheques
    const [mysqlChq] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlEmdCheques);
    const pgChq = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'Cheque'`);
    printRow('Cheques', Number(mysqlChq.count), Number(pgChq.rows[0].count));

    // 6. Bank Transfers
    const [mysqlBt] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlBankTransfers);
    const pgBt = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'Bank Transfer'`);
    printRow('Bank Transfers', Number(mysqlBt.count), Number(pgBt.rows[0].count));

    // 7. Portal Payments
    const [mysqlPp] = await mysqlDb.select({ count: sql`count(*)` }).from(mysqlPayOnPortals);
    const pgPp = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments WHERE instrument_type = 'Portal Payment'`);
    printRow('Portal Payments', Number(mysqlPp.count), Number(pgPp.rows[0].count));

    console.log('-'.repeat(75));

    // 8. TOTAL INSTRUMENTS
    const pgTotal = await pgClient.query(`SELECT COUNT(*) as count FROM payment_instruments`);
    console.log(`\nTotal Instruments in Postgres: ${pgTotal.rows[0].count}`);

    // 9. CHECKING THE 6 ORPHANS (Confirming they don't exist in MySQL Parent Table)
    console.log('\n🔎 Verifying the 6 Failed FDRs (Orphan Check)...');
    const orphanIds = [287, 250, 249, 243, 236, 458];

    // Check if these IDs exist in the MySQL 'emds' table
    const orphansInMysql = await mysqlDb.select({ id: mysqlEmds.id })
        .from(mysqlEmds)
        .where(sql`${mysqlEmds.id} IN ${orphanIds}`);

    if (orphansInMysql.length === 0) {
        console.log('✅ CONFIRMED: The 6 failed EMD IDs do NOT exist in the source MySQL `emds` table.');
        console.log('   The migration correctly skipped these orphan records.');
    } else {
        console.log('❌ WARNING: Some failed IDs actually exist in MySQL! Check `migration_errors.json`.');
        console.log('   Found:', orphansInMysql);
    }

    await pgClient.end();
    await mysqlPool.end();
}

verify().catch(console.error);
