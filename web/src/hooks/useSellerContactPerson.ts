import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useSellerPersons } from "@/hooks/api/usePurchaseOrders";
import type { SellerPersonOption } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";

/**
 * Binds the "Vendor Contact Person" block of the PO / VWO forms.
 *
 * The seller picker only fills organization fields now; this hook owns the
 * vendor-side contact triple so it can never collide with our-side fields
 * (contactPerson*, filled by "Quick Fill from Team Member").
 *
 * Behaviour:
 *  - when a seller is picked, fetches that org's persons and auto-selects the
 *    first one (ordered by id server-side, so "first" is stable)
 *  - an org with no persons leaves the fields empty; typing manually is allowed
 *  - switching sellers clears the previously selected person
 *  - on Edit, a saved contact is re-attached to its person by email, then name,
 *    and nothing is guessed: pass autoSelectFirstOnLoad: false so opening an
 *    existing document never rewrites its contact or seller email
 *  - sellerEmail follows the picked person, since vendor_organizations stores
 *    no email of its own
 */
type SellerContactForm = {
  sellerId: string;
  // sellerEmail mirrors the picked person: vendor_organizations has no email
  // column of its own, so the vendor's address is the contact's address.
  sellerEmail: string;
  vendorPersonId: string;
  vendorContactPersonName: string;
  vendorContactPersonPhone: string;
  vendorContactPersonEmail: string;
};

export function useSellerContactPerson<
  T extends SellerContactForm
>(form: UseFormReturn<T>, options?: { autoSelectFirstOnLoad?: boolean }) {
  const sellerId = form.watch("sellerId" as never) as unknown as string | undefined;
  const vendorPersonId = form.watch("vendorPersonId" as never) as unknown as string | undefined;

  const orgId =
    sellerId && sellerId !== "__create_new__" ? Number(sellerId) : undefined;
  const { data: persons = [] } = useSellerPersons(orgId);

  // The last person this hook pushed into the fields. Distinguishes "user chose
  // another person" (must refill) from "effect re-ran for another reason"
  // (must not clobber edits).
  const lastFilledIdRef = useRef<string | null>(null);

  // Edit forms pass false: a loaded document's contact wins, and we never
  // guess one from the vendor master. Consumed on the first auto-select so it
  // only suppresses the initial load, not an explicit seller change later.
  const skipAutoSelectRef = useRef(options?.autoSelectFirstOnLoad === false);

  const setField = (name: keyof SellerContactForm, value: string) =>
    form.setValue(name as never, value as never);

  // Seller changed -> the previous person no longer belongs to this org.
  // The first value is only recorded, so an Edit form's form.reset (sellerId
  // going from "" to a real id) is not wiped out.
  const prevSellerRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevSellerRef.current;
    prevSellerRef.current = sellerId;
    if (prev === undefined || !prev || prev === "__create_new__") return;
    if (prev === sellerId) return;

    lastFilledIdRef.current = null;
    skipAutoSelectRef.current = false;
    setField("vendorPersonId", "");
    setField("vendorContactPersonName", "");
    setField("vendorContactPersonPhone", "");
    setField("vendorContactPersonEmail", "");
    setField("sellerEmail", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const fillFrom = (person: SellerPersonOption) => {
    lastFilledIdRef.current = String(person.id);
    setField("vendorContactPersonName", person.name || "");
    setField("vendorContactPersonPhone", person.mobile || "");
    setField("vendorContactPersonEmail", person.email || "");
    setField("sellerEmail", person.email || "");
  };

  useEffect(() => {
    if (!orgId) return;

    if (vendorPersonId) {
      const chosen = persons.find((p) => String(p.id) === vendorPersonId);
      if (chosen) {
        if (lastFilledIdRef.current !== vendorPersonId) fillFrom(chosen);
        return;
      }
      // Person no longer exists in vendor master for this org.
      setField("vendorPersonId", "");
      lastFilledIdRef.current = null;
    }

    if (persons.length === 0) return;

    const current = form.getValues();
    const savedName = current.vendorContactPersonName || "";
    const savedEmail = current.vendorContactPersonEmail || "";

    // Re-attach an already-saved contact (Edit) to its person before selecting.
    if (savedName || savedEmail) {
      const match = persons.find(
        (p) =>
          (!!savedEmail &&
            !!p.email &&
            p.email.toLowerCase() === savedEmail.toLowerCase()) ||
          (!!savedName && !!p.name && p.name.toLowerCase() === savedName.toLowerCase())
      );
      if (match) {
        lastFilledIdRef.current = String(match.id);
        setField("vendorPersonId", String(match.id));
        return;
      }
      // Typed manually or the person was deleted from vendor master: keep what
      // is on the document rather than overwriting it.
      return;
    }

    if (skipAutoSelectRef.current) {
      skipAutoSelectRef.current = false;
      return;
    }

    // Fresh form and the org has persons -> auto-select the first.
    const first = persons[0];
    setField("vendorPersonId", String(first.id));
    fillFrom(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, persons, vendorPersonId]);

  return { sellerOrgId: orgId, sellerPersons: persons };
}
