import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useSellerGsts } from "@/hooks/api/usePurchaseOrders";

/**
 * Binds the "GST Registration" step of the PO / VWO seller cascade.
 *
 * Behaviour:
 *  - fetches the selected vendor organization's GST registrations
 *  - selecting a GST writes its number to `sellerGstNo`
 *  - switching organizations clears the previous GST selection
 *  - on Edit, an already-saved GST number is re-attached to its row so the save
 *    can write back to that exact `vendor_gsts` record. Re-attaching does not
 *    rewrite the document's saved fields.
 */
type SellerGstForm = {
    sellerId: string;
    sellerGstId: string;
    sellerGstNo: string;
};

export function useSellerGstSelection<T extends SellerGstForm>(form: UseFormReturn<T>) {
    const sellerId = form.watch("sellerId" as never) as unknown as string | undefined;
    const sellerGstId = form.watch("sellerGstId" as never) as unknown as string | undefined;
    const sellerGstNo = form.watch("sellerGstNo" as never) as unknown as string | undefined;

    const orgId = sellerId && sellerId !== "__create_new__" ? Number(sellerId) : undefined;
    const { data: sellerGsts = [], isLoading } = useSellerGsts(orgId);

    // Distinguishes "user chose another GST" (fill the number) from an effect
    // re-run (do not clobber a manually edited GST number).
    const lastFilledIdRef = useRef<string | null>(null);

    const setField = (name: keyof SellerGstForm, value: string) => form.setValue(name as never, value as never);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellerId]);

    useEffect(() => {
        if (!orgId) return;

        if (sellerGstId) {
            const chosen = sellerGsts.find(g => String(g.id) === sellerGstId);
            if (chosen) {
                if (lastFilledIdRef.current !== sellerGstId) {
                    lastFilledIdRef.current = sellerGstId;
                    setField("sellerGstNo", chosen.gstNo || "");
                }
                return;
            }
            // The saved selection is no longer part of this org: clear the id
            // only, leaving the visible GST number for the user to correct.
            setField("sellerGstId", "");
            lastFilledIdRef.current = null;
        }

        // Edit: match the document's GST number to a vendor GST row.
        const savedGstNo = (sellerGstNo || "").trim().toLowerCase();
        if (!savedGstNo) return;
        const match = sellerGsts.find(g => (g.gstNo || "").trim().toLowerCase() === savedGstNo);
        if (!match) return;

        lastFilledIdRef.current = String(match.id);
        setField("sellerGstId", String(match.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, sellerGsts, sellerGstId, sellerGstNo]);

    return { sellerGsts, isLoading };
}
