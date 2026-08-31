# WC (Workers Compensation) Insurance Policy Lock

## What it does

Enforces that an active WC insurance policy exists on a project **before** a user can create a Purchase Order (PO), Vendor Work Order (WO), or Payment Request (PR). The check is applied at both the frontend (UI) and backend (API) layers.

## Current status

**Disabled** — all WC policy lock code is commented out. Search for `WC_POLICY_LOCK` to find every commented block.

## How to re-enable

### Frontend (web/)

Search for `WC_POLICY_LOCK` in the following 6 files and:

1. **Uncomment** the `useHasWCInsurance` import
2. **Uncomment** the `const { hasWC } = useHasWCInsurance(...)` call
3. **Restore** the `disabled={!hasWC}` prop on the button
4. **Restore** the TooltipProvider/Tooltip/TooltipContent block with the ShieldAlert icon
5. **Restore** the full-page blocking banner (`if (!isWCLoading && !hasWC) { return ... }`)

#### Files

| File | Section |
|---|---|
| `web/src/modules/operations/purchase-orders/sections/PurchaseOrdersSection.tsx` | "Raise Purchase Order" button |
| `web/src/modules/operations/project-dashboard/sections/VendorWorkOrdersSection.tsx` | "Raise Work Order" button |
| `web/src/modules/operations/project-dashboard/sections/PaymentRequestsSection.tsx` | "Request for Payment" button |
| `web/src/modules/operations/purchase-orders/pages/CreatePurchaseOrderPage.tsx` | Full-page WC block |
| `web/src/modules/operations/vendor-work-orders/CreateVendorWorkOrderPage.tsx` | Full-page WC block |
| `web/src/modules/operations/payment-requests/CreatePaymentRequestPage.tsx` | Full-page WC block |

For the section buttons, uncomment `ShieldAlert` in the lucide-react import.

### Backend (api/)

Search for `WC_POLICY_LOCK` in the following 3 files and uncomment the `if` block that calls `this.insuranceService.hasActiveWCInsurance(...)` (or `this.insurancePolicyService.hasActiveWCInsurance(...)` for payment-request.service.ts).

#### Files

| File | Service method |
|---|---|
| `api/src/modules/operations/purchase-orders/purchase-order.service.ts` | `createPurchaseOrder()` |
| `api/src/modules/operations/vendor-work-orders/vendor-work-order.service.ts` | `create()` |
| `api/src/modules/operations/payment-requests/payment-request.service.ts` | `create()` |

**Note:** The payment request backend gate has an exception — payments against `"insurance"` or `"imprest"` are exempted from the WC check. This is intentional.

### Shared hook (no changes needed)

The following shared utilities remain intact (not commented out) and can be reused:

- **Frontend hook:** `web/src/hooks/api/useProjectInsurance.ts` → `useHasWCInsurance(projectId)`
- **Backend method:** `api/src/modules/insurance/insurance-policy.service.ts` → `hasActiveWCInsurance(projectId)`

## Search command

```bash
grep -rn "WC_POLICY_LOCK" web/src/ api/src/
```
