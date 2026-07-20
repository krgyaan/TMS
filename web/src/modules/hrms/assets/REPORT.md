# Asset Management

## 1. Create New Asset

The creation form (`assignment.tsx`) serves both flows — status is selected upfront, and when `Assigned` is chosen, extra fields become required.

### 1.1 Available

| Field | Type | Required |
|---|---|---|
| `assetType` | Select | Yes |
| `assetCategory` | Select | Yes |
| `brand` | Text | Yes |
| `model` | Text | Yes |
| `assetCondition` | Select | Yes |
| `specifications` | Textarea | No |
| `purchaseDate` | Date | No |
| `purchasePrice` | Number | No |
| `purchaseFrom` | Text | No |
| `serialNumber` | Text | No |
| `imeiNumber` | Text | No (shown for Mobile/SIM only) |
| `licenseKey` | Text | No (shown for Mobile/SIM only) |
| `warrantyFrom` | Date | No |
| `warrantyTo` | Date | No |
| `accessories` | Checkbox group | No |
| `accessoryDetails` | Textarea | No |
| `purchaseInvoice` | File | No |
| `warrantyCard` | File | No |
| `assetPhotos` | File (multiple) | No |
| `assignmentForm` | File | No |
| `remarks` | Textarea | No |

### 1.2 Assign

All fields from **Available** above, plus:

| Field | Type | Required |
|---|---|---|
| `userId` | Select (Employee picker) | **Yes** |
| `assignedDate` | Date | **Yes** |
| `assetLocation` | Select | No |
| `purpose` | Textarea | No |

> **Stored in:** `hrms_employee_assets` — single INSERT. If status=Assigned, a history row is also inserted into `hrms_asset_tracking_history`.

---

## 2. Status Change

A single dynamic form (`AssetStatus.tsx`). User picks a target status card, and the relevant fields render.

### 2.1 Assign

| Field | Type | Required |
|---|---|---|
| `userId` | Select | Yes |
| `assignedDate` | Date | Yes |
| `assetLocation` | Select | No |
| `purpose` | Textarea | No |

> **DB effect:** UPDATE `user_id`, `assigned_date`, `asset_location`, `purpose`, `asset_status` = '1'

### 2.2 Available

| Field | Type | Required |
|---|---|---|
| `remarks` | Textarea | No |

> **DB effect:** UPDATE `asset_status` = '2', clear `user_id`

### 2.3 Under Repair

| Field | Type | Required |
|---|---|---|
| `repairStartDate` | Date | Yes |
| `repairEndDate` | Date | No |
| `repairVendor` | Text | No |
| `repairEstimatedCost` | Number | No |
| `repairDescription` | Textarea | No |

> **DB effect:** UPDATE `asset_status` = '3', `asset_location` = '5' (Repair Center), `damage_remarks`

### 2.4 Damage

| Field | Type | Required |
|---|---|---|
| `damageDate` | Date | Yes |
| `damageType` | Select | Yes |
| `isRepairable` | Radio | No |
| `assetCondition` | Select | No |
| `damageDescription` | Textarea | No |
| `deductionAmount` | Number | No |
| `deductionReason` | Text | No |

> **DB effect:** UPDATE `asset_status` = '4', `asset_condition`, `damage_remarks`, `deduction_amount`

### 2.5 Lost

| Field | Type | Required |
|---|---|---|
| `lostDate` | Date | Yes |
| `lostLocation` | Text | No |
| `lostCircumstances` | Textarea | No |
| `policeReportNumber` | Text | No |
| `policeReportDate` | Date | No |
| `deductionAmount` | Number | **Yes** |
| `deductionReason` | Text | No |

> **DB effect:** UPDATE `asset_status` = '5', `damage_remarks`, `deduction_amount`

### 2.6 Return

| Field | Type | Required |
|---|---|---|
| `returnDate` | Date | Yes |
| `assetCondition` | Select | Yes |
| `deductionAmount` | Number | No |
| `deductionReason` | Text | No |
| `remarks` | Textarea | No |

> **DB effect:** UPDATE `asset_status` = '6', `return_date`, `return_condition`, `deduction_amount`, clear `user_id`

**All status changes also INSERT a full snapshot into `hrms_asset_tracking_history`**, recording previous/new status, action type, changed-by user, and all status-specific fields.

---

## 3. Storage Summary

### Database

- **`hrms_employee_assets`** — single row per asset; enum fields stored as numeric strings ("1"-"6"), accessories & photos as JSONB arrays, file uploads as filenames
- **`hrms_asset_tracking_history`** — one row per status transition; wide table with nullable columns per event type

### File Storage

Uploaded to `./uploads/hrms/assets/` with naming `asset-{timestamp}-{random}{ext}`. DB stores only the filename — URL is constructed client-side as `/uploads/hrms/assets/{filename}`.

### API Endpoints

| Method | Path | Purpose | Payload |
|---|---|---|---|
| `POST` | `/assets` | Create | FormData |
| `PATCH` | `/assets/:id` | Edit | FormData |
| `PATCH` | `/assets/:id/status` | Status change | JSON |
| `GET` | `/assets` | List all | — |
| `GET` | `/assets/:id` | By ID | — |
| `GET` | `/assets/:id/details` | By ID with labels | — |
| `GET` | `/assets/:id/history` | Audit trail | — |
| `GET` | `/assets/user/:userId` | By user | — |
| `DELETE` | `/assets/:id` | Delete | — |

### Source Files

| File | Role |
|---|---|
| `web/src/modules/hrms/assets/assignment.tsx` | Create form |
| `web/src/modules/hrms/assets/AssetEdit.tsx` | Edit form |
| `web/src/modules/hrms/assets/AssetStatus.tsx` | Status change form |
| `web/src/modules/hrms/assets/dashboard.tsx` | Admin listing |
| `web/src/modules/hrms/assets/my-assets.tsx` | Employee self-service |
| `web/src/modules/hrms/assets/AssetView.tsx` | Detail view |
| `web/src/modules/hrms/assets/constants.ts` | Lookup maps |
| `api/src/modules/hrms/assets/assets.controller.ts` | REST controller |
| `api/src/modules/hrms/assets/assets.service.ts` | Business logic |
| `api/src/db/schemas/hrms/employee-assets.schema.ts` | Main table Drizzle schema |
| `api/src/db/schemas/hrms/asset-tracking-history.schema.ts` | History table Drizzle schema |
| `web/src/services/api/hrms-assets.service.ts` | Frontend API client |
| `web/src/hooks/api/useHrmsAssets.ts` | React Query hooks |

---

## 4. Proposed Enhancements

### 4.1 Type-Specific Specs (`type_specs`)

Replace the generic `specifications` free-text field with a **dynamic structured form** that shows relevant fields per `assetType`. Data stored in a new `type_specs` JSONB column on `hrms_employee_assets`.

| Asset Type | Dynamic Fields |
|---|---|
| **Laptop** | processor, processorGeneration, ram, ramType, storageType, storageSize, screenSize, operatingSystem |
| **Desktop** | processor, processorGeneration, ram, ramType, storageType, storageSize, operatingSystem, formFactor |
| **Mobile** | processor, ram, storageSize, screenSize, operatingSystem, networkType, batteryCapacity |
| **Monitor** | screenSize, resolution, refreshRate, panelType |
| **Keyboard** | keyboardType (Mechanical/Membrane), connection (USB/Bluetooth/Wireless), layout |
| **Mouse** | mouseType (Optical/Laser), connection |
| **Printer** | printType (Laser/Inkjet), color, connectivity, paperSize |
| **Vehicle** | vehicleType (Car/Motorcycle/Bicycle/Other), licensePlate, fuelType, engineCapacity, color, registrationDate, registrationExpiry, insuranceExpiry, seatingCapacity |
| **ID Card** | cardNumber, issueDate, expiryDate |
| **Access Card** | cardNumber, issueDate, expiryDate, accessLevel |
| **SIM Card** | phoneNumber, mobileNetwork, dataPlan, activationDate |
| **Other** | description (free text) |

**Benefits:**
- Enables filtering ("all laptops with 16GB+ RAM")
- Structured reporting ("average SSD size across fleet")
- Data consistency (no more "16GB/512GB" vs "512GB SSD 16GB RAM")

**Implementation:**
- Add `type_specs` JSONB column to `hrms_employee_assets`
- Create a shared field definition map keyed by asset type
- Build dynamic form component that renders fields based on selected `assetType`
- Update `assignment.tsx`, `AssetEdit.tsx` (form rendering), and `AssetView.tsx` (display)

---

### 4.2 Other Gaps

| # | Gap | Current Limitation | Proposed Fix |
|---|---|---|---|
| **G1** | **Disposal/Scrap status** | No way to retire assets permanently — damaged/lost/returned assets linger in inventory | Add status `"7": "Disposed"` with `disposalDate`, `disposalMethod` (Sold/Donated/E-Waste/Scrapped), `disposalValue`, `authorizationRef` |
| **G2** | **Depreciation tracking** | `assetValue` stored but never used; book value never calculated | Add `depreciationMethod`, `usefulLifeYears`, `salvageValue`, `nextDepreciationDate` columns; scheduled job to compute |
| **G3** | **Preventive maintenance** | Only reactive repair tracking (Under Repair / Damage statuses) | Add `maintenance_schedule` table (assetId, taskType, intervalDays, lastDoneDate, nextDueDate) + dashboard widget for upcoming maintenance |
| **G4** | **Asset hierarchy** | Accessories stored as a JSONB list of IDs — no parent-child relationship between assets | Add `parent_asset_id` FK on `hrms_employee_assets` — enables sub-asset tracking (e.g., monitor attached to a desktop) |
| **G5** | **Transfer workflow** | Reassigning asset from employee A to B requires Return → Assign (2 separate steps) | Add a single "Transfer" action: unassigns from current user, assigns to new user in one step with one history entry |
| **G6** | **Check-in/Check-out** | No flow for short-term borrowing (e.g., projector for 2 days) | Add `asset_checkouts` table (assetId, userId, checkoutDate, expectedReturnDate, actualReturnDate, conditionBefore, conditionAfter) |
| **G7** | **Edit audit trail** | `AssetEdit.tsx` updates the DB but writes **no history record** — edits to serial number, warranty, price are invisible | Insert a history row on any asset edit that changes tracked fields |
| **G8** | **Bulk operations** | Every asset must be entered manually one by one | Add CSV/Excel import endpoint + bulk status update endpoint |
| **G9** | **Notifications** | Warranty expiry (`warrantyTo`), license renewal, and overdue return dates exist but trigger nothing | Scheduled cron job + in-app notification / email for upcoming expiries and overdue returns |
| **G10** | **Approval workflow** | Any admin can assign any asset without authorization, even high-value ones | Add `asset_requests` table (requesterId, assetTypeId, reason, status, approvedBy, approvedAt) — request → approve → assign flow |
| **G11** | **Procurement linkage** | No purchase order reference or vendor management beyond free-text `purchaseFrom` | Add `purchase_order_number`, `vendor_id` FK to a new `vendors` table (name, contact, email, phone, performance rating) |
| **G12** | **TCO reporting** | Purchase cost and accumulated repair costs are never aggregated | Service method to compute total cost of ownership per asset / per model to inform future purchasing decisions |

---

### 4.3 Implementation Priority

| Priority | Gap | Effort | Value |
|---|---|---|---|
| P0 | **G1** Disposal status | Small | High — prevents inventory bloat |
| P0 | **4.1** Type-specific specs | Medium | High — enables filtering & reporting |
| P1 | **G7** Edit audit trail | Small | High — compliance & traceability |
| P1 | **G9** Notifications | Medium | High — prevents loss/warranty lapse |
| P1 | **G5** Transfer workflow | Medium | High — UX improvement |
| P2 | **G6** Check-in/out | Medium | High — covers temporary use |
| P2 | **G3** Preventive maintenance | Medium | Medium — extends asset life |
| P2 | **G8** Bulk operations | Medium | Medium — saves time on setup |
| P3 | **G4** Asset hierarchy | Medium | Medium — edge use cases |
| P3 | **G10** Approval workflow | Large | Medium — process control |
| P3 | **G2** Depreciation | Large | Medium — accounting need |
| P3 | **G11** Procurement linkage | Large | Low — operational |
| P3 | **G12** TCO reporting | Small | Low — nice to have |
