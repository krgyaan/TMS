import { eq } from "drizzle-orm";
import { instrumentTransferDetails, paymentInstruments } from "@/db/schemas/tendering/payment-requests.schema";
import { COMMON_STATUSES } from "@/modules/tendering/payment-requests/constants/payment-request-statuses";

export interface LinkedInstrumentStatusSync {
    status: string;
    utrNumber?: string | null;
    rejectionReason?: string | null;
}

/**
 * Reflect a maker request status onto the tendering instrument that was
 * auto-created from it (EMD / Tender Fee / Processing Fee for Bank Transfer
 * and Portal Payment modes).
 *
 * Maker requests are rows in `project_payment_requests`; the auto-created
 * instrument stores their id in `payment_instruments.maker_request_id`.
 * Unlinked requests (project payment requests or legacy rows) are a no-op.
 */
export async function syncLinkedInstruments(
    tx: any,
    makerRequestId: number,
    body: LinkedInstrumentStatusSync,
    paymentDate: Date,
): Promise<void> {
    if (!["maker_done", "payment_done", "rejected"].includes(body.status)) {
        return;
    }

    const instruments = await tx
        .select()
        .from(paymentInstruments)
        .where(eq(paymentInstruments.makerRequestId, makerRequestId));

    if (!instruments.length) {
        return;
    }

    const instrumentStatus =
        body.status === "rejected"
            ? COMMON_STATUSES.ACCOUNTS_FORM_REJECTED
            : COMMON_STATUSES.ACCOUNTS_FORM_ACCEPTED;

    for (const instrument of instruments) {
        const updateData: any = {
            status: instrumentStatus,
            action: 1,
            updatedAt: new Date(),
        };

        if (body.status === "payment_done") {
            updateData.utr = body.utrNumber || null;
            const legacyData = (instrument.legacyData as Record<string, unknown> | null) ?? {};
            updateData.legacyData = {
                ...legacyData,
                date_time: paymentDate.toISOString(),
            };
        }

        if (body.status === "rejected") {
            updateData.rejectionReason = body.rejectionReason || null;
        }

        await tx
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrument.id));

        if (body.status === "payment_done") {
            const [transferDetail] = await tx
                .select({ id: instrumentTransferDetails.id })
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrument.id))
                .limit(1);

            if (transferDetail) {
                await tx
                    .update(instrumentTransferDetails)
                    .set({
                        utrNum: body.utrNumber || null,
                        transactionDate: paymentDate,
                        updatedAt: new Date(),
                    })
                    .where(eq(instrumentTransferDetails.id, transferDetail.id));
            } else {
                await tx
                    .insert(instrumentTransferDetails)
                    .values({
                        instrumentId: instrument.id,
                        utrNum: body.utrNumber || null,
                        transactionDate: paymentDate,
                    });
            }
        }
    }
}
