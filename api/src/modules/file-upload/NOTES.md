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
- `storageDir` defaults to `tendering` (see `DEFAULT_STORAGE_DIR` in `config/file-configs.ts`);
  contexts can override it per-entry. This keeps all legacy data resolving correctly.
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

## Adding a new upload context (usage guide)

1. Add the context name to the `FileContext` union in `api/src/modules/file-upload/config/file-configs.ts`
   **and** `web/src/components/file-upload/types.ts` (keep both in sync).
2. Add a `FILE_CONFIGS` entry in `file-configs.ts`:
   ```ts
   "my-module-doc": {
       storageDir: "my-module",        // optional; defaults to "tendering"
       maxFiles: 3,
       maxSizeBytes: MB(10),
       allowedMimeTypes: [...DOCS, ...OFFICE],
       allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
       compressImages: true,
       imageQuality: 80,
       compressPdf: true,
       pdfQuality: 80,
   },
   ```
3. The directory `uploads/{storageDir}/{context}` is created automatically on startup.
4. Render the uploader in the form:
   ```tsx
   import { FileUploader, CompactFileUploader } from "@/components/file-upload";
   ```
   - `FileUploader` — multi-file dropzone; `value: string[]`, `onChange(paths)`.
   - `CompactFileUploader` — single-file; `value: string | undefined`, `onChange(path | undefined)`.
5. Build display/download URLs with `fileUploadService.getFileUrl(path)` →
   `${base}/files/serve/${path}` (guarded, requires login). Do **not** hardcode `/uploads/...`
   for contexts whose `storageDir` is not `tendering`.

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
  `payment-requests-notification.service.ts` static `/uploads/tendering/...` URLs.
- Some legacy view pages build **static** `/uploads/tendering/...` links (e.g. `RfqView`,
  `RfqResponseDetailAccordion`, `SentRfqsResponsesHistory`, `RfqResponsesViewer`, `BankGuaranteeView`).
  These only work for contexts that still use the default `storageDir` (`tendering`) — prefer
  `fileUploadService.getFileUrl()` in new code.