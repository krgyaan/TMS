import { round2 } from "@/utils/money";

export function calculateTds(amount: number, tdsPercentage: number): { tdsAmount: number; netPayable: number } {
    const tdsAmount = Math.round((amount * tdsPercentage) / 100 * 100) / 100;
    const netPayable = Math.round((amount - tdsAmount) * 100) / 100;
    return { tdsAmount, netPayable };
}

export interface TdsDisplayInput {
    amount: number;
    tdsPercentage: number;
    actualTds: number;
    isFinal: boolean;
    documentCap?: number;
}

export interface TdsDisplayResult {
    tdsAmount: number;
    netPayable: number;
    capped: boolean;
}

/**
 * Resolve the TDS to show for a payment request.
 *
 * The requested TDS is `amount × tdsPercentage`; if that exceeds the linked
 * PO/VWO `tdsAmount`, the deduction is capped at the document amount. Completed
 * payments display the persisted deduction, also clamped so legacy rows cannot
 * show more than the document cap.
 */
export function computeTdsDisplay({ amount, tdsPercentage, actualTds, isFinal, documentCap = 0 }: TdsDisplayInput): TdsDisplayResult {
    const hasCap = documentCap > 0;

    if (isFinal) {
        const tdsAmount = round2(hasCap ? Math.min(actualTds, documentCap) : actualTds);
        return {
            tdsAmount,
            netPayable: round2(amount - tdsAmount),
            capped: hasCap && actualTds > documentCap,
        };
    }

    const estimate = calculateTds(amount, tdsPercentage).tdsAmount;
    const tdsAmount = round2(hasCap ? Math.min(estimate, documentCap) : estimate);
    return {
        tdsAmount,
        netPayable: round2(amount - tdsAmount),
        capped: hasCap && estimate > documentCap,
    };
}

export interface TdsRowLike {
    amount: number | string | null;
    tdsPercentage?: number | string | null;
    actualTdsDeducted?: number | string | null;
    status?: string | null;
    purchaseOrderId?: number | null;
    vendorWorkOrderId?: number | null;
    poTdsPercentage?: number | string | null;
    poTdsAmount?: number | string | null;
    vwoTdsPercentage?: number | string | null;
    vwoTdsAmount?: number | string | null;
}

/** Resolve the capped TDS for a PO/VWO-linked payment request row. */
export function computeRowTdsDisplay(row: TdsRowLike): TdsDisplayResult {
    const isPo = row.purchaseOrderId != null;
    const documentCap = isPo ? Number(row.poTdsAmount ?? 0) : Number(row.vwoTdsAmount ?? 0);
    const documentPct = isPo
        ? Number(row.poTdsPercentage ?? row.tdsPercentage ?? 0)
        : Number(row.vwoTdsPercentage ?? row.tdsPercentage ?? 0);

    return computeTdsDisplay({
        amount: Number(row.amount ?? 0),
        tdsPercentage: documentPct,
        actualTds: Number(row.actualTdsDeducted ?? 0),
        isFinal: row.status === "payment_done",
        documentCap,
    });
}
