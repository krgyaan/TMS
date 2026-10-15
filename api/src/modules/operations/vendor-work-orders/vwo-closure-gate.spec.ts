/// <reference types="jest" />
import { createDb, createPool, type DbInstance } from "@/db";
import { Pool } from "pg";
import { BadRequestException } from "@nestjs/common";
import { VendorWorkOrderService } from "./vendor-work-order.service";

const VWO_LIFECYCLE_TEST_DATABASE_URL = process.env.VWO_LIFECYCLE_TEST_DATABASE_URL ?? process.env.PO_LIFECYCLE_TEST_DATABASE_URL;
const describeDb = VWO_LIFECYCLE_TEST_DATABASE_URL ? describe : describe.skip;

describeDb("VWO closure equality gate", () => {
    let pool: Pool;
    let db: DbInstance;
    let service: VendorWorkOrderService;

    const query = async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
        const { rows } = await pool.query(sql, params);
        return rows as T[];
    };

    const command = async (sql: string, params?: any[]) => {
        await pool.query(sql, params);
    };

    const cleanFixture = async (vwoId: number, projectId: number) => {
        await command(`DELETE FROM project_payment_requests WHERE vendor_work_order_id = ${vwoId}`);
        await command(`DELETE FROM project_purchase_invoices WHERE vendor_work_order_id = ${vwoId}`);
        await command(`DELETE FROM vendor_work_order_items WHERE vendor_work_order_id = ${vwoId}`);
        await command(`DELETE FROM vendor_work_orders WHERE id = ${vwoId}`);
        await command(`DELETE FROM projects WHERE id = ${projectId}`);
    };

    // Builds a VWO whose GROSS value = Σ item total_amount, with optional
    // payment-done PRs (amount + actual tds deducted) and gross invoices.
    const seedFixture = async (
        vwoId: number,
        cfg: {
            itemsTaxableGst?: Array<[number, number]>;
            invoicePreGst?: Array<[number, number]>;
            paymentDone?: Array<{ amount: number; tds?: number }>;
            pending?: number;
        }
    ) => {
        const projectId = vwoId + 1;
        const rows = cfg.itemsTaxableGst?.length
            ? cfg.itemsTaxableGst
                  .map(([taxable, gst], i) => `(${vwoId}, 'Item ${i}', 1, ${taxable}, ${gst > 0 ? gst / (taxable / 100) : 0}, ${taxable}, ${gst}, ${taxable + gst})`)
                  .join(", ")
            : "";

        await cleanFixture(vwoId, projectId);
        await command(`INSERT INTO projects (id, team_name, item_id, insurance_required) VALUES (${projectId}, 'VWO Closure Gate Test', 1, false)`);
        await command(`
      INSERT INTO vendor_work_orders (id, tender_id, project_id, project_name, seller_name, wo_date, wo_approved)
      VALUES (${vwoId}, 1, ${projectId}, 'Closure Gate VWO', 'Vendor', NOW(), true)`);
        if (rows) {
            await command(`INSERT INTO vendor_work_order_items (vendor_work_order_id, description, qty, rate, taxable_amount, gst_rate, gst_amount, total_amount) VALUES ${rows}`);
        }
        for (const [pre, gst] of cfg.invoicePreGst ?? []) {
            await command(`
        INSERT INTO project_purchase_invoices (project_id, category, party_name, value_pre_gst, gst_amount, invoice_date, vendor_work_order_id)
        VALUES (${projectId}, 'material', 'Vendor', ${pre}, ${gst}, NOW(), ${vwoId})`);
        }
        for (const pr of cfg.paymentDone ?? []) {
            const tds = pr.tds ?? 0;
            await command(`
        INSERT INTO project_payment_requests (project_id, request_no, party_name, account_number, ifsc, amount, payment_against, vendor_work_order_id, status, tds_percentage, requested_by, actual_tds_deducted)
        VALUES (${projectId}, 'GPR', 'Vendor', '123456789', 'TEST000123', ${pr.amount}, 'material', ${vwoId}, 'payment_done', 2, 1, ${tds})`);
        }
        for (let i = 0; i < (cfg.pending ?? 0); i++) {
            await command(`
        INSERT INTO project_payment_requests (project_id, request_no, party_name, account_number, ifsc, amount, payment_against, vendor_work_order_id, status, tds_percentage, requested_by)
        VALUES (${projectId}, 'GPRP', 'Vendor', '123456789', 'TEST000123', 500, 'material', ${vwoId}, 'pending', 2, 1)`);
        }
    };

    beforeAll(() => {
        if (!VWO_LIFECYCLE_TEST_DATABASE_URL) return;
        pool = createPool(VWO_LIFECYCLE_TEST_DATABASE_URL, 5, false);
        db = createDb(pool);
        service = new VendorWorkOrderService(db, { info: () => {}, warn: () => {} } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    });

    afterAll(async () => {
        if (pool) await pool.end();
    });

    it("canClose=true when paid gross and invoiced both equal the gross VWO value", async () => {
        const vwoId = 4000001;
        try {
            // gross = 2300; invoices = 2300; PRs 1500 + 800 (gross 2300, tds 46, net 2254)
            await seedFixture(vwoId, {
                itemsTaxableGst: [[2000, 300]],
                invoicePreGst: [[2000, 300]],
                paymentDone: [
                    { amount: 1500, tds: 30 },
                    { amount: 800, tds: 16 },
                ],
            });

            const status = await service.checkClosure(vwoId);
            expect(status.canClose).toBe(true);
            expect(Number(status.grandTotal)).toBe(2300);
            expect(Number(status.totalPaymentDone)).toBe(2300);
            expect(Number(status.totalTdsDeducted)).toBe(46);
            expect(Number(status.totalPaidAfterTds)).toBe(2254);
            expect(Number(status.totalPiAmount)).toBe(2300);
            expect(Number(status.remainingToPay)).toBe(0);
            expect(Number(status.remainingInvoice)).toBe(0);
            expect(status.remainingPayments).toHaveLength(0);

            const closed = await service.closeVendorWorkOrder(vwoId, "Gross payments and invoices both settled", 7);
            expect(closed.closedAt).toBeTruthy();
            const [row] = await query<{ closed_at: string; closure_note: string }>(`SELECT closed_at, closure_note FROM vendor_work_orders WHERE id = ${vwoId}`);
            expect(row.closure_note).toBe("Gross payments and invoices both settled");
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });

    it("rejects closure when under-paid", async () => {
        const vwoId = 4000002;
        try {
            await seedFixture(vwoId, {
                itemsTaxableGst: [[2000, 300]], // gross 2300
                invoicePreGst: [[2000, 300]],
                paymentDone: [{ amount: 1500 }], // missing 800
            });

            const status = await service.checkClosure(vwoId);
            expect(status.canClose).toBe(false);
            expect(Number(status.remainingToPay)).toBe(800);
            await expect(service.closeVendorWorkOrder(vwoId, "Under paid", 7)).rejects.toThrow(BadRequestException);
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });

    it("rejects closure when over-paid beyond tolerance", async () => {
        const vwoId = 4000003;
        try {
            await seedFixture(vwoId, {
                itemsTaxableGst: [[2000, 300]], // gross 2300
                invoicePreGst: [[2000, 300]],
                paymentDone: [{ amount: 2350 }], // 50 over
            });

            const status = await service.checkClosure(vwoId);
            expect(status.canClose).toBe(false);
            expect(Number(status.remainingToPay)).toBe(-50);
            await expect(service.closeVendorWorkOrder(vwoId, "Over paid", 7)).rejects.toThrow(BadRequestException);
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });

    it("rejects closure when over-invoiced beyond tolerance", async () => {
        const vwoId = 4000004;
        try {
            await seedFixture(vwoId, {
                itemsTaxableGst: [[2000, 300]], // gross 2300
                invoicePreGst: [[2100, 300]], // invoiced 2400 (100 over)
                paymentDone: [{ amount: 2300 }],
            });

            const status = await service.checkClosure(vwoId);
            expect(status.canClose).toBe(false);
            expect(Number(status.remainingInvoice)).toBe(-100);
            await expect(service.closeVendorWorkOrder(vwoId, "Over invoiced", 7)).rejects.toThrow(BadRequestException);
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });

    it("rejects closure while any payment request is not payment_done", async () => {
        const vwoId = 4000005;
        try {
            await seedFixture(vwoId, {
                itemsTaxableGst: [[2000, 300]], // gross 2300
                invoicePreGst: [[2000, 300]],
                paymentDone: [{ amount: 1500 }],
                pending: 1,
            });

            const status = await service.checkClosure(vwoId);
            expect(status.canClose).toBe(false);
            expect(status.remainingPayments).toHaveLength(1);
            await expect(service.closeVendorWorkOrder(vwoId, "Open PRs", 7)).rejects.toThrow(BadRequestException);
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });

    it("rejects closure when amount differs within tolerance (round-off) is the only open item", async () => {
        const vwoId = 4000006;
        try {
            // gross 1000, invoiced 1005, paid 1005 → both differences under ₹10 → closes
            await seedFixture(vwoId, {
                itemsTaxableGst: [[1000, 0]],
                invoicePreGst: [[1005, 0]],
                paymentDone: [{ amount: 1005 }],
            });

            const status = await service.checkClosure(vwoId);
            expect(Number(status.remainingToPay)).toBe(-5);
            expect(Number(status.remainingInvoice)).toBe(-5);
            expect(status.canClose).toBe(true);
            const closed = await service.closeVendorWorkOrder(vwoId, "Round-off", 7);
            expect(closed.closedAt).toBeTruthy();
        } finally {
            await cleanFixture(vwoId, vwoId + 1);
        }
    });
});
