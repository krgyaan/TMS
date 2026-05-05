# Payment Request Flow Documentation

## Overview

The Payment Request module handles the raising of payment requests for tenders, including EMD (Earnest Money Deposit), Tender Fee, and Processing Fee payments. It supports multiple payment instruments including DD, FDR, BG, Cheque, Bank Transfer, and Portal Payment.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment-requests/tenders/:tenderId` | Create payment request for a tender |
| GET | `/payment-requests/` | Get dashboard data with tabs |
| GET | `/payment-requests/dashboard/counts` | Get dashboard counts for all statuses |
| GET | `/payment-requests/tenders/:tenderId` | Get payment requests by tender ID |
| GET | `/payment-requests/tenders/:tenderId/with-details` | Get payment requests with tender details |
| GET | `/payment-requests/:id` | Get payment request by ID |
| GET | `/payment-requests/:id/with-details` | Get payment request with tender details |
| PATCH | `/payment-requests/:id` | Update payment request |
| PATCH | `/payment-requests/:id/status` | Update payment request status |

---

## 1. Create Payment Request

### Endpoint
```
POST /api/payment-requests/tenders/:tenderId
```

### Request Payload

```json
{
  "type": "TMS" | "Other Than TMS" | "Old Entries" | "Other Than Tender",
  "tenderNo": "string (optional, for non-TMS)",
  "tenderName": "string (optional, for non-TMS)",
  "dueDate": "ISO date string (optional, for non-TMS)",
  "emd": {
    "mode": "DD" | "FDR" | "BG" | "CHEQUE" | "BANK_TRANSFER" | "PORTAL",
    "details": { ... }
  },
  "tenderFee": {
    "mode": "PORTAL" | "BANK_TRANSFER" | "DD",
    "details": { ... }
  },
  "processingFee": {
    "mode": "PORTAL" | "BANK_TRANSFER" | "DD",
    "details": { ... }
  }
}
```

### EMD Mode Details

#### DD (Demand Draft)
```json
{
  "mode": "DD",
  "details": {
    "ddAmount": 50000,
    "ddFavouring": "Company Name",
    "ddPayableAt": "Mumbai",
    "ddDeliverBy": "Courier",
    "ddPurpose": "EMD",
    "ddCourierAddress": "Address here",
    "ddCourierHours": 48,
    "ddDate": "2024-01-15",
    "ddRemarks": "Any remarks"
  }
}
```

#### FDR (Fixed Deposit Receipt)
```json
{
  "mode": "FDR",
  "details": {
    "fdrAmount": 100000,
    "fdrFavouring": "Company Name",
    "fdrExpiryDate": "2025-01-15",
    "fdrDeliverBy": "Courier",
    "fdrPurpose": "EMD",
    "fdrCourierAddress": "Address here",
    "fdrCourierDays": 5,
    "fdrDate": "2024-01-15"
  }
}
```

#### BG (Bank Guarantee)
```json
{
  "mode": "BG",
  "details": {
    "bgAmount": 500000,
    "bgNeededIn": "Bank Name",
    "bgPurpose": "EMD",
    "bgFavouring": "Client Name",
    "bgAddress": "Client Address",
    "bgExpiryDate": "2025-01-15",
    "bgClaimPeriod": "90 days",
    "bgStampValue": 500,
    "bgFormatFiles": ["file1.pdf"],
    "bgPoFiles": ["po1.pdf"],
    "bgClientUserEmail": "user@client.com",
    "bgClientCpEmail": "cp@client.com",
    "bgClientFinanceEmail": "finance@client.com",
    "bgCourierAddress": "Address",
    "bgCourierDays": 5,
    "bgBank": "Bank Name",
    "bgBankAccountName": "Account Name",
    "bgBankAccountNo": "1234567890",
    "bgBankIfsc": "BANK0001234"
  }
}
```

#### Cheque
```json
{
  "mode": "CHEQUE",
  "details": {
    "chequeAmount": 50000,
    "chequeFavouring": "Company Name",
    "chequeDate": "2024-01-15",
    "chequeNeededIn": "Bank Name",
    "chequePurpose": "EMD",
    "chequeAccount": "Account Number"
  }
}
```

#### Bank Transfer
```json
{
  "mode": "BANK_TRANSFER",
  "details": {
    "btAmount": 50000,
    "btPurpose": "EMD",
    "btAccountName": "Account Name",
    "btAccountNo": "1234567890",
    "btIfsc": "BANK0001234"
  }
}
```

#### Portal Payment
```json
{
  "mode": "PORTAL",
  "details": {
    "portalAmount": 50000,
    "portalPurpose": "EMD",
    "portalName": "Portal Name",
    "portalNetBanking": "YES" | "NO",
    "portalDebitCard": "YES" | "NO"
  }
}
```

### Tender Fee & Processing Fee Details
Supported modes: PORTAL, POP, BANK_TRANSFER, BT, DD

---

## 2. Response Structure

### Create Response
```json
[
  {
    "request": {
      "id": 1,
      "tenderId": 123,
      "type": "TMS",
      "purpose": "EMD",
      "amountRequired": "50000.00",
      "status": "Pending",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    "instrument": {
      "id": 1,
      "requestId": 1,
      "instrumentType": "DD",
      "amount": "50000.00",
      "status": "DD_ACCOUNTS_FORM_PENDING",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  }
]
```

### Dashboard Response
```json
{
  "data": [
    {
      "tenderId": 123,
      "tenderNo": "TND/2024/001",
      "tenderName": "Project Name",
      "emd": "50000",
      "emdMode": "DD",
      "tenderFee": "1000",
      "tenderFeeMode": "PORTAL",
      "processingFee": "500",
      "processingFeeMode": "PORTAL",
      "dueDate": "2024-02-15T00:00:00Z",
      "teamMember": "John Doe",
      "status": 1,
      "statusName": "Active"
    }
  ],
  "counts": {
    "pending": 10,
    "sent": 5,
    "approved": 20,
    "rejected": 2,
    "returned": 1,
    "tenderDnb": 3,
    "total": 41
  },
  "meta": {
    "total": 41,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Dashboard Counts Response
```json
{
  "pending": 10,
  "sent": 5,
  "approved": 20,
  "rejected": 2,
  "returned": 1,
  "tenderDnb": 3,
  "total": 41
}
```

---

## 3. Database Fields Mapping

### Table: payment_requests

| Field | Type | Description | MySQL Equivalent |
|-------|------|-------------|------------------|
| id | serial | Primary key | - |
| tenderId | integer | Links to tender_infos | emds.tender_id |
| type | payment_request_type | TMS, Other Than TMS, Old Entries, Other Than Tender | emds.type |
| tenderNo | varchar(500) | Tender number | emds.tender_no |
| projectName | varchar(500) | Project/tender name | emds.project_name |
| dueDate | timestamp | Due date | emds.due_date |
| requestedBy | integer | User ID who requested | emds.requested_by |
| purpose | payment_purpose | EMD, Tender Fee, Processing Fee | emds.purpose |
| amountRequired | decimal(15,2) | Required amount | emd_*.(*)_amt fields |
| status | varchar(50) | Pending, Sent, Approved, etc. | emds_*.status fields |
| remarks | text | Additional remarks | Various reason fields |
| legacyEmdId | integer | Legacy MySQL emds.id | emds.id |
| createdAt | timestamp | Creation timestamp | emds.created_at |
| updatedAt | timestamp | Update timestamp | emds.updated_at |

### Table: payment_instruments

| Field | Type | Description | MySQL Equivalent |
|-------|------|-------------|------------------|
| id | serial | Primary key | - |
| requestId | integer | Links to payment_requests.id | - |
| instrumentType | instrument_type | DD, FDR, BG, Cheque, Bank Transfer, Portal Payment | - |
| purpose | varchar(255) | Purpose string | - |
| amount | decimal(15,2) | Instrument amount | Various amt fields |
| favouring | varchar(500) | Favouring party | emd_*.*_favour fields |
| payableAt | varchar(500) | Payable location | emd_*.*_payable fields |
| issueDate | date | Issue date | emd_*.*_date fields |
| expiryDate | date | Expiry date | emd_fdrs.fdr_expiry, emd_bgs.bg_expiry |
| validityDate | date | Validity date | emd_bgs.bg_validity |
| claimExpiryDate | date | Claim expiry date | emd_bgs.bg_claim |
| utr | varchar(255) | UTR number | bank_transfers.utr, pay_on_portals.utr |
| status | varchar(100) | Instrument status | - |
| isActive | boolean | Active flag | - |
| generatedPdf | varchar(500) | Generated PDF path | emd_*.*_generated fields |
| cancelPdf | varchar(500) | Cancellation PDF path | emd_*.*_cancel_pdf fields |
| legacyDdId | integer | Legacy emd_demand_drafts.id | emd_demand_drafts.id |
| legacyFdrId | integer | Legacy emd_fdrs.id | emd_fdrs.id |
| legacyBgId | integer | Legacy emd_bgs.id | emd_bgs.id |
| legacyChequeId | integer | Legacy emd_cheques.id | emd_cheques.id |
| legacyBtId | integer | Legacy bank_transfers.id | bank_transfers.id |
| legacyPortalId | integer | Legacy pay_on_portals.id | pay_on_portals.id |
| createdAt | timestamp | Creation timestamp | - |
| updatedAt | timestamp | Update timestamp | - |

### Instrument Detail Tables

#### instrument_dd_details
| Field | Type | MySQL Equivalent |
|-------|------|------------------|
| instrumentId | integer | - |
| ddNo | varchar(100) | emd_demand_drafts.dd_no |
| ddDate | date | emd_demand_drafts.dd_date |
| reqNo | varchar(100) | emd_demand_drafts.req_no |
| ddNeeds | varchar(255) | emd_demand_drafts.dd_needs |
| ddPurpose | varchar(255) | emd_demand_drafts.dd_purpose |
| ddRemarks | text | emd_demand_drafts.remarks |

#### instrument_fdr_details
| Field | Type | MySQL Equivalent |
|-------|------|------------------|
| instrumentId | integer | - |
| fdrNo | varchar(100) | emd_fdrs.fdr_no |
| fdrDate | date | emd_fdrs.fdr_date |
| fdrSource | varchar(200) | emd_fdrs.fdr_source |
| roi | decimal(15,2) | (New field) |
| marginPercent | decimal(15,2) | (New field) |
| fdrExpiryDate | date | emd_fdrs.fdr_expiry |
| fdrNeeds | varchar(255) | emd_fdrs.fdr_needs |
| fdrRemark | text | emd_fdrs.fdr_remark |

#### instrument_bg_details
| Field | Type | MySQL Equivalent |
|-------|------|------------------|
| instrumentId | integer | - |
| bgNo | varchar(100) | emd_bgs.bg_no |
| bgDate | date | emd_bgs.bg_date |
| validityDate | date | emd_bgs.bg_validity |
| claimExpiryDate | date | emd_bgs.claim_expiry |
| beneficiaryName | varchar(500) | emd_bgs.bg_favour |
| beneficiaryAddress | text | emd_bgs.bg_address |
| bankName | varchar(300) | emd_bgs.new_bg_bank_name |
| cashMarginPercent | decimal(15,2) | emd_bgs.bg_cont_percent |
| fdrMarginPercent | decimal(15,2) | emd_bgs.bg_fdr_percent |
| stampCharges | decimal(15,2) | (New field) |
| sfmsCharges | decimal(15,2) | (New field) |
| stampChargesDeducted | decimal(15,2) | emd_bgs.stamp_charge_deducted |
| sfmsChargesDeducted | decimal(15,2) | emd_bgs.sfms_charge_deducted |
| extendedAmount | decimal(15,2) | emd_bgs.new_bg_amt |
| extendedValidityDate | date | emd_bgs.new_bg_expiry |

#### instrument_cheque_details
| Field | Type | MySQL Equivalent |
|-------|------|------------------|
| instrumentId | integer | - |
| chequeNo | varchar(50) | emd_cheques.cheq_no |
| chequeDate | date | emd_cheques.cheque_date |
| bankName | varchar(300) | emd_cheques.cheque_bank |
| chequeImagePath | varchar(500) | emd_cheques.cheq_img |
| cancelledImagePath | varchar(500) | emd_cheques.cancelled_img |
| stopReasonText | text | emd_cheques.stop_reason_text |

#### instrument_transfer_details
| Field | Type | MySQL Equivalent |
|-------|------|------------------|
| instrumentId | integer | - |
| portalName | varchar(200) | pay_on_portals.portal |
| accountName | varchar(500) | bank_transfers.bt_acc_name |
| accountNumber | varchar(50) | bank_transfers.bt_acc |
| ifsc | varchar(20) | bank_transfers.bt_ifsc |
| utrNum | varchar(200) | bank_transfers.utr_num |
| isNetbanking | varchar(255) | pay_on_portals.is_netbanking |
| isDebit | varchar(255) | pay_on_portals.is_debit |
| reason | text | bank_transfers.reason |

#### instrument_status_history
| Field | Type | Description |
|-------|------|-------------|
| instrumentId | integer | Links to payment_instruments.id |
| fromStatus | varchar(100) | Previous status |
| toStatus | varchar(100) | New status |
| fromAction | integer | Previous action code |
| toAction | integer | New action code |
| fromStage | integer | Previous stage |
| toStage | integer | New stage |
| formData | jsonb | Form data at time of change |
| remarks | text | Remarks for change |
| rejectionReason | text | Reason if rejected |
| isResubmission | boolean | Is this a resubmission |
| changedBy | integer | User ID who made change |
| changedByName | varchar(200) | Name of user |
| changedByRole | varchar(200) | Role of user |

---

## 4. Status Flow by Instrument Type

### DD / FDR Status Flow (7 Stages)

```
Stage 1: Accounts Form
├── DD_ACCOUNTS_FORM_PENDING (Initial)
├── DD_ACCOUNTS_FORM_ACCEPTED
├── DD_ACCOUNTS_FORM_REJECTED (Terminal)
├── DD_FOLLOWUP_INITIATED
├── DD_RETURN_VIA_COURIER
├── DD_RETURN_VIA_BANK_TRANSFER
├── DD_SETTLED_WITH_PROJECT
├── DD_CANCELLATION_REQUESTED
└── DD_CANCELLED_AT_BRANCH

Stage 2: Followup
└── DD_FOLLOWUP_INITIATED

Stage 3: Returned via Courier
└── DD_RETURN_VIA_COURIER (Terminal)

Stage 4: Returned via Bank Transfer
└── DD_RETURN_VIA_BANK_TRANSFER (Terminal)

Stage 5: Settled with Project
└── DD_SETTLED_WITH_PROJECT (Terminal)

Stage 6: Cancellation Request
└── DD_CANCELLATION_REQUESTED

Stage 7: Cancelled at Branch
└── DD_CANCELLED_AT_BRANCH (Terminal)
```

### BG Status Flow (9 Stages)

```
Stage 1: Accounts Form 1 - Request to Bank
├── BG_ACCOUNTS_FORM_PENDING (Initial)
├── BG_ACCOUNTS_FORM_ACCEPTED
├── BG_ACCOUNTS_FORM_REJECTED (Terminal)
├── BG_CREATED
├── BG_FDR_DETAILS_CAPTURED
├── BG_FOLLOWUP_INITIATED
├── BG_EXTENSION_REQUESTED
├── BG_RETURN_VIA_COURIER
├── BG_CANCELLATION_REQUESTED
├── BG_BG_CANCELLATION_CONFIRMED
└── BG_FDR_CANCELLED_CONFIRMED

Stage 2: Accounts Form 2 - After BG Creation
└── BG_CREATED

Stage 3: Accounts Form 3 - Capture FDR Details
└── BG_FDR_DETAILS_CAPTURED

Stage 4: Followup
└── BG_FOLLOWUP_INITIATED

Stage 5: Extension
└── BG_EXTENSION_REQUESTED

Stage 6: Returned via Courier
└── BG_RETURN_VIA_COURIER (Terminal)

Stage 7: Cancellation Request
└── BG_CANCELLATION_REQUESTED

Stage 8: BG Cancellation Confirmation
└── BG_BG_CANCELLATION_CONFIRMED

Stage 9: FDR Cancellation Confirmation
└── BG_FDR_CANCELLED_CONFIRMED
```

### Cheque Status Flow (6 Stages)

```
Stage 1: Accounts Form
├── CHEQUE_ACCOUNTS_FORM_PENDING (Initial)
├── CHEQUE_ACCOUNTS_FORM_ACCEPTED
└── CHEQUE_ACCOUNTS_FORM_REJECTED (Terminal)

Stage 2: Followup
└── CHEQUE_FOLLOWUP_INITIATED

Stage 3: Stop Cheque
└── CHEQUE_STOP_FROM_BANK (Terminal)

Stage 4: Paid via Bank Transfer
└── CHEQUE_PAID_VIA_BANK_TRANSFER (Terminal)

Stage 5: Deposited in Bank
└── CHEQUE_DEPOSITED_IN_BANK (Terminal)

Stage 6: Cancelled/Torn
└── CHEQUE_CANCELLED_TORN
```

### Bank Transfer / Portal Payment Status Flow (4 Stages)

```
Stage 1: Accounts Form
├── Bank Transfer_ACCOUNTS_FORM_PENDING (Initial)
├── Bank Transfer_ACCOUNTS_FORM_ACCEPTED
├── Bank Transfer_ACCOUNTS_FORM_REJECTED (Terminal)
├── Bank Transfer_FOLLOWUP_INITIATED
├── Bank Transfer_RETURN_VIA_BANK_TRANSFER
└── Bank Transfer_SETTLED_WITH_PROJECT

Stage 2: Followup
└── Bank Transfer_FOLLOWUP_INITIATED

Stage 3: Returned via Bank Transfer
└── Bank Transfer_RETURN_VIA_BANK_TRANSFER (Terminal)

Stage 4: Settled with Project
└── Bank Transfer_SETTLED_WITH_PROJECT
```

---

## 5. Update Status

### Endpoint
```
PATCH /api/payment-requests/:id/status
```

### Request Payload
```json
{
  "status": "Pending" | "Requested" | "Sent" | "Approved" | "Rejected" | "Issued" | "Dispatched" | "Received" | "Returned" | "Cancelled" | "Refunded" | "Encashed" | "Extended",
  "remarks": "Optional remarks"
}
```

---

## 6. File Structure

### Backend
- **Controller**: `api/src/modules/tendering/payment-requests/payment-requests.controller.ts`
- **Command Service**: `api/src/modules/tendering/payment-requests/services/payment-requests.command.service.ts`
- **Query Service**: `api/src/modules/tendering/payment-requests/services/payment-requests.query.service.ts`
- **DTO/Schema**: `api/src/modules/tendering/payment-requests/dto/payment-requests.dto.ts`
- **Database Schema**: `api/src/db/schemas/tendering/payment-requests.schema.ts`
- **Status Constants**: `api/src/modules/tendering/payment-requests/constants/payment-request-statuses.ts`

### Frontend
- **Service**: `web/src/services/api/payment-requests.service.ts`
- **Types**: `web/src/modules/tendering/emds-tenderfees/helpers/payment-request.types.ts`
- **Schema**: `web/src/modules/tendering/emds-tenderfees/helpers/payment-request.schema.ts`

---

## 7. Enums Reference

### payment_purpose
- EMD
- Tender Fee
- Processing Fee
- Security Deposit
- Performance BG
- Surety Bond
- Other Payment

### instrument_type
- DD
- FDR
- BG
- Cheque
- Bank Transfer
- Portal Payment
- Surety Bond

### payment_request_type
- TMS
- Other Than TMS
- Old Entries
- Other Than Tender