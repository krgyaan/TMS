import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useSellerGsts } from "@/hooks/api/usePurchaseOrders";

/**
 * Binds the "GST Registration" step of the PO / VWO seller cascade.
 *
 * Behaviour:
 *  - fetches the selected vendor organization's GST registrations
 *  - selecting a GST writes its number to `sellerGstNo` and overwrites
 *    `sellerAddress` with that registration's address
 *  - create forms auto-select the first GST; edit forms re-attach the saved
 *    GST number without rewriting the document
 *  - switching organizations clears the previous GST selection
 */
type SellerGstForm = {
    sellerId: string;
    sellerGstId: string;
    sellerGstNo: string;
    sellerAddress: string;
};

export function useSellerGstSelection<T extends SellerGstForm>(
    form: UseFormReturn<T>,
    options?: { autoSelectFirst?: boolean },
) {
    const sellerId = form.watch("sellerId" as never) as unknown as string | undefined;
    const sellerGstId = form.watch("sellerGstId" as never) as unknown as string | undefined;
    const sellerGstNo = form.watch("sellerGstNo" as never) as unknown as string | undefined;

    const orgId = sellerId && sellerId !== "__create_new__" ? Number(sellerId) : undefined;
    const { data: sellerGsts = [], isLoading } = useSellerGsts(orgId);

    // Distinguishes "a different GST was chosen" (fill number/address) from an
    // effect re-run (do not clobber manually edited values).
    const lastFilledIdRef = useRef<string | null>(null);

    const setField = (name: keyof SellerGstForm, value: string) => form.setValue(name as never, value as never);

    const fillFrom = (gst: (typeof sellerGsts)[number]) => {
        const id = String(gst.id);
        lastFilledIdRef.current = id;
        setField("sellerGstNo", gst.gstNo || "");
        setField("sellerAddress", gst.address || "");
    };

    // Seller changed -> the previous GST no longer belongs to this org.
    const prevSellerRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const prev = prevSellerRef.current;
        prevSellerRef.current = sellerId;
        if (prev === undefined || !prev || prev === "__create_new__") return;
        if (prev === sellerId) return;

        lastFilledIdRef.current = null;
        setField("sellerGstId", "");
        setField("sellerGstNo", "");
        setField("sellerAddress", "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerId]);

    useEffect(() => {
        if (!orgId) return;

        if (sellerGstId) {
            const chosen = sellerGsts.find(g => String(g.id) === sellerGstId);
            if (chosen) {
                if (lastFilledIdRef.current !== sellerGstId) fillFrom(chosen);
                return;
            }
            // The saved selection is no longer part of this org.
            setField("sellerGstId", "");
            lastFilledIdRef.current = null;
        }

        // Edit: match the document's GST number to a vendor GST row without
        // rewriting the saved number/address.
        const savedGstNo = (sellerGstNo || "").trim().toLowerCase();
        if (savedGstNo) {
            const match = sellerGsts.find(g => (g.gstNo || "").trim().toLowerCase() === savedGstNo);
            if (match) {
                lastFilledIdRef.current = String(match.id);
                setField("sellerGstId", String(match.id));
                return;
            }
            if (!options?.autoSelectFirst) return;
        }

        if (!options?.autoSelectFirst || sellerGsts.length === 0) return;

        // Create: auto-select the first GST and its address.
        const first = sellerGsts[0];
        setField("sellerGstId", String(first.id));
        fillFrom(first);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, sellerGsts, sellerGstId, sellerGstNo]);

    return { sellerGsts, isLoading };
}
