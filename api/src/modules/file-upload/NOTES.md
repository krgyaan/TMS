# File Upload Module — Usage Notes

Global file uploader used by every domain module. Previously `tendering/tender-files`, moved to
`api/src/modules/file-upload` so any module can reuse it. Each upload **context** defines its own
limits (max files, max size, allowed types) and its own **storage directory** under `uploads/`.

## How it works

- Uploads arrive in memory (multer `memoryStorage`), are validated against the context config,
  optionally compressed (sharp for images, pdf-lib for PDFs), then written to
  `uploads/{storageDir}/{context}/{fileName}`.
- Stored paths are **relative** (`{context}/{fileName}`, e.g. `emds/1723456789012_scan.pdf`) and
  persisted on domain tables (e.g. `rfqs.path`, `payment_requests.cheque_image_path`,
  `tender_document_checklists.extra_documents`).
- `storageDir` is applied per module in `config/index.ts` (see the table below). DB paths stay
  context-relative, so they resolve automatically regardless of the on-disk folder.
- AMC contexts (`amc-*`) use a readable filename `{userId}_{ddmmyy}_{hhmmss}_{name}.ext` so the
  uploader + time can be recovered (see `web/src/components/file-upload/helpers/fileMeta.ts`).

## API endpoints (all under global prefix `/api/v1`)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/files/configs` | Public | All context configs |
| GET | `/files/config/:context` | Public | Config for one context |
| POST | `/files/upload` | JWT | Multipart upload (`files` + `context` fields); 25 MB per-file hard cap |
| GET | `/files/serve/:context/:fileName` | JWT | Stream file with correct MIME |
| DELETE | `/files/:context/:fileName` | JWT | Delete file from disk |

## Config structure (single registration point)

```
config/
├── index.ts               # merges all module configs → FILE_CONFIGS; FileContext = keyof typeof FILE_CONFIGS
├── common.ts              # MIME consts, FileConfig, DEFAULT_STORAGE_DIR, formatBytes/isImage/isPdf
├── tendering.config.ts    # storageDir: tendering
├── bi-dashboard.config.ts # storageDir: bi-dashboard
├── operations.config.ts   # storageDir: operations
├── services.config.ts     # storageDir: services
├── shared.config.ts       # storageDir: shared
├── accounts.config.ts     # storageDir: accounts
├── insurance.config.ts    # storageDir: insurance
└── crm.config.ts          # storageDir: crm
```

`FileContext` is derived from the merged map keys, and the controller's zod enum derives from the
same keys — **the union can never drift from the config again**. Compression rules
(`compressImages: true, imageQuality: 80, compressPdf: true, pdfQuality: 80`) come from
`DEFAULT_COMPRESSION` in `common.ts` and are applied to every context at merge time; per-entry
values override the defaults.

## Adding a new upload context (usage guide)

1. Add one entry to the module's config file in `config/` (e.g. `operations.config.ts`):
   ```ts
   "my-module-doc": {
       maxFiles: 3,
       maxSizeBytes: MB(10),
       allowedMimeTypes: [...DOCS, ...OFFICE],
       allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
   },
   ```
   The context inherits the module's `storageDir` **and** the default compression
   rules from `DEFAULT_COMPRESSION` in `common.ts` (images+PDFs compressed at
   quality 80). Only add compression fields when a context needs different
   behavior (e.g. `compressImages: false`). **No type registration needed** —
   neither backend nor frontend.
2. The directory `uploads/{storageDir}/{context}` is created automatically on startup.
3. Render the uploader in the form:
   ```tsx
   import { FileUploader, CompactFileUploader } from "@/components/file-upload";
   ```
   - `FileUploader` — multi-file dropzone; `value: string[]`, `onChange(paths)`.
   - `CompactFileUploader` — single-file; `value: string | undefined`, `onChange(path | undefined)`.
4. Build display/download URLs with `fileUploadService.getFileUrl(path)` →
   `${base}/files/serve/${path}` (guarded, requires login). Do **not** hardcode `/uploads/...`.

> Frontend note: `FileContext` (`web/src/components/file-upload/types.ts`) is a loose
> `string`-accepting type with a `KNOWN_CONTEXTS` suggestion list for autocomplete. The backend
> validates contexts at runtime (unknown → 400 + uploader fallback banner).

## Storage dirs (one folder per module)

| Module | storageDir | Contexts |
|---|---|---|
| tendering | `tendering` | tender-*, rfq-*, bid-*, emds, checklists, tq, result screenshots, … |
| bi-dashboard | `bi-dashboard` | bg-*, fdr-*, dd-*, cheque-* |
| operations | `operations` | wo-*, mcaClosure, kickoff-mom, contract-agreement, payment-proof |
| services | `services` | amc-*, customer-attachments |
| shared | `shared` | pqr-*, finance-document |
| accounts | `accounts` | bankLoanSchedule, sanctionLetter, tdsDocument, bankNoc |
| insurance | `insurance` | insurances |
| crm | `crm` | followups |

## Migrating existing files (live server)

All contexts previously lived under `uploads/tendering/{context}`. After deploying, run once:

```
pnpm run migrate:uploads            # in api/
pnpm run migrate:uploads -- --dry-run   # preview first
```

Idempotent script: `api/scripts/migrate-file-upload-dirs.ts`. Full old→new folder mapping in
`docs/uploads-storage-migration.md`.

## Frontend files

- Components: `web/src/components/file-upload/` (`FileUploader`, `CompactFileUploader`, `types.ts`, `helpers/fileMeta.ts`)
- Hook: `web/src/hooks/api/useFileUpload.ts` — `useFileConfig(context)`, `useFileUpload(context)` (upload + delete + progress)
- API client: `web/src/services/api/file-upload.service.ts` — `fileUploadService`

## Backend consumers

- `FileUploadModule` registered globally in `api/src/app.module.ts`.
- `FileUploadService` injected directly by:
  - `modules/email/email.service.ts` (+ `email.module.ts` imports `FileUploadModule`) — resolves attachment absolute paths
  - `modules/bi-dashboard/{cheque, fdr, demand-draft, bank-transfer, pay-on-portal}/…module.ts` — providers
- Builds `/files/serve/...` URLs for emails/notifications:
  - `tendering/tenders/tenders.service.ts`
  - `tendering/tender-result/tender-result.service.ts`
  - `tendering/tq-management/tq-management.service.ts`
  - `tendering/checklists/document-checklists.service.ts`
  - `tendering/bid-submissions/bid-submissions.service.ts`
  - `tendering/tender-approval/tender-approval.service.ts`
  - `tendering/info-sheets/info-sheets.service.ts`
  - `tendering/reverse-auction/reverse-auction.service.ts`
  - `tendering/payment-requests/services/payment-requests-notification.service.ts`

## Frontend consumers (58 files)

- **bi-dashboard:** `BankGuaranteeActionForm`, `BankGuaranteeEditForm`, `BankGuaranteeView`,
  `ChequeActionForm`, `ChequeView`, `FdrActionForm`, `PayOnPortalActionForm`
- **tendering:** `TenderForm`, `TenderView`, `DocumentChecklistForm/View`, `InfoSheetForm/View`,
  `RfqForm`, `RfqResponseForm`, `SubmitBidForm`, `BidSubmissionView`, `ChangeStatusModal`,
  `UploadResultFormPage`, `TenderResultView`, `RAResultForm`, `RAResultFormPage`, `RaShow`,
  `TqReceivedForm`, `TqRepliedForm`, `TenderApprovalForm/View`, `BankGuaranteeForm` (emds-tenderfees)
- **operations:** `Create/EditVendorWorkOrderPage`, `VwoClosurePage`, `Create/EditPurchaseOrderPage`,
  `PoClosurePage`, `Create/EditPurchaseInvoicePage`, `InvoiceUploadField`, `ViewSaleInvoicePage`,
  `CreditNoteDialog`, `UploadInvoiceDialog`, `PaymentReceivedDialog`, `CombinedPaymentRequestListPage`,
  `PaymentRequestDetailDialog`, `WoUploadPage`, `WoAcceptanceForm`, `BasicDetailForm`,
  `Page2Compliance`, `Page5Execution`, `Page8Review`, `UploadContractAgreement`, `WoUploadMomDialog`,
  `OrderViewPage`, `PurchaseInvoicesSection`
- **services:** `AmcCreateForm`, `UploadServiceReportModal`, `ManageInvoicesModal`, `ManageReceiptsModal`,
  `ServiceReportForm`, `ConferenceForm`, `CustomerCreateForm`
- **crm:** `MailTab`, `WhatsappTab`, `LetterTab`
- **shared:** `FinanceDocumentForm`, `PqrForm`, `CreateMakerRequestPage`, `MyMakerRequests`, `ProjectMasterForm`
- **accounts:** `LoanAdvanceForm`, `LoanClosureForm`, `TdsRecoveredForm`, `LoanAdvanceView`
- **insurance:** `InsuranceDetailsForm`, `InsuranceViewPage`
- **helpers:** `amc.types.ts`, `conference.types.ts`, `customer.types.ts`, `service-visit.types.ts`

## Caveats

- `uploads/tendering/` is shared with non-uploader features that must not be moved:
  `tender-result.controller.ts` (multer `result-screenshots`), `pdf/config/pdf-config.ts`
  (`payment-pdfs` output), `vendor-work-order` / `purchase-order` PDF rename + serve, and
  `payment-requests-notification.service.ts` static `/uploads/bi-dashboard/...` URLs (updated).
- Some legacy view pages build **static** `/uploads/tendering/...` links (e.g. `RfqView`,
  `RfqResponseDetailAccordion`, `SentRfqsResponsesHistory`, `RfqResponsesViewer`). These only
  work for contexts that still use the default `storageDir` (`tendering`) — prefer
  `fileUploadService.getFileUrl()` in new code.