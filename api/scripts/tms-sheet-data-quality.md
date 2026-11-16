# Vendor Master workbook (`tms_sheet.xlsx`) — VM sheet report

**Source:** `tms_sheet.xlsx`, worksheet **`VM`**
**Detected by:** `scripts/parseVm.ts` + `scripts/migrate-vendor-master.ts --dry-run`
**Scope:** 320 vendor rows, 320 distinct names, 38 GST state columns.

The other worksheets (`Sheet2`, `Sheet3`) are not used by the importer. `VM` has the
header on **row 2**; data starts on **row 3**.

## Reproduce

```bash
cd api
pnpm migrate:vendor-master ../tms_sheet.xlsx --sheet VM --dry-run
```

Runs SELECT-only and writes a report to `migration-logs/vendor-master-dryrun-*.log.txt`.

## Sheet layout

| Column | Field | Notes |
|---|---|---|
| A | SR. NO. | ignored |
| B | Category | 12 category values |
| C | VENDER NAME | organization name |
| D | EMAIL | primary contact email |
| E | PHONE NO. | primary contact mobile |
| F | PAN NUMBER | validated against GSTIN-embedded PAN |
| G | REGISTRATION TYPE | `REGULAR` / `UNREGISTERED` |
| H | BILL CREDIT PERIOD | stored as days |
| I | CREDIT AMOUNT | `Lakh` / `Cr.` converted to INR |
| J | MSME TYPE | `Micro` / `Small` / `Medium` |
| K | MSME NO. | `NON-MSME` becomes `NULL` |
| L | MAJOR ACTIVITY | normalized to Manufacturing / Services / Trading / Services (Trading) |
| M | Bank details | parsed into `vendor_accs` |
| N–CF | GST state columns | one or more registrations per state |
| CG | INVOICE | values are addresses → `vendor_organizations.address` |

GST state codes are taken from the explicit table in `parseVm.ts`, not from the
unpadded header suffixes.

## Data quality

| Category | Count | Handling |
|---|---|---|
| Duplicate names | 0 | none |
| Duplicate PAN / email / phone / shared GSTIN groups | 0 | none |
| Non-15-character GST cells | 4 | see below |
| PAN mismatches | 5 | 4 auto-corrected, 1 flagged |
| Bank details filled | 54 | 52 parsed, 2 skipped |
| Non-standard MSME number | 1 | stored as-is and flagged |

### Non-15-character GST cells

| Row | Vendor | Value | Handling |
|---|---|---|---|
| 7 | Adarsh Kumar Verma | address only | `gst_no = NULL`, address kept |
| 13 | Air India Ltd. | `919AACCN6194P1ZM` | corrected to `19AACCN6194P1ZM` |
| 114 | Hari Om Electrical | `v` | skipped |
| 264 | Spicejet Ltd. | address only | `gst_no = NULL`, address kept |

### PAN corrections

The GSTIN-embedded PAN is trusted when every valid GSTIN agrees.

| Row | Vendor | Column PAN | Corrected PAN |
|---|---|---|---|
| 67 | Central Warehousing Corp. | `AAECI9589F` | `AAACC1206D` |
| 174 | Mistcold Sales & Services | `AACM3427E1` | `AAACM3427E` |
| 177 | Mount Service Point | `DRPM6228L1` | `DGRPM6228L` |
| 195 | Om Jee Electric & Automations | `AADC03979N` | `AADCO3979N` |
| 253 | Shinobies | `CELB63743D` | flagged for review (GSTIN PAN `CELPB6073D`) |

### Bank details

- 54 filled rows; 52 parsed into `vendor_accs` (`bankAccountName`, `accountNum`,
  `ifscCode`, `branch`, `swiftCode`).
- Havells India: bank column contains an address → skipped.
- Waves Aircon: value is `no` → skipped.
- Existing bank accounts are not overwritten; matching is by organization + account number.

### Other normalization

- `Regular` → `REGULAR`
- `MICRO` / `SMALL` → `Micro` / `Small`
- `Mnaufacturing` / `Manufactuirng` → `Manufacturing`
- `30  DAYS` → `30`
- `15 Lakh` → `1500000`
- `1 Cr.` → `10000000`
- `Trading` → `msmeType = T`
- `Classic Air Conditioning Co.` MSME number `DL08D0009910` is stored as-is and flagged.

## Migration behaviour

- Organizations are matched by `lower(btrim(name))`; no duplicate DB organizations are
  created.
- Existing contacts are **never overwritten**; a contact is inserted only when the
  organization has none.
- GST rows are insert-only and deduped by `(state, gstNo)`.
- Bank accounts are insert-only and deduped by `(org, account number)`.
- Every write is recorded in the manifest for rollback, including `vendor_accs`.
