import type { WoBoqItem } from "./saleInvoice.types";

export interface SaleInvoiceCalcItem {
    lineItemSrNo: number;
    qty: number | null;
    rate: number | null;
    gstRate: number;
    discountPercent: number;
}

export interface SaleInvoiceRowCalc {
    qty: number;
    gross: number;
    discount: number;
    taxable: number;
    gst: number;
    total: number;
}

export interface SaleInvoiceLineCalc extends SaleInvoiceRowCalc {
    quantity: number;
    rate: number;
    gstRate: number;
    discountPercent: number;
}

export interface SaleInvoiceCalculations {
    lines: Map<number, SaleInvoiceLineCalc>;
    rowCalcs: Map<number, SaleInvoiceRowCalc>;
    totals: {
        gross: number;
        discount: number;
        subtotal: number;
        totalGst: number;
        total: number;
    };
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateSaleInvoice(items: SaleInvoiceCalcItem[], boqRows: WoBoqItem[]): SaleInvoiceCalculations {
    const groups = new Map<number, Array<{ item: SaleInvoiceCalcItem; index: number }>>();
    const order: number[] = [];

    items.forEach((item, index) => {
        const key = Number(item.lineItemSrNo ?? 0);
        if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
        }
        groups.get(key)!.push({ item, index });
    });

    const lines = new Map<number, SaleInvoiceLineCalc>();
    const rowCalcs = new Map<number, SaleInvoiceRowCalc>();
    const totals = { gross: 0, discount: 0, subtotal: 0, totalGst: 0, total: 0 };

    for (const srNo of order) {
        const group = groups.get(srNo)!;
        const boq = boqRows.find((row) => row.srNo === srNo);

        if (boq) {
            const boqQty = Number(boq.quantity || 0);
            const boqRate = Number(boq.rate || 0);
            const boqGstRate = Number(boq.gstRate || 0);
            const discountPercent = Number(group[0]?.item.discountPercent || 0);
            const lineGross = boqQty * boqRate;
            const lineDiscount = (lineGross * discountPercent) / 100;
            const totalQty = group.reduce((sum, row) => sum + Number(row.item.qty || 0), 0);

            let allocatedGross = 0;
            let allocatedDiscount = 0;
            const rows: SaleInvoiceRowCalc[] = [];

            group.forEach(({ item, index }, rowIndex) => {
                const isLast = rowIndex === group.length - 1;
                const share = totalQty > 0 ? Number(item.qty || 0) / totalQty : 1 / group.length;
                const gross = isLast ? round2(lineGross - allocatedGross) : round2(lineGross * share);
                const discount = isLast ? round2(lineDiscount - allocatedDiscount) : round2(lineDiscount * share);
                allocatedGross += gross;
                allocatedDiscount += discount;

                const taxable = round2(gross - discount);
                const gst = round2((taxable * boqGstRate) / 100);
                const row = {
                    qty: Number(item.qty || 0),
                    gross,
                    discount,
                    taxable,
                    gst,
                    total: round2(taxable + gst),
                };
                rows.push(row);
                rowCalcs.set(index, row);
            });

            const line = {
                quantity: boqQty,
                rate: boqRate,
                gstRate: boqGstRate,
                discountPercent,
                qty: totalQty,
                gross: round2(rows.reduce((sum, row) => sum + row.gross, 0)),
                discount: round2(rows.reduce((sum, row) => sum + row.discount, 0)),
                taxable: round2(rows.reduce((sum, row) => sum + row.taxable, 0)),
                gst: round2(rows.reduce((sum, row) => sum + row.gst, 0)),
                total: round2(rows.reduce((sum, row) => sum + row.total, 0)),
            };
            lines.set(srNo, line);

            totals.gross += line.gross;
            totals.discount += line.discount;
            totals.subtotal += line.taxable;
            totals.totalGst += line.gst;
            totals.total += line.total;
            continue;
        }

        group.forEach(({ item, index }) => {
            const qty = Number(item.qty || 0);
            const rate = Number(item.rate || 0);
            const gstRate = Number(item.gstRate || 0);
            const discountPercent = Number(item.discountPercent || 0);
            const gross = round2(qty * rate);
            const discount = round2((gross * discountPercent) / 100);
            const taxable = round2(gross - discount);
            const gst = round2((taxable * gstRate) / 100);
            const row = { qty, gross, discount, taxable, gst, total: round2(taxable + gst) };
            rowCalcs.set(index, row);
        });

        const rows = group.map(({ index }) => rowCalcs.get(index)!);
        const first = group[0]?.item;
        const line = {
            quantity: rows.reduce((sum, row) => sum + row.qty, 0),
            rate: Number(first?.rate || 0),
            gstRate: Number(first?.gstRate || 0),
            discountPercent: Number(first?.discountPercent || 0),
            qty: rows.reduce((sum, row) => sum + row.qty, 0),
            gross: round2(rows.reduce((sum, row) => sum + row.gross, 0)),
            discount: round2(rows.reduce((sum, row) => sum + row.discount, 0)),
            taxable: round2(rows.reduce((sum, row) => sum + row.taxable, 0)),
            gst: round2(rows.reduce((sum, row) => sum + row.gst, 0)),
            total: round2(rows.reduce((sum, row) => sum + row.total, 0)),
        };
        lines.set(srNo, line);

        totals.gross += line.gross;
        totals.discount += line.discount;
        totals.subtotal += line.taxable;
        totals.totalGst += line.gst;
        totals.total += line.total;
    }

    totals.gross = round2(totals.gross);
    totals.discount = round2(totals.discount);
    totals.subtotal = round2(totals.subtotal);
    totals.totalGst = round2(totals.totalGst);
    totals.total = round2(totals.total);

    return { lines, rowCalcs, totals };
}
