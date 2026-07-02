# Payment Request Execution Flow

This document describes all steps executed after a user submits a payment request form, broken down by payment instrument mode.

## Common Initial Steps (All Modes)

1. **Request Validation**
   - Validate payload using Zod schema (`CreatePaymentRequestSchema`)
   - Extract `tenderId` from route parameter
   - Extract `userId` from authenticated user

2. **Tender Data Fetching**
   - If request type is NOT "Old Entries" or "Other Than Tender":
     - Fetch tender data from `tender_infos` table
     - Fetch tender information sheet from `tender_information` table
     - Store previous tender status for history tracking
   - If request type IS "Old Entries" or "Other Than Tender":
     - Create minimal tender object from payload data
     - Set `tenderNo` to payload value or 'NA'
     - Set `projectName` to payload value or 'NA' (for non-TMS requests)

3. **Transaction Start**
   - Begin database transaction (all operations are atomic)

---

## Mode-Specific Execution Flows

### 1. Demand Draft (DD) Mode

#### Step 1: Create Payment Request
- **Table**: `payment_requests`
- **Fields Set**:
  - `tenderId`: From route parameter (or 0 for non-TMS)
  - `type`: From payload (TMS, Old Entries, Other Than Tender, Other Than TMS)
  - `purpose`: 'EMD'
  - `amountRequired`: From `ddAmount` (non-TMS) or `tender.emd` (TMS)
  - `tenderNo`: From payload or tender object or 'NA'
  - `projectName`: From payload or tender object or 'NA' (for non-TMS)
  - `dueDate`: From payload or tender object
  - `requestedBy`: User ID as string
  - `status`: 'Pending'

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'DD'
  - `amount`: From `ddAmount`
  - `status`: 'DD_ACCOUNTS_FORM_PENDING' (initial status)
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - `favouring`: From `ddFavouring`
  - `payableAt`: From `ddPayableAt`
  - `courierAddress`: From `ddCourierAddress`
  - `courierDeadline`: From `ddCourierHours` (converted to integer)
  - `issueDate`: From `ddDate` (converted to date)
  - `remarks`: From `ddRemarks`

#### Step 3: Create DD Detail Record
- **Table**: `instrument_dd_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `ddDate`: From `ddDate` (converted to date)
  - `ddPurpose`: From `ddPurpose`
  - `ddNeeds`: From `ddDeliverBy`
  - `ddRemarks`: From `ddRemarks`
- **Returns**: Detail record ID (for linking)

#### Step 4: Record Status History
- **Table**: `instrument_status_history`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `fromStatus`: null (initial creation)
  - `toStatus`: 'DD_ACCOUNTS_FORM_PENDING'
  - `fromAction`: null
  - `toAction`: 0
  - `fromStage`: null
  - `toStage`: 1
  - `formData`: Complete form details (JSON)
  - `remarks`: 'Initial creation'
  - `changedBy`: User ID
  - `changedByName`: User name
  - `changedByRole`: User role
  - `ipAddress`: From request
  - `userAgent`: From request

#### Step 5: Create Linked Cheque Request (Automatic)
- **Payment Request Created**:
  - Same tender details as DD request
  - `purpose`: 'EMD'
  - `amountRequired`: Same as DD amount

- **Cheque Instrument Created**:
  - `instrumentType`: 'Cheque'
  - `amount`: Same as DD amount
  - `status`: 'Cheque_ACCOUNTS_FORM_PENDING'
  - `favouring`: From DD's `ddFavouring`
  - `issueDate`: Today's date

- **Cheque Detail Created**:
  - `instrumentId`: Links to cheque instrument
  - `chequeDate`: Today's date
  - `chequeReason`: 'DD'
  - `chequeNeeds`: From DD's `ddDeliverBy`
  - `linkedDdId`: DD detail record ID (links to DD)
  - `bankName`: Empty string (not required for linked cheque)

#### Step 6: Record Cheque Status History
- Same as Step 4, but for the linked Cheque instrument

#### Step 7: Update Tender Status (If Applicable)
- **Condition**: Only for TMS requests with valid `tenderId > 0`
- **Action**:
  - Update `tender_infos.status` to `5` (EMD Requested)
  - Record status change in `tender_status_history`

#### Step 8: Transaction Commit
- All database operations are committed atomically

#### Step 9: Send Email Notifications
- **DD Request Email**:
  - Template: `demand-draft-request`
  - Subject: `Demand Draft Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: DD details, tender info, amount, dates

- **Linked Cheque Request Email**:
  - Template: `cheque-request`
  - Subject: `Cheque Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: Cheque details (linked to DD), tender info

---

### 2. Fixed Deposit Receipt (FDR) Mode

#### Step 1: Create Payment Request
- Same as DD Step 1, but amount from `fdrAmount` or `tender.emd`

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'FDR'
  - `amount`: From `fdrAmount`
  - `status`: 'FDR_ACCOUNTS_FORM_PENDING'
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - `favouring`: From `fdrFavouring`
  - `expiryDate`: From `fdrExpiryDate` (converted to date)
  - `courierAddress`: From `fdrCourierAddress`
  - `courierDeadline`: From `fdrCourierHours` (converted to integer)
  - `issueDate`: From `fdrDate` (converted to date)

#### Step 3: Create FDR Detail Record
- **Table**: `instrument_fdr_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `fdrDate`: From `fdrDate` (converted to date)
  - `fdrExpiryDate`: From `fdrExpiryDate` (converted to date)
  - `fdrPurpose`: From `fdrPurpose`
  - `fdrNeeds`: From `fdrDeliverBy`
- **Returns**: Detail record ID (for linking)

#### Step 4: Record Status History
- Same as DD Step 4, but status is 'FDR_ACCOUNTS_FORM_PENDING'

#### Step 5: Create Linked Cheque Request (Automatic)
- **Payment Request Created**: Same as DD Step 5
- **Cheque Instrument Created**:
  - `instrumentType`: 'Cheque'
  - `amount`: Same as FDR amount
  - `status`: 'Cheque_ACCOUNTS_FORM_PENDING'
  - `favouring`: From FDR's `fdrFavouring`
  - `issueDate`: Today's date

- **Cheque Detail Created**:
  - `instrumentId`: Links to cheque instrument
  - `chequeDate`: Today's date
  - `chequeReason`: 'FDR'
  - `chequeNeeds`: From FDR's `fdrDeliverBy`
  - `linkedFdrId`: FDR detail record ID (links to FDR)
  - `bankName`: Empty string

#### Step 6: Record Cheque Status History
- Same as DD Step 6

#### Step 7: Update Tender Status
- Same as DD Step 7

#### Step 8: Transaction Commit
- Same as DD Step 8

#### Step 9: Send Email Notifications
- **FDR Request Email**:
  - Template: `fixed-deposit-receipt-request`
  - Subject: `Fixed Deposit Receipt Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: FDR details, expiry date, tender info

- **Linked Cheque Request Email**: Same as DD Step 9

---

### 3. Bank Guarantee (BG) Mode

#### Step 1: Create Payment Request
- Same as DD Step 1, but amount from `bgAmount` or `tender.emd`

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'BG'
  - `amount`: From `bgAmount`
  - `status`: 'BG_ACCOUNTS_FORM_PENDING'
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - `favouring`: From `bgFavouring`
  - `expiryDate`: From `bgExpiryDate` (converted to date)
  - `claimExpiryDate`: From `bgClaimPeriod` (converted to date)
  - `courierAddress`: From `bgCourierAddress`
  - `courierDeadline`: From `bgCourierDays` (as integer)

#### Step 3: Create BG Detail Record
- **Table**: `instrument_bg_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `bgDate`: From `bgExpiryDate` (converted to date)
  - `validityDate`: From `bgExpiryDate` (converted to date)
  - `claimExpiryDate`: From `bgClaimPeriod` (converted to date)
  - `beneficiaryName`: From `bgFavouring`
  - `beneficiaryAddress`: From `bgAddress`
  - `bankName`: From `bgBank`
  - `stampCharges`: From `bgStampValue` (converted to string)
  - `bgNeeds`: From `bgNeededIn`
  - `bgPurpose`: From `bgPurpose`
  - `bgClientUser`: From `bgClientUserEmail`
  - `bgClientCp`: From `bgClientCpEmail`
  - `bgClientFin`: From `bgClientFinanceEmail`
  - `bgBankAcc`: From `bgBankAccountNo`
  - `bgBankIfsc`: From `bgBankIfsc`
  - `bgPo`: From `bgPoFiles` (first item if array, otherwise value)

#### Step 4: Record Status History
- Same as DD Step 4, but status is 'BG_ACCOUNTS_FORM_PENDING'

#### Step 5: Update Tender Status
- Same as DD Step 7

#### Step 6: Transaction Commit
- Same as DD Step 8

#### Step 7: Send Email Notification
- **BG Request Email**:
  - Template: `bank-guarantee-request`
  - Subject: `Bank Guarantee Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: BG details, beneficiary info, expiry dates, tender info

---

### 4. Cheque Mode

#### Step 1: Create Payment Request
- Same as DD Step 1, but amount from `chequeAmount` or `tender.emd`

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'Cheque'
  - `amount`: From `chequeAmount`
  - `status`: 'Cheque_ACCOUNTS_FORM_PENDING'
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - `favouring`: From `chequeFavouring`
  - `issueDate`: From `chequeDate` (converted to date)

#### Step 3: Create Cheque Detail Record
- **Table**: `instrument_cheque_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `chequeDate`: From `chequeDate` (converted to date)
  - `chequeReason`: From `chequePurpose`
  - `chequeNeeds`: From `chequeNeededIn`
  - `bankName`: From `chequeAccount`
  - `linkedDdId`: null (unless linked to DD)
  - `linkedFdrId`: null (unless linked to FDR)

#### Step 4: Record Status History
- Same as DD Step 4, but status is 'Cheque_ACCOUNTS_FORM_PENDING'

#### Step 5: Update Tender Status
- Same as DD Step 7

#### Step 6: Transaction Commit
- Same as DD Step 8

#### Step 7: Send Email Notification
- **Cheque Request Email**:
  - Template: `cheque-request`
  - Subject: `Cheque Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: Cheque details, party name, cheque date, amount, tender info

---

### 5. Bank Transfer (BT) Mode

#### Step 1: Create Payment Request
- Same as DD Step 1, but amount from `btAmount` or `tender.emd`

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'Bank Transfer'
  - `amount`: From `btAmount`
  - `status`: 'Bank Transfer_ACCOUNTS_FORM_PENDING'
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - (No common fields set - all BT-specific fields go to detail table)

#### Step 3: Create Transfer Detail Record
- **Table**: `instrument_transfer_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `accountName`: From `btAccountName`
  - `accountNumber`: From `btAccountNo`
  - `ifsc`: From `btIfsc`
  - `reason`: From `btPurpose`

#### Step 4: Record Status History
- Same as DD Step 4, but status is 'Bank Transfer_ACCOUNTS_FORM_PENDING'

#### Step 5: Update Tender Status
- Same as DD Step 7

#### Step 6: Transaction Commit
- Same as DD Step 8

#### Step 7: Send Email Notification
- **BT Request Email**:
  - Template: `bank-transfer-request`
  - Subject: `Bank Transfer Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: Account details (name, number, IFSC), amount, tender info

---

### 6. Pay on Portal (POP) Mode

#### Step 1: Create Payment Request
- Same as DD Step 1, but amount from `portalAmount` or `tender.emd`

#### Step 2: Create Payment Instrument
- **Table**: `payment_instruments`
- **Fields Set**:
  - `requestId`: Links to payment request
  - `instrumentType`: 'Portal Payment'
  - `amount`: From `portalAmount`
  - `status`: 'Portal Payment_ACCOUNTS_FORM_PENDING'
  - `action`: 0
  - `currentStage`: 1
  - `isActive`: true
  - (No common fields set - all POP-specific fields go to detail table)

#### Step 3: Create Transfer Detail Record
- **Table**: `instrument_transfer_details`
- **Fields Set**:
  - `instrumentId`: Links to payment instrument
  - `portalName`: From `portalName`
  - `paymentMethod`: Derived from `portalNetBanking` and `portalDebitCard`
    - 'Netbanking' if `portalNetBanking === 'YES'`
    - 'Debit Card' if `portalDebitCard === 'YES'`
    - null otherwise
  - `isNetbanking`: From `portalNetBanking`
  - `isDebit`: From `portalDebitCard`
  - `reason`: From `portalPurpose`

#### Step 4: Record Status History
- Same as DD Step 4, but status is 'Portal Payment_ACCOUNTS_FORM_PENDING'

#### Step 5: Update Tender Status
- Same as DD Step 7

#### Step 6: Transaction Commit
- Same as DD Step 8

#### Step 7: Send Email Notification
- **POP Request Email**:
  - Template: `pay-on-portal-request`
  - Subject: `Portal Payment Request: {tenderNo}`
  - Recipients: Accounts team
  - Data includes: Portal name, payment method, netbanking/debit availability, amount, tender info

---

## Tender Fee and Processing Fee Flows

### Tender Fee Flow (All Supported Modes: DD, BT, POP)

The flow is identical to EMD flow, but:
- `purpose`: 'Tender Fee' instead of 'EMD'
- `amountRequired`: From `tenderFeeAmount` (non-TMS) or `tender.tenderFees` (TMS)
- **No linked Cheque creation** (only for EMD DD/FDR)
- Email templates may differ based on purpose

### Processing Fee Flow (All Supported Modes: DD, BT, POP)

The flow is identical to EMD flow, but:
- `purpose`: 'Processing Fee' instead of 'EMD'
- `amountRequired`: From `processingFeeAmount` (non-TMS) or `infoSheet.processingFeeAmount` (TMS)
- **No linked Cheque creation** (only for EMD DD/FDR)
- Email templates may differ based on purpose

---

## Special Cases

### Old Entries / Other Than Tender Requests

For these request types:
- `tenderId` is set to `0`
- `tenderNo` defaults to 'NA' if not provided
- `projectName` defaults to 'NA' if not provided (for non-TMS)
- Tender status is NOT updated (no tender to update)
- Tender status history is NOT recorded

### Multiple Payment Types in Single Request

A single form submission can create multiple payment requests:
- One EMD request (if `emd.mode` provided)
- One Tender Fee request (if `tenderFee.mode` provided)
- One Processing Fee request (if `processingFee.mode` provided)

Each request is created independently with its own:
- Payment request record
- Payment instrument record
- Detail record
- Status history entry
- Email notification

### DD/FDR Dual Request Creation

When DD or FDR is selected for EMD:
1. Primary request is created (DD or FDR)
2. Secondary request is automatically created (Cheque)
3. Cheque is linked to DD/FDR via `linkedDdId` or `linkedFdrId`
4. Both requests share the same tender details
5. Both requests trigger separate email notifications

---

## Database Tables Involved

1. **payment_requests** - Base payment request record
2. **payment_instruments** - Instrument record (common fields)
3. **instrument_dd_details** - DD-specific details
4. **instrument_fdr_details** - FDR-specific details
5. **instrument_bg_details** - BG-specific details
6. **instrument_cheque_details** - Cheque-specific details
7. **instrument_transfer_details** - BT/POP-specific details
8. **instrument_status_history** - Status change tracking
9. **tender_infos** - Tender status update (if applicable)
10. **tender_status_history** - Tender status change tracking (if applicable)

---

## Error Handling

- All operations are within a database transaction
- If any step fails, entire transaction is rolled back
- Email failures are logged but don't cause transaction rollback
- Validation errors are caught and returned before transaction starts

---

## Post-Creation Actions

After successful creation:
1. All created requests are returned to the client
2. Email notifications are sent asynchronously (outside transaction)
3. Frontend receives success response with created request IDs
4. User can view the created requests in the dashboard

---

## Field Mapping Reference

### Frontend → Backend Field Names

**DD Fields**:
- `ddAmount` → `amountRequired` (payment_requests), `amount` (payment_instruments)
- `ddFavouring` → `favouring` (payment_instruments), `beneficiaryName` (for linked cheque)
- `ddPayableAt` → `payableAt` (payment_instruments)
- `ddDeliverBy` → `ddNeeds` (instrument_dd_details), `chequeNeeds` (for linked cheque)
- `ddPurpose` → `ddPurpose` (instrument_dd_details)
- `ddCourierAddress` → `courierAddress` (payment_instruments)
- `ddCourierHours` → `courierDeadline` (payment_instruments, as integer)
- `ddDate` → `issueDate` (payment_instruments), `ddDate` (instrument_dd_details)
- `ddRemarks` → `remarks` (payment_instruments), `ddRemarks` (instrument_dd_details)

**FDR Fields**:
- `fdrAmount` → `amountRequired`, `amount`
- `fdrFavouring` → `favouring`, `beneficiaryName` (for linked cheque)
- `fdrExpiryDate` → `expiryDate` (payment_instruments), `fdrExpiryDate` (instrument_fdr_details)
- `fdrDeliverBy` → `fdrNeeds` (instrument_fdr_details), `chequeNeeds` (for linked cheque)
- `fdrPurpose` → `fdrPurpose` (instrument_fdr_details)
- `fdrCourierAddress` → `courierAddress` (payment_instruments)
- `fdrCourierHours` → `courierDeadline` (payment_instruments, as integer)
- `fdrDate` → `issueDate` (payment_instruments), `fdrDate` (instrument_fdr_details)

**BG Fields**:
- `bgAmount` → `amountRequired`, `amount`
- `bgFavouring` → `favouring` (payment_instruments), `beneficiaryName` (instrument_bg_details)
- `bgAddress` → `beneficiaryAddress` (instrument_bg_details)
- `bgBank` → `bankName` (instrument_bg_details)
- `bgExpiryDate` → `expiryDate` (payment_instruments), `bgDate` and `validityDate` (instrument_bg_details)
- `bgClaimPeriod` → `claimExpiryDate` (payment_instruments and instrument_bg_details)
- `bgNeededIn` → `bgNeeds` (instrument_bg_details)
- `bgPurpose` → `bgPurpose` (instrument_bg_details)
- `bgStampValue` → `stampCharges` (instrument_bg_details, as string)
- `bgCourierAddress` → `courierAddress` (payment_instruments)
- `bgCourierDays` → `courierDeadline` (payment_instruments, as integer)
- `bgClientUserEmail` → `bgClientUser` (instrument_bg_details)
- `bgClientCpEmail` → `bgClientCp` (instrument_bg_details)
- `bgClientFinanceEmail` → `bgClientFin` (instrument_bg_details)
- `bgBankAccountNo` → `bgBankAcc` (instrument_bg_details)
- `bgBankIfsc` → `bgBankIfsc` (instrument_bg_details)
- `bgPoFiles` → `bgPo` (instrument_bg_details, first item if array)

**Cheque Fields**:
- `chequeAmount` → `amountRequired`, `amount`
- `chequeFavouring` → `favouring` (payment_instruments)
- `chequeDate` → `issueDate` (payment_instruments), `chequeDate` (instrument_cheque_details)
- `chequeNeededIn` → `chequeNeeds` (instrument_cheque_details)
- `chequePurpose` → `chequeReason` (instrument_cheque_details)
- `chequeAccount` → `bankName` (instrument_cheque_details)

**BT Fields**:
- `btAmount` → `amountRequired`, `amount`
- `btAccountName` → `accountName` (instrument_transfer_details)
- `btAccountNo` → `accountNumber` (instrument_transfer_details)
- `btIfsc` → `ifsc` (instrument_transfer_details)
- `btPurpose` → `reason` (instrument_transfer_details)

**POP Fields**:
- `portalAmount` → `amountRequired`, `amount`
- `portalName` → `portalName` (instrument_transfer_details)
- `portalNetBanking` → `isNetbanking` (instrument_transfer_details), also used to derive `paymentMethod`
- `portalDebitCard` → `isDebit` (instrument_transfer_details), also used to derive `paymentMethod`
- `portalPurpose` → `reason` (instrument_transfer_details)
