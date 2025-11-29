// migrate-emd-full.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, timestamp, decimal } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
} from './src/db/emds.schema';
import { int } from 'drizzle-orm/mysql-core';

const PG_URL = 'postgresql://postgres:gyan@localhost:5432/new_tms';
const MYSQL_URL = 'mysql://root:gyan@localhost:3306/mydb';

const pgClient = new Client({ connectionString: PG_URL });
pgClient.connect();
const db = pgDrizzle(pgClient);

const mysqlPool = mysql2.createPool(MYSQL_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// Temporary MySQL table definitions (minimal)
const emds = mysqlTable('emds', {
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

const emd_fdrs = mysqlTable('emd_fdrs', {
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

const emd_demand_drafts = mysqlTable('emd_demand_drafts', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_favour: varchar('dd_favour', { length: 255 }),
    dd_amt: varchar('dd_amt', { length: 255 }),
    dd_payable: varchar('dd_payable', { length: 255 }),
    dd_needs: varchar('dd_needs', { length: 255 }),
    dd_purpose: varchar('dd_purpose', { length: 255 }),
    courier_add: varchar('courier_add', { length: 255 }),
    courier_deadline: varchar('courier_deadline', { length: 20 }),
    action: int('action'), // Action taken on DD
    // action == 1 (Accountant Form DD)
    status: varchar('status', { length: 100 }), // Status of DD Request
    dd_date: date('dd_date'), // DD Date
    dd_no: varchar('dd_no', { length: 200 }), // DD No
    req_no: varchar('req_no', { length: 200 }), // Request No
    remarks: varchar('remarks', { length: 200 }), // Remarks
    generated_dd: varchar('generated_dd', { length: 500 }),
    // action == 3 (Return DD via courier)
    docket_no: varchar('docket_no', { length: 200 }),
    docket_slip: varchar('docket_slip', { length: 255 }),
    // action == 4 (Return DD via Bank Transfer)
    transfer_date: date('transfer_date'), // Transfer Date
    utr: varchar('utr', { length: 200 }),
    // action == 6 (Request Cancellation)
    ddcancel_pdf: varchar('ddcancel_pdf', { length: 500 }),
    // action == 7 (Cancelled at Branch)
    date: date('date'), // date of credit
    amount: varchar('amount', { length: 200 }), // amount credited
    reference_no: varchar('reference_no', { length: 200 }), // bank reference no
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_bgs = mysqlTable('emd_bgs', {
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
    action: varchar('action', { length: 50 }), // Action taken on BG
    // action == 1 (Request Bank for BG)
    status: varchar('bg_req', { length: 255 }), // Status of BG Request
    reason_req: text('reason_req'), // Reason for Rejection
    approve_bg: varchar('approve_bg', { length: 255 }), // Approved BG Format
    bg_format_te: varchar('bg_format_te', { length: 255 }), // BG Format by TE
    bg_format_tl: varchar('bg_format_imran', { length: 255 }), // BG Format by TL
    prefilled_signed_bg: text('prefilled_signed_bg'), // Prefilled Signed BG
    // action == 2 (Capture BG after creation)
    bg_no: varchar('bg_no', { length: 255 }), // BG Number
    bg_date: date('bg_date'), // BG Creation Date
    bg_validity: date('bg_validity'), // BG Validity Date
    claim_expiry: date('claim_expiry'), // BG Claim Period Expiry
    courier_no: varchar('courier_no', { length: 255 }), // Courier Request No
    bg2_remark: text('bg2_remark'), // Remarks
    // action == 3 (Capture FDR)
    sfms_conf: varchar('sfms_conf', { length: 255 }), // SFMS Confirmation Copy
    fdr_amt: varchar('fdr_amt', { length: 255 }), // FDR Amount
    fdr_per: varchar('fdr_per', { length: 255 }), // FDR Percentage
    fdr_copy: varchar('fdr_copy', { length: 255 }), // FDR copy
    fdr_no: varchar('fdr_no', { length: 255 }), // FDR No
    fdr_validity: date('fdr_validity'), // FDR Validity
    fdr_roi: varchar('fdr_roi', { length: 255 }), // FDR ROI%
    bg_charge_deducted: varchar('bg_charge_deducted', { length: 255 }), // BG Charges deducted
    sfms_charge_deducted: varchar('sfms_charge_deducted', { length: 255 }), // SFMS Charges deducted
    stamp_charge_deducted: varchar('stamp_charge_deducted', { length: 255 }), // Stamp Charges deducted
    other_charge_deducted: varchar('other_charge_deducted', { length: 255 }), // Other Charges deducted
    // action == 5 (Request Extension)
    new_stamp_charge_deducted: decimal('new_stamp_charge_deducted', { precision: 10, scale: 2 }),
    new_bg_bank_name: varchar('new_bg_bank_name', { length: 255 }), // New BG Bank Name
    new_bg_amt: decimal('new_bg_amt', { precision: 20, scale: 2 }), // New BG Amount
    new_bg_expiry: date('new_bg_expiry'), // New BG Expiry Date
    new_bg_claim: decimal('new_bg_claim', { precision: 10, scale: 2 }), // New BG Claim Date
    ext_letter: varchar('ext_letter', { length: 255 }), // Extension Letter
    request_extension_pdf: varchar('request_extension_pdf', { length: 255 }), // Request Extension PDF
    // action == 6 (Returned via courier)
    docket_no: varchar('docket_no', { length: 255 }), // Docket No
    docket_slip: varchar('docket_slip', { length: 255 }), // Docket Slip
    // action == 7 (Request Cancellation)
    stamp_covering_letter: varchar('stamp_covering_letter', { length: 255 }), // Stamp Covering Letter
    request_cancellation_pdf: varchar('request_cancellation_pdf', { length: 255 }), // Request Cancellation PDF
    cancel_remark: text('cancel_remark'), // Cancellation Remark
    // action == 8 (BG Cancellation Confirmation)
    cancell_confirm: text('cancell_confirm'), // Cancellation Confirm
    // action == 9 (FDR Cancellation Confirmation)
    bg_fdr_cancel_date: varchar('bg_fdr_cancel_date', { length: 255 }), // BG FDR Cancel Date
    bg_fdr_cancel_amount: varchar('bg_fdr_cancel_amount', { length: 255 }), // BG FDR Cancel Amount
    bg_fdr_cancel_ref_no: varchar('bg_fdr_cancel_ref_no', { length: 255 }), // BG FDR Cancel Reference No

    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const emd_cheques = mysqlTable('emd_cheques', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    dd_id: bigint('dd_id', { mode: 'number' }),
    fdr_id: bigint('fdr_id', { mode: 'number' }),
    req_type: varchar('req_type', { length: 255 }), // Request Type
    cheque_favour: varchar('cheque_favour', { length: 255 }),
    cheque_amt: varchar('cheque_amt', { length: 255 }),
    cheque_date: varchar('cheque_date', { length: 255 }),
    cheque_needs: varchar('cheque_needs', { length: 255 }),
    cheque_reason: varchar('cheque_reason', { length: 255 }),
    cheque_bank: varchar('cheque_bank', { length: 255 }),
    action: int('action'), // Action taken on Cheque
    // action == 1 (Accountant Form Cheque)
    status: varchar('status', { length: 200 }), // Status of Cheque Request
    reason: varchar('reason', { length: 200 }), // Reason for Rejection
    cheque_no: varchar('cheq_no', { length: 200 }), // Cheque No
    duedate: date('duedate'), // Due Date
    handover: varchar('handover', { length: 200 }), // Handover
    cheque_img: varchar('cheq_img', { length: 200 }), // Cheque Image
    confirmation: varchar('confirmation', { length: 200 }), // Confirmation
    remarks: varchar('remarks', { length: 200 }), // Remarks
    // action == 2 (Stop the cheque from bank)
    stop_reason_text: text('stop_reason_text'), // Stop Reason Text
    // action == 3 (Paid via Bank Transfer)
    transfer_date: date('transfer_date'), // Transfer Date
    amount: varchar('amount', { length: 200 }), // Amount
    utr: varchar('utr', { length: 200 }), // UTR
    // action == 4 (Deposited in Bank)
    bt_transfer_date: date('bt_transfer_date'), // BT Transfer Date
    reference: varchar('reference', { length: 200 }), // Reference
    // action == 5 (Cancelled or Torn)
    cancelled_img: varchar('cancelled_img', { length: 200 }), // Cancelled Image

    generated_pdfs: text('generated_pdfs'), // Generated PDFs
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const bank_transfers = mysqlTable('bank_transfers', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    bt_amount: varchar('bt_amount', { length: 200 }),
    bt_acc_name: varchar('bt_acc_name', { length: 255 }),
    bt_acc: varchar('bt_acc', { length: 255 }),
    bt_ifsc: varchar('bt_ifsc', { length: 255 }),
    action: int('action'), // Action taken on BT
    // action == 1 (Accountant Form BT)
    status: varchar('status', { length: 200 }), // Status of BT Request
    reason: text('reason'), // Reason for Rejection
    date_time: timestamp('date_time'), // Date and Time of payment
    utr: varchar('utr', { length: 200 }), // UTR of payment
    utr_msg: text('utr_mgs'), // Message from UTR
    remarks: varchar('remarks', { length: 200 }), // Remarks
    // action == 3 (Return via Bank Transfer)
    transfer_date: date('transfer_date'), // Transfer Date
    utr_num: varchar('utr_num', { length: 200 }), // UTR Number

    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const pay_on_portals = mysqlTable('pay_on_portals', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    emd_id: bigint('emd_id', { mode: 'number' }),
    portal: varchar('portal', { length: 255 }),
    is_netbanking: varchar('is_netbanking', { length: 255 }),
    is_debit: varchar('is_debit', { length: 255 }),
    amount: varchar('amount', { length: 255 }),
    action: int('action'), // Action taken on Portal
    // action == 1 (Accountant Form Portal)
    status: varchar('status', { length: 255 }), // Status of Portal Request
    date_time: timestamp('date_time'), // Date and Time of payment from portal
    utr_num: varchar('utr_num', { length: 200 }), // UTR Number from portal
    utr_msg: text('utr_mgs'), // Message from UTR from portal
    remarks: varchar('remarks', { length: 200 }), // Remarks from portal
    reason: text('reason'), // Rejection Reason from portal
    // action == 3 (Return via Bank Transfer)
    transfer_date: date('transfer_date'), // Transfer Date from portal
    utr: varchar('utr', { length: 200 }), // UTR of payment from portal

    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// Mapping: old emd_id → new payment_requests.id
const emdToRequestMap = new Map<number, number>();

const parseAmount = (val: string | number | null): string => {
    if (!val && val !== 0) return '0.00';
    if (typeof val === 'number') {
        return isNaN(val) ? '0.00' : val.toFixed(2);
    }
    const num = parseFloat(val.replace(/,/g, '').trim());
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

const parseDate = (val: string | Date | null): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const parseDateToString = (val: string | Date | null): string | null => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const parseCourierDeadline = (val: string | number | null): number | null => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const num = parseInt(val.toString().trim(), 10);
    return isNaN(num) ? null : num;
};

const parseAction = (val: string | number | null): number | null => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const num = parseInt(val.toString().trim(), 10);
    return isNaN(num) ? null : num;
};

const mapStatus = (status: string | null): 'Pending' | 'Requested' | 'Approved' | 'Issued' | 'Dispatched' | 'Received' | 'Returned' | 'Cancelled' | 'Refunded' | 'Encashed' | 'Extended' => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('refund')) return 'Refunded';
    if (s.includes('return')) return 'Returned';
    if (s.includes('encash')) return 'Encashed';
    if (s.includes('extend')) return 'Extended';
    return 'Issued';
};

async function migratePaymentRequests() {
    console.log('Migrating payment_requests...');
    const rows = await mysqlDb.select().from(emds);

    for (const r of rows) {
        const [newRecord] = await db.insert(paymentRequests).values({
            tenderId: Number(r.tender_id ?? 0),
            type: (r.type as 'TMS' | 'Other Than TMS' | 'Old Entries' | 'Other Than Tender') ?? 'TMS',
            tenderNo: r.tender_no ?? 'NA',
            projectName: r.project_name ?? null,
            purpose: 'EMD', // Old system was EMD-focused
            amountRequired: '0.00', // Will be updated after instruments migration
            dueDate: parseDate(r.due_date),
            requestedBy: r.requested_by ?? null,
            status: 'Pending', // Default, can be updated based on instrument statuses
            remarks: null, // No equivalent in old schema
            legacyEmdId: Number(r.id),
            createdAt: parseDate(r.created_at) ?? new Date(),
            updatedAt: parseDate(r.updated_at) ?? new Date(),
        }).returning({ id: paymentRequests.id });

        emdToRequestMap.set(Number(r.id ?? 0), newRecord.id);
    }
    console.log(`Migrated ${emdToRequestMap.size} payment requests`);
}

async function migrateFDRs() {
    console.log('Migrating FDRs...');
    const rows = await mysqlDb.select().from(emd_fdrs);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'FDR',
            amount: parseAmount(r.fdr_amt ?? r.amount),
            favouring: r.fdr_favour ?? r.fdr_payable,
            payableAt: r.fdr_payable,
            issueDate: parseDateToString(r.fdr_date),
            expiryDate: parseDateToString(r.fdr_expiry),
            status: mapStatus(r.status),
            utr: r.utr,
            docketNo: r.docket_no,
            courierAddress: r.courier_add,
            courierDeadline: r.courier_deadline ? Number(r.courier_deadline) : null,
            generatedPdf: r.generated_fdr,
            cancelPdf: r.fdrcancel_pdf,
            docketSlip: r.docket_slip,
            coveringLetter: r.covering_letter,
            rejectionReason: r.remarks ?? r.fdr_remark,
            action: r.action ? Number(r.action) : null,
            extraPdfPaths: r.generated_fdr ? r.generated_fdr : null,
            reqNo: r.req_no,
            reqReceive: r.req_receive,
            transferDate: parseDateToString(r.transfer_date),
            referenceNo: r.reference_no,
            creditDate: parseDateToString(r.date),
            creditAmount: r.amount ? parseAmount(r.amount) : null,
            remarks: r.remarks,
            createdAt: parseDate(r.created_at) ?? new Date(),
            updatedAt: parseDate(r.updated_at) ?? new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentFdrDetails).values({
            instrumentId: instId[0].id,
            fdrNo: r.fdr_no,
            fdrDate: parseDateToString(r.fdr_date),
            fdrSource: r.fdr_source,
            fdrPurpose: r.fdr_needs,
            fdrExpiryDate: parseDateToString(r.fdr_expiry),
            fdrRemark: r.fdr_remark,
            fdrNeeds: r.fdr_needs,
        });
    }
}

async function migrateDDs() {
    console.log('Migrating Demand Drafts...');
    const rows = await mysqlDb.select().from(emd_demand_drafts);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'DD',
            amount: parseAmount(r.dd_amt ?? r.amount),
            favouring: r.dd_favour,
            payableAt: r.dd_payable,
            issueDate: parseDateToString(r.dd_date),
            status: mapStatus(r.status),
            utr: r.utr,
            docketNo: r.docket_no,
            courierAddress: r.courier_add,
            courierDeadline: parseCourierDeadline(r.courier_deadline),
            generatedPdf: r.generated_dd,
            cancelPdf: r.ddcancel_pdf,
            docketSlip: r.docket_slip,
            rejectionReason: r.remarks,
            action: r.action ? Number(r.action) : null,
            transferDate: parseDateToString(r.transfer_date),
            referenceNo: r.reference_no,
            creditDate: parseDateToString(r.date),
            creditAmount: r.amount ? parseAmount(r.amount) : null,
            createdAt: parseDate(r.created_at) ?? new Date(),
            updatedAt: parseDate(r.updated_at) ?? new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentDdDetails).values({
            instrumentId: instId[0].id,
            ddNo: r.dd_no,
            ddDate: parseDateToString(r.dd_date),
            // bankName: r.bank_name ?? null,
            reqNo: r.req_no,
            ddNeeds: r.dd_needs,
            ddPurpose: r.dd_purpose,
        });
    }
}

async function migrateBGs() {
    console.log('Migrating BGs...');
    const rows = await mysqlDb.select().from(emd_bgs);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'BG',
            amount: parseAmount(r.bg_amt),
            favouring: r.bg_favour,
            issueDate: parseDateToString(r.bg_date),
            expiryDate: parseDateToString(r.bg_expiry),
            validityDate: parseDateToString(r.bg_expiry),
            claimExpiryDate: parseDateToString(r.bg_claim ?? r.claim_expiry),
            status: mapStatus(r.status),
            docketNo: r.docket_no,
            docketSlip: r.docket_slip,
            courierAddress: r.bg_courier_addr,
            courierDeadline: parseCourierDeadline(r.bg_courier_deadline),
            rejectionReason: r.reason_req,
            extensionRequestPdf: r.request_extension_pdf,
            cancellationRequestPdf: r.request_cancellation_pdf,
            action: parseAction(r.action),
            createdAt: parseDate(r.created_at) ?? new Date(),
            updatedAt: parseDate(r.updated_at) ?? new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentBgDetails).values({
            instrumentId: instId[0].id,
            bgNo: r.bg_no,
            bgDate: parseDateToString(r.bg_date),
            validityDate: parseDateToString(r.bg_expiry),
            claimExpiryDate: parseDateToString(r.bg_claim ?? r.claim_expiry),
            beneficiaryName: r.bg_favour,
            beneficiaryAddress: r.bg_address,
            bankName: r.bg_bank,
            cashMarginPercent: parseAmount(r.bg_cont_percent),
            fdrMarginPercent: parseAmount(r.bg_fdr_percent),
            stampCharges: parseAmount(r.bg_stamp ?? r.new_stamp_charge_deducted),
            sfmsCharges: null,
            stampChargesDeducted: parseAmount(r.stamp_charge_deducted),
            sfmsChargesDeducted: parseAmount(r.sfms_charge_deducted),
            otherChargesDeducted: parseAmount(r.other_charge_deducted),
            extendedAmount: parseAmount(r.new_bg_amt),
            extendedValidityDate: parseDateToString(r.new_bg_expiry),
            extendedClaimExpiryDate: parseDateToString(r.new_bg_claim),
            extendedBankName: r.new_bg_bank_name,
            extensionLetterPath: r.ext_letter,
            // cancellationLetterPath: r.cancellation_letter_path ?? null,
            prefilledSignedBg: r.prefilled_signed_bg,
            bgNeeds: r.bg_needs,
            bgPurpose: r.bg_purpose,
            bgSoftCopy: r.bg_soft_copy,
            bgPo: r.bg_po,
            bgClientUser: r.bg_client_user,
            bgClientCp: r.bg_client_cp,
            bgClientFin: r.bg_client_fin,
            bgBankAcc: r.bg_bank_acc,
            bgBankIfsc: r.bg_bank_ifsc,
            courierNo: r.courier_no,
            approveBg: r.approve_bg,
            bgFormatTe: r.bg_format_te,
            bgFormatTl: r.bg_format_tl,
            sfmsConf: r.sfms_conf,
            fdrAmt: parseAmount(r.fdr_amt),
            fdrPer: parseAmount(r.fdr_per),
            fdrCopy: r.fdr_copy,
            fdrNo: r.fdr_no,
            fdrValidity: parseDateToString(r.fdr_validity),
            fdrRoi: parseAmount(r.fdr_roi),
            bgChargeDeducted: parseAmount(r.bg_charge_deducted),
            newStampChargeDeducted: parseAmount(r.new_stamp_charge_deducted),
            stampCoveringLetter: r.stamp_covering_letter,
            cancelRemark: r.cancel_remark,
            cancellConfirm: r.cancell_confirm,
            bgFdrCancelDate: r.bg_fdr_cancel_date,
            bgFdrCancelAmount: parseAmount(r.bg_fdr_cancel_amount),
            bgFdrCancelRefNo: r.bg_fdr_cancel_ref_no,
            bg2Remark: r.bg2_remark,
            reasonReq: r.reason_req,
        });
    }
}

async function migrateCheques() {
    console.log('Migrating Cheques...');
    const rows = await mysqlDb.select().from(emd_cheques);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Cheque',
            amount: parseAmount(r.cheque_amt ?? r.amount),
            favouring: r.cheque_favour,
            issueDate: parseDateToString(r.cheque_date),
            status: mapStatus(r.status),
            utr: r.utr,
            rejectionReason: r.reason ?? r.stop_reason_text,
            generatedPdf: r.generated_pdfs,
            action: r.action ? Number(r.action) : null,
            remarks: r.remarks,
            createdAt: parseDate(r.created_at) ?? new Date(),
            updatedAt: parseDate(r.updated_at) ?? new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentChequeDetails).values({
            instrumentId: instId[0].id,
            chequeNo: r.cheque_no,
            chequeDate: parseDateToString(r.cheque_date),
            bankName: r.cheque_bank,
            chequeImagePath: r.cheque_img,
            cancelledImagePath: r.cancelled_img,
            linkedDdId: r.dd_id ? Number(r.dd_id) : null,
            linkedFdrId: r.fdr_id ? Number(r.fdr_id) : null,
            reqType: r.req_type,
            chequeNeeds: r.cheque_needs,
            chequeReason: r.cheque_reason,
            dueDate: parseDateToString(r.duedate),
            handover: r.handover,
            confirmation: r.confirmation,
            transferDate: parseDateToString(r.transfer_date),
            amount: r.amount ? parseAmount(r.amount) : null,
            btTransferDate: parseDateToString(r.bt_transfer_date),
            reference: r.reference,
            stopReasonText: r.stop_reason_text,
        });
    }
}

async function migrateBankTransfers() {
    console.log('Migrating Bank Transfers...');
    const rows = await mysqlDb.select().from(bank_transfers);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Bank Transfer',
            amount: parseAmount(r.bt_amount),
            status: mapStatus(r.status),
            // utr: r.utr ?? r.utr_num,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentTransferDetails).values({
            instrumentId: instId[0].id,
            accountName: r.bt_acc_name,
            accountNumber: r.bt_acc,
            ifsc: r.bt_ifsc,
            transactionId: r.utr || r.utr_num,
            transactionDate: parseDate(r.date_time || r.transfer_date),
            utrMsg: r.utr_msg,
            utrNum: r.utr_num,
            remarks: r.remarks,
            reason: r.reason,
            returnTransferDate: parseDateToString(r.transfer_date),
            returnUtr: r.utr,
        });
    }
}

async function migratePortalPayments() {
    console.log('Migrating Portal Payments...');
    const rows = await mysqlDb.select().from(pay_on_portals);
    for (const r of rows) {
        const requestId = emdToRequestMap.get(r.emd_id ?? 0);
        if (!requestId) continue;

        const instId = await db.insert(paymentInstruments).values({
            requestId,
            instrumentType: 'Portal Payment',
            amount: parseAmount(r.amount),
            status: mapStatus(r.status),
            // utr: r.utr ?? r.utr_num,
            createdAt: parseDate(r.created_at) || new Date(),
            updatedAt: parseDate(r.updated_at) || new Date(),
        }).returning({ id: paymentInstruments.id });

        await db.insert(instrumentTransferDetails).values({
            instrumentId: instId[0].id,
            portalName: r.portal,
            paymentMethod: r.is_netbanking ? 'Netbanking' : r.is_debit ? 'Debit Card' : 'Other',
            transactionId: r.utr || r.utr_num,
            transactionDate: parseDate(r.date_time),
            utrMsg: r.utr_msg,
            utrNum: r.utr_num,
            isNetbanking: r.is_netbanking,
            isDebit: r.is_debit,
            remarks: r.remarks,
            reason: r.reason,
            returnTransferDate: parseDateToString(r.transfer_date),
            returnUtr: r.utr,
        });
    }
}

async function runMigration() {
    console.log('Starting full EMD migration...');
    await migratePaymentRequests();
    await Promise.all([
        migrateFDRs(),
        migrateDDs(),
        migrateBGs(),
        migrateCheques(),
        migrateBankTransfers(),
        migratePortalPayments(),
    ]);
    console.log('Migration completed successfully!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
