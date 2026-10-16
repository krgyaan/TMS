import type { Rfq } from './rfq.types';

export interface RfqBatch {
    id: number;
    batchNo: number;
    dueDate: Date | null;
    createdAt: Date | null;
    responseCount: number;
}

/**
 * Builds a stable, ordered list of RFQ send batches for a tender.
 * Batch #1 is the earliest sent RFQ and response counts are derived from
 * the responses grouped by their rfqId.
 */
export function buildRfqBatches(
    batches: Rfq[] | undefined | null,
    allResponses: Array<{ rfqId?: number | null }> | undefined | null,
): RfqBatch[] {
    const list = [...(batches ?? [])].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.id - b.id;
    });

    const counts = new Map<number, number>();
    for (const response of allResponses ?? []) {
        const rfqId = response?.rfqId;
        if (rfqId == null) continue;
        counts.set(rfqId, (counts.get(rfqId) ?? 0) + 1);
    }

    return list.map((rfq, index) => ({
        id: rfq.id,
        batchNo: index + 1,
        dueDate: rfq.dueDate ?? null,
        createdAt: rfq.createdAt ?? null,
        responseCount: counts.get(rfq.id) ?? 0,
    }));
}
