# Uploads Storage Migration — Live Server Checklist

Files managed by the **File Upload module** (`api/src/modules/file-upload`) previously all lived
under `uploads/tendering/{context}`. They are now stored per module:
`uploads/{storageDir}/{context}`.

> **Action required on the live server after deploying this change:**
> run `pnpm run migrate:uploads` inside `api/` (or
> `pnpm run migrate:uploads -- --dry-run` first to preview). The script moves every
> `uploads/tendering/{context}` folder listed below to its new module folder. It is idempotent —
> safe to re-run, and skips contexts that are already in place.
>
> Then run `pnpm run migrate:uploads:v2` (preview with `-- --dry-run` first) for the
> **Stage B** mapping below: module-root upload folders moved into `uploads/<module>/<feature>/`,
> database paths rewritten, and empty legacy dirs (`amc/`, `amc-billing/`, `assets/`) removed.

## Folder moves (old → new)

| # | Old folder (uploads/tendering) | New folder (uploads/…) | Module |
|---|---|---|---|
| 1 | `bg-format-files` | `bi-dashboard/bg-format-files` | bi-dashboard |
| 2 | `bg-po-files` | `bi-dashboard/bg-po-files` | bi-dashboard |
| 3 | `bg-format-imran` | `bi-dashboard/bg-format-imran` | bi-dashboard |
| 4 | `bg-prefilled-signed` | `bi-dashboard/bg-prefilled-signed` | bi-dashboard |
| 5 | `bg-sfms-conf` | `bi-dashboard/bg-sfms-conf` | bi-dashboard |
| 6 | `bg-fdr-copy` | `bi-dashboard/bg-fdr-copy` | bi-dashboard |
| 7 | `bg-ext-letter` | `bi-dashboard/bg-ext-letter` | bi-dashboard |
| 8 | `bg-docket-slip` | `bi-dashboard/bg-docket-slip` | bi-dashboard |
| 9 | `bg-stamp-covering-letter` | `bi-dashboard/bg-stamp-covering-letter` | bi-dashboard |
| 10 | `bg-cancell-confirm` | `bi-dashboard/bg-cancell-confirm` | bi-dashboard |
| 11 | `fdr-format-imran` | `bi-dashboard/fdr-format-imran` | bi-dashboard |
| 12 | `fdr-prefilled-signed` | `bi-dashboard/fdr-prefilled-signed` | bi-dashboard |
| 13 | `fdr-sfms-confirmation` | `bi-dashboard/fdr-sfms-confirmation` | bi-dashboard |
| 14 | `fdr-request-letter-email` | `bi-dashboard/fdr-request-letter-email` | bi-dashboard |
| 15 | `fdr-docket-slip` | `bi-dashboard/fdr-docket-slip` | bi-dashboard |
| 16 | `fdr-covering-letter` | `bi-dashboard/fdr-covering-letter` | bi-dashboard |
| 17 | `fdr-req-receive` | `bi-dashboard/fdr-req-receive` | bi-dashboard |
| 18 | `dd-format-imran` | `bi-dashboard/dd-format-imran` | bi-dashboard |
| 19 | `dd-prefilled-signed` | `bi-dashboard/dd-prefilled-signed` | bi-dashboard |
| 20 | `dd-request-letter-email` | `bi-dashboard/dd-request-letter-email` | bi-dashboard |
| 21 | `dd-docket-slip` | `bi-dashboard/dd-docket-slip` | bi-dashboard |
| 22 | `dd-covering-letter` | `bi-dashboard/dd-covering-letter` | bi-dashboard |
| 23 | `cheque-format-imran` | `bi-dashboard/cheque-format-imran` | bi-dashboard |
| 24 | `cheque-prefilled-signed` | `bi-dashboard/cheque-prefilled-signed` | bi-dashboard |
| 25 | `cheque-images` | `bi-dashboard/cheque-images` | bi-dashboard |
| 26 | `cheque-docket-slip` | `bi-dashboard/cheque-docket-slip` | bi-dashboard |
| 27 | `cheque-covering-letter` | `bi-dashboard/cheque-covering-letter` | bi-dashboard |
| 28 | `cheque-cancelled-image` | `bi-dashboard/cheque-cancelled-image` | bi-dashboard |
| 29 | `cheque-receiving-handed-over` | `bi-dashboard/cheque-receiving-handed-over` | bi-dashboard |
| 30 | `cheque-positive-pay-confirmation` | `bi-dashboard/cheque-positive-pay-confirmation` | bi-dashboard |
| 31 | `mcaClosure` | `operations/mcaClosure` | operations |
| 32 | `wo-draft` | `operations/wo-draft` | operations |
| 33 | `wo-signed-copy` | `operations/wo-signed-copy` | operations |
| 34 | `final-wo` | `operations/final-wo` | operations |
| 35 | `detailed-wo` | `operations/detailed-wo` | operations |
| 36 | `kickoff-mom` | `operations/kickoff-mom` | operations |
| 37 | `contract-agreement` | `operations/contract-agreement` | operations |
| 38 | `payment-proof` | `operations/payment-proof` | operations |
| 39 | `amc-po` | `services/amc-po` | services |
| 40 | `amc-service-report` | `services/amc-service-report` | services |
| 41 | `amc-invoices` | `services/amc-invoices` | services |
| 42 | `amc-receipts` | `services/amc-receipts` | services |
| 43 | `amc-service-reports` | `services/amc-service-reports` | services |
| 44 | `customer-attachments` | `services/customer-attachments` | services |
| 45 | `pqr-po` | `shared/pqr-po` | shared |
| 46 | `pqr-sap-gem-po` | `shared/pqr-sap-gem-po` | shared |
| 47 | `pqr-completion` | `shared/pqr-completion` | shared |
| 48 | `pqr-performance-certificate` | `shared/pqr-performance-certificate` | shared |
| 49 | `finance-document` | `shared/finance-document` | shared |
| 50 | `bankLoanSchedule` | `accounts/bankLoanSchedule` | accounts |
| 51 | `sanctionLetter` | `accounts/sanctionLetter` | accounts |
| 52 | `tdsDocument` | `accounts/tdsDocument` | accounts |
| 53 | `bankNoc` | `accounts/bankNoc` | accounts |
| 54 | `insurances` | `insurance/insurances` | insurance |
| 55 | `followups` | `crm/followups` | crm |

## NOT moved (stay in uploads/tendering)

Tendering-module contexts keep their current location — nothing to do:

`tender-documents`, `emds`, `tender-fees`, `physical-docs`, `rfqs`, `rfq-scope-of-work`,
`rfq-tech-specs`, `rfq-detailed-boq`, `rfq-maf-format`, `rfq-mii-format`,
`rfq-response-quotation`, `rfq-response-technical`, `rfq-response-maf`, `rfq-response-mii`,
`info-sheets`, `costing-sheets`, `bid-submitted-docs`, `bid-submission-proof`,
`bid-final-price-ss`, `tender-results`, `checklists`, `tq-management`,
`screenshot_qualified_parties`, `screenshot_decrements`, `final_result_screenshot`,
`result-screenshots`, `tender-rejection-proof`, `cancel-tender`.

## Stage B — legacy module dirs moved into `uploads/<module>/<feature>/` (`migrate:uploads:v2`)

Run **after** `migrate:uploads` (needs the new code deployed so module dirs exist).
All moves are same-volume renames; skips collisions; idempotent. Also rewrites DB paths.

### Folder moves

| Old folder | New folder | Module |
|---|---|---|
| `uploads/employeeimprest` | `uploads/employee-imprest` | employee-imprest |
| `uploads/enquiry-results` | `uploads/crm/enquiry-results` | crm |
| `uploads/leads-quotations` | `uploads/crm/leads-quotations` | crm |
| `uploads/site-visit` | `uploads/crm/site-visit` | crm |
| `uploads/checklist` | `uploads/accounts/checklist` | accounts |
| `uploads/circulars` | `uploads/master/circulars` | master |
| `uploads/wo-documents` | `uploads/operations/wo-documents` | operations |
| `uploads/payment-pdfs/po` | `uploads/operations/po` | operations |
| `uploads/payment-pdfs/vwo` | `uploads/operations/vwo` | operations |
| `uploads/payment-pdfs/chqcreate` | `uploads/bi-dashboard/chqcreate` | bi-dashboard |
| `uploads/accounts/<file>` (root files) | `uploads/accounts/follow-ups/` | accounts |
| `uploads/bi-dashboard/<file>` (root files) | `uploads/bi-dashboard/bank-guarantee/` | bi-dashboard |

Legacy empty dirs removed: `uploads/amc`, `uploads/amc-billing`, `uploads/assets`,
`uploads/payment-pdfs` (after its subdirs move).

### DB rewrites

| Table | Column | Old prefix | New prefix |
|---|---|---|---|
| `lead_followups` | `attachments` (JSON) | `accounts/<file>` | `accounts/follow-ups/<file>` |
| `circulars` | `file` | `uploads/circulars/` | `uploads/master/circulars/` |
| `purchase_orders` | `generated_pdf_versions` (JSON) | `payment-pdfs/po/` | `operations/po/` |
| `vendor_work_orders` | `generated_pdf_versions` (JSON) | `payment-pdfs/vwo/` | `operations/vwo/` |
| `payment_instruments` | `generated_pdf` | `payment-pdfs/chqcreate/` | `bi-dashboard/chqcreate/` |
| `wo_acceptance` | `signed_wo_file_path` | `wo-documents/` | `operations/wo-documents/` |
| `wo_documents` | `file_path` | `wo-documents/` | `operations/wo-documents/` |

## Unrelated uploads dirs (not part of this module — do NOT touch)

`uploads/courier`, `uploads/hrms/*` (incl. `hrms/training/thumbnails` — stays as-is),
`uploads/tendering` (contains other service-level folders, e.g. `tender-documents`-adjacent
contexts that remain under `tendering/`).

## Code references updated in this change

- `api/.../payment-requests-notification.service.ts` — static URLs `/uploads/tendering/…`
  → `/uploads/bi-dashboard/…` (cheque images, BG soft copies)
- `web/.../BankGuaranteeView.tsx` — `/uploads/tendering/bg-po-files/…`
  → `/uploads/bi-dashboard/bg-po-files/…`

## After deploying

1. Deploy code, then run `pnpm run migrate:uploads` in `api/` on the live server.
   > The script now supports **merge**: if a destination folder already exists
   > (the app creates module dirs at startup, and new uploads may have landed
   > there after deploy), source items are moved into it item-by-item — same-volume
   > renames, no copying. Names that already exist in the destination are left
   > untouched (logged as `[skip-collision]`). Safe to re-run.
2. Run `pnpm run migrate:uploads:v2 -- --dry-run`, then the real run
   `pnpm run migrate:uploads:v2` (folder moves + DB rewrites; idempotent).
3. Verify: `ls uploads/bi-dashboard uploads/operations uploads/services uploads/shared uploads/accounts uploads/insurance uploads/crm uploads/master uploads/employee-imprest` shows the moved folders, and `uploads/amc uploads/amc-billing uploads/assets uploads/payment-pdfs` are gone.
4. Sanity-check a few old records: open a cheque/BG/wo/pqr/circular/follow-up record and confirm its file links still open
   (DB paths are rewritten by v2, so they resolve automatically after the move).