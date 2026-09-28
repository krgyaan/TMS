# Vendor Master workbook — data quality report (`tms_sheet.xlsx`)

**Source:** `tms_sheet.xlsx`, sheet `Sheet1` (the only sheet; the parser always uses the first sheet)
**Detected by:** `scripts/parseVm.ts` + `scripts/migrate-vendor-master.ts --dry-run`
**Scope:** 185 vendors (185 source rows — no repeated names), 849 non-empty GST cells → **848 GST rows** after in-row dedupe
**Supersedes:** `vendor-master-data-quality.md`, which describes `Creditor_Master.xlsx` — that workbook no longer exists in the repo. Its §7 cleanup SQL must **not** be run against the current database (see §7).

| Category | Count | Meaning |
|---|---|---|
| Parse warnings | 3 | Cell has no `(GSTIN) address` match → stored with `gst_no = NULL` |
| State code disagrees with column | 2 | GSTIN is 15 chars but its state code is not the column's |
| GSTIN length ≠ 15 | 8 | 14, 16 or 17 characters |
| **Flagged by the parser** | **13 rows** | 3 warnings + 10 anomalies → 848 − 13 = **835 clean rows** |
| Retired state code 25 | 1 | Accepted with a log note, not counted as an anomaly (§4) |
| Same GSTIN under two vendors | 9 GSTINs / 18 cells | The parser cannot see this (§5) |
| Registration duplicated across both AP columns | 2 vendors | §6 |

**Nothing is dropped.** Every value is stored exactly as found — `vendor_gsts.gst_no` is
`varchar(255)` with no format constraint. This document is the cleanup list.

---

## Reproduce

```bash
cd api
pnpm migrate:vendor-master ../tms_sheet.xlsx --dry-run
```

Runs SELECT-only, writes `migration-logs/vendor-master-dryrun-*.log.txt`, changes nothing.

> **Coordinates:** row numbers are 1-based spreadsheet rows (header is row 1, data is
> rows 2–186). Column letters are Excel column letters.

---

## Sheet layout

`Sheet1`, header row 1 (43 labelled cells), data rows 2–186, used range `A1:BR186`.
Columns `A`–`E` are scalars; every labelled column whose label matches `NAME-NN` starts a
state group and the following unlabelled columns join it.

Codes are taken from an explicit table in `parseVm.ts`, **not** from the header suffix —
the suffix is often wrong or unpadded.

| Header label | Columns | Stored `gst_state` | Stored code |
|---|---|---|---|
| `VENDER NAME` | A | — | — |
| `EMAIL` | B | — | — |
| `PHONE NO.` | C | — | — |
| `PAN NUMBER` | D | — | — |
| `MSME NO.` | E | — | — |
| `JAMMU AND KASHMIR-1` | F, G | Jammu and Kashmir | 01 |
| `HIMACHAL PRADESH-2` | H, I | Himachal Pradesh | 02 |
| `PUNJAB-3` | J, K | Punjab | 03 |
| `CHANDIGARH-4` | L, M | Chandigarh | 04 |
| `UTTARAKHAND-5` | N, O | Uttarakhand | 05 |
| `HARYANA-6` | P, Q | Haryana | 06 |
| `DELHI-7` | R, S | Delhi | 07 |
| `RAJASTHAN-8` | T, U | Rajasthan | 08 |
| `UTTAR PRADESH-9` | V, W, X | Uttar Pradesh | 09 |
| `BIHAR-10` | Y, Z | Bihar | 10 |
| `SIKKIM-11` | AA | Sikkim | 11 |
| `ARUNACHAL PRADESH-12` | AB | Arunachal Pradesh | 12 |
| `NAGALAND-13` | AC | Nagaland | 13 |
| `MANIPUR-14` | AD | Manipur | 14 |
| `MIZORAM-15` | AE | Mizoram | 15 |
| `TRIPURA-16` | AF | Tripura | 16 |
| `MEGHALAYA-17` | AG | Meghalaya | 17 |
| `ASSAM-18` | AH, AI, AJ | Assam | 18 |
| `WEST BENGAL-19` | AK, AL | West Bengal | 19 |
| `JHARKHAND-20` | AM, AN | Jharkhand | 20 |
| `ODISHA-21` | AO, AP | Odisha | 21 |
| `CHATTISGARH-22` | AQ, AR | Chattisgarh | 22 |
| `MADHYA PRADESH-23` | AS, AT, AU | Madhya Pradesh | 23 |
| `GUJARAT-24` | AV, AW | Gujarat | 24 |
| `DAMAN AND DIU-25` | AX | Daman and Diu | 26 † |
| `DADRA AND NAGAR HAVELI-26` | AY | Dadra and Nagar Haveli | 26 |
| `MAHARASHTRA-27` | AZ, BA | Maharashtra | 27 |
| `ANDHRA PRADESH-28` | BB | Andhra Pradesh (New) | 37 ‡ |
| `KARNATAKA-29` | BC, BD, BE | Karnataka | 29 |
| `GOA-30` | BF, BG | Goa | 30 |
| `LAKSHADWEEP ISLANDS-31` | BH | Lakshadweep Islands | 31 |
| `KERALA-32` | BI | Kerala | 32 |
| `TAMIL NADU-33` | BJ, BK | Tamil Nadu | 33 |
| `PONDICHERRY-34` | BL | Pondicherry | 34 |
| `ANDAMAN AND NICOBAR ISLAND-35` | BM | Andaman and Nicobar Island | 35 |
| `TELANGANA-36` | BN | Telangana | 36 |
| `ANDHRA PRADESH (NEW)-37` | BO, BP, BQ | Andhra Pradesh (New) | 37 |
| `LADAKH- 38` | BR | Ladakh | 38 |

† Header suffix is the pre-merger code 25; the parser stores the current official code 26.
‡ The legacy `-28` column and `ANDHRA PRADESH (NEW)-37` are the same state — both store
`Andhra Pradesh (New)` / `37`, which is what makes LG's byte-identical duplicate collapse (§6).

---

## 1. State code disagrees with the column — 2 cells

Both are well-formed 15-character GSTINs; only the state code is wrong for the column.

| Row | Col | Vendor | Column | Found | Expects |
|---|---|---|---|---|---|
| 17 | AK | Whirlpool of India Limited | West Bengal (19) | `18AAACW1336L2Z6` | 19 |
| 154 | AY | Sankar Das | Dadra and Nagar Haveli (26) | `27AACCT8765G1ZX` | 26 |

**Whirlpool** — the same vendor's Assam cell is `18AAACW1336L1Z7`, so `18…L2Z6` is
probably an Assam registration pasted into the West Bengal column, or a mistyped
`19…L2Z6`. Verify against the GST portal before moving it.

**Sankar Das** — the PAN portion `AACT8765G` belongs to **Transrail Lighting Limited**
(whose Maharashtra registration is `27AACCT8765G2ZW`, §5). Sankar Das is a person's
name, not a company. The cell almost certainly holds a Transrail registration mis-pasted
into this row; the true value for Sankar Das is unknown.

---

## 2. GSTIN length ≠ 15 — 8 cells

Stored exactly as found. "Address says" is the address text in the same cell — it is the
main corroboration for where the value belongs.

| Row | Col | Vendor | Column | Found | Len | Address says | Likely fix |
|---|---|---|---|---|---|---|---|
| 10 | BP | HBL Engineering Limited | Andhra Pradesh (New) | `37AAACH8421K1ZGSY` | 17 | Vizianagaram, Andhra Pradesh | column correct; trailing `SY` → `37AAACH8421K1ZG` |
| 11 | H | Blue Star Limited | Himachal Pradesh | `02AAACB4487D1Z` | 14 | Kala Amb, Himachal Pradesh | final check char missing |
| 12 | T | Havells India Limited | Rajasthan | `08AAACH0351E1Z5A` | 16 | Alwar, Rajasthan | trailing `A` → `08AAACH0351E1Z5` |
| 19 | W | Daikin Airconditioning India Pvt Ltd | **Uttar Pradesh** | `09AABCD0971F1C` | 14 | **Patna, Bihar** | truncated **and in the wrong column** — see below |
| 19 | AM | Daikin Airconditioning India Pvt Ltd | Jharkhand | `20AABCD0971F1ZA3` | 16 | Ranchi, Jharkhand | trailing `3` → `20AABCD0971F1ZA` |
| 19 | AS | Daikin Airconditioning India Pvt Ltd | Madhya Pradesh | `37AABCD0971F2ZU4` | 16 | Indore, Madhya Pradesh | trailing `4`, **and the leading `37` is Andhra Pradesh, not 23** |
| 64 | AS | Dee Key Yes Associates | Madhya Pradesh | `23AAACT2688L1Z` | 14 | Singrauli, Madhya Pradesh | check char missing; same PAN as Statcon Energiaa (§5) |
| 86 | BO | ICICI Lombard General Insurance Co. Ltd | Andhra Pradesh (New) | `37AACI7904G1ZM` | 14 | Visakhapatnam, Andhra Pradesh | final check char missing |

**Row 19 col W is the worst one.** The address is Patna, Bihar, but the cell sits in the
Uttar Pradesh group — and Daikin has **no Bihar cell at all**. So the registration is
both truncated and filed under the wrong state. Because the leading `09` matches the UP
column, the parser reports only the length problem, not a state mismatch.

Row 19 col AS carries the same kind of hidden state error: `37…` in a `23` column. The
parser checks the state code only for 15-character values, so this one is reported as a
length problem only.

---

## 3. Parse warnings — 3 cells (`gst_no` stored as `NULL`)

The cell does not match `(GSTIN) address` at all, so the whole cell text is stored as the
address and `gst_no` is `NULL`.

| Row | Col | Vendor | Column | Cell text |
|---|---|---|---|---|
| 19 | V | Daikin Airconditioning India Pvt Ltd | Uttar Pradesh | `((09AABCD0971F1ZU) 5th Floor, 502A, B , 503 & 504, Shalimar Iridium…` |
| 19 | AL | Daikin Airconditioning India Pvt Ltd | West Bengal | `19AABCD0971F1C4 )37/2, Block Gn, 7th Floor, Smart Works Business Centre…` |
| 23 | V | Adarsh Kumar Verma | Uttar Pradesh | `Nagar Panchayat Sewrahi, Javahar Nagar, Ward 12, Tamkuhi Road, Sewrahi…` |

- **Daikin V** — doubled opening parenthesis. Recoverable: `09AABCD0971F1ZU` (15 chars, code 09 = UP, matches the column).
- **Daikin AL** — space before the closing parenthesis. Recoverable: `19AABCD0971F1C4` (15 chars, code 19 = West Bengal, matches the column).
- **Adarsh Kumar Verma** — there is no GSTIN in the cell, only an address, so nothing can
  be recovered. The row also looks like a person's name rather than a business; decide
  whether this vendor belongs in the master at all.

Note that row 19 (Daikin) also appears three times in §2 — one spreadsheet row produces
several GST rows, and these are separate rows in the 848.

---

## 4. Retired state code — 1 cell (accepted with a note)

| Row | Col | Vendor | Column | Value |
|---|---|---|---|---|
| 5 | AX | Voltas Limited | Daman and Diu | `25AAACV2809D1ZQ` |

Code 25 was retired when Daman and Diu merged into code 26. The parser accepts it (so
pre-merger registrations are not rejected) and logs
`[Voltas Limited] Daman and Diu: GSTIN "25AAACV2809D1ZQ" uses retired state code 25
(the territory now files under 26) - accepted, but verify against the GST portal`.
It is a note, not an anomaly.

---

## 5. Same GSTIN under two different vendors — 9 GSTINs, 18 cells

The parser dedupes per vendor row, so it cannot see this. Every cell below is otherwise
well-formed (15 chars, state code matches its column), which is why none of them appear
in §1–§3.

| GSTIN | Vendor A | Vendor B |
|---|---|---|
| `07AAACT2688L2ZV` | Statcon Energiaa Pvt Ltd — row 9 R (Delhi) | Dee Key Yes Associates — row 64 R (Delhi) |
| `09AAACT2688L1ZS` | Statcon Energiaa Pvt Ltd — row 9 V (UP) | Dee Key Yes Associates — row 64 V (UP) |
| `19AAACT2688L1ZR` | Statcon Energiaa Pvt Ltd — row 9 AK (WB) | Dee Key Yes Associates — row 64 AK (WB) |
| `09CUQPK3638G1Z6` | Kundli Enterprises — row 102 V (UP) | KV Fire Chemicals India Pvt Ltd — row 103 V (UP) |
| `21AAACI1681G1DA` | Indian Oil Corporation Ltd — row 87 AO (Odisha) | ICICI Lombard — row 86 AP (Odisha) |
| `24DEQPS6678R1Z1` | A One Air Conditioners — row 21 AV (Gujarat) | Manish Devishankar Sharma — row 109 AV (Gujarat) |
| `29AAACP8227F1ZC` | Power Build Batteries Pvt Ltd — row 15 BC (Karnataka) | Ned Energy Ltd — row 123 BC (Karnataka) |
| `36AAACP8227F1ZH` | Power Build Batteries Pvt Ltd — row 15 BN (Telangana) | Ned Energy Ltd — row 123 BN (Telangana) |
| `32AAACW1336L1ZH` | Whirlpool of India Ltd — row 17 BI (Kerala) | Daikin — row 19 BI (Kerala) |

Patterns:

- **Statcon Energiaa / Dee Key** share three registrations and the same PAN `AAACT2688L`
  — one row is a rename or a copy of the other.
- **ICICI / Indian Oil** — ICICI's row holds an Indian Oil GSTIN in `AP`, alongside
  ICICI's own Odisha registration (`21AAACI7904G1ZZ` in `AO`), so it is a stray paste.
- **Daikin's Kerala cell is Whirlpool's** — Daikin has no Kerala registration of its own.
- **A One Air Conditioners / Manish Devishankar Sharma** — a person's name and a company
  sharing one GSTIN.
- **Ned Energy / Power Build** share both their registrations (same PAN `AAACP8227`).

Because the migration keys GST rows on `(org, gst_state, gst_no)`, all 18 are inserted —
two organisations end up pointing at the same registration.

---

## 6. Registration duplicated across both AP columns — 2 vendors

Both `ANDHRA PRADESH-28` (BB) and `ANDHRA PRADESH (NEW)-37` (BO) now store the same
state, so identical cells collapse.

| Row | Vendor | BB | BO | Result |
|---|---|---|---|---|
| 3 | LG Electronics India Ltd | `(37AAACL1745Q1Z3) 1st and 2nd Floor, 48/18/8A, ANR Complex…` | same text | **byte-identical → dedupe collapses 2 cells into 1** (this is the 849 → 848 step) |
| 2 | Haier Appliances India Pvt Ltd | `(37AABCH3162L1ZH) D No-11-40A, Nuzuvid Main Road, Nunna, Vijayawada Rural…` | `(37AABCH3162L1ZH) 13-461/2, 1st Floor, Teachers Colony, Revenue Ward No.17…` | **different addresses → parser keeps both** |

Haier's two entries are then both **skipped** by the migration: its dedupe key is
`orgId|gstState|gstNo` (`migrate-vendor-master.ts:37`, `:245`) and does not include the
address, so only one row per GSTIN can ever exist. Whichever address the database
already holds wins; the other is silently never stored.

---

## 7. Impact on the migration

### Dry run against the current database

```
Parsed 185 vendors (deduped by name) from "../tms_sheet.xlsx".
Organizations: 0 insert, 185 update
Contacts:      0 insert, 185 update
GST rows:      8 insert, 840 skipped (already present)
```

840 + 8 = **848**, matching the parse. Every one of the 185 names already exists, so the
run only refreshes them.

### Current database (before any run)

| Check | Value |
|---|---|
| `vendor_organizations` | 481 |
| `vendors` (contacts) | 516 |
| `vendor_gsts` | 926 |
| `gst_no IS NULL` | 3 — Daikin WB, Daikin UP (§3) and Hari Om Electrical / Tamil Nadu (`address = 'v'`, a junk cell from the previous export) |
| `gst_no ~ '^9'` | 8 |
| `gst_state = 'Andhra Pradesh'` | 2 — Haier, LG (§6) |
| `gst_state = 'Andhra Pradesh (New)'` | 33 |
| fails the 15-char GSTIN shape | 36 |

### Where the 8 new GST rows come from

A key-level diff of the 926 database rows against the 848 parsed rows accounts for all
**87** rows with no counterpart:

| Class | Rows | Detail |
|---|---|---|
| Stale leading-`9` GSTINs | **7** | The previous export had `(` mis-typed as `9`; this export fixed them, so the clean twin now inserts while the bad row is orphaned: Go Digit/Bihar `910…`, ICICI/Manipur `914…`, Indian Oil/Odisha `921…`, Indian Oil/Andaman `935…`, Retailez/Rajasthan `908…`, Spacelance/Gujarat `924…`, Spacelance/Karnataka `929…` |
| Stale legacy-AP rows | **2** | Haier and LG under `gst_state = 'Andhra Pradesh'`; the same GSTINs now exist under `Andhra Pradesh (New)` |
| Not in this workbook | **78** | 56 hold a well-formed GSTIN, 22 are junk/test values (`blue box`/`test`/`test`, `volks`/`dl`/`78687YGYU`, `statcon electronics`/`new delhi`/`sdffd23456432`, `1234567890`, …). They are unrelated to this export and are left alone. |

Plus the genuinely new row: **Adarsh Kumar Verma / Uttar Pradesh** (§3).

So the 8 inserts are: 7 clean twins of the stale leading-`9` rows + Adarsh Kumar Verma.
The 8 leading-`9` rows in the database are those 7 plus Trontek Group's
`98765456787654567`, which is unrelated junk.

### Expected state right after running the migration

| Check | Before | After |
|---|---|---|
| `vendor_gsts` total | 926 | **934** |
| `gst_no IS NULL` | 3 | **4** (+ Adarsh) |
| `gst_no ~ '^9'` | 8 | 8 (the 7 stale rows are not removed by the migration) |
| fails the GSTIN shape | 36 | 36 |
| `gst_state = 'Andhra Pradesh'` | 2 | 2 (now orphans) |
| `gst_state = 'Andhra Pradesh (New)'` | 33 | 33 |
| `gst_state = 'Dadra and Nagar Haveli'` | 10 | 10 |
| West Bengal with `gst_no LIKE '18%'` | 1 | 1 (Whirlpool, §1) |
| `gst_no LIKE '25%'` | 1 | 1 (Voltas, §4) |

---

## 8. Cleaning up after import

Run these **after** `pnpm migrate:vendor-master ../tms_sheet.xlsx`. Rollback first if the
migration itself was wrong — a manifest can only be undone once and only before manual
edits:

```bash
# preview — prints what it would undo, changes nothing
pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson

# actually undo it
pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson --confirm
```

### 8.1 Stale leading-`9` rows — 7 rows, safe

Safe **only after** the migration has inserted the clean twins (§7); before that it
would delete the only copy of those registrations. Row counts verified against the live
database.

```sql
DELETE FROM vendor_gsts
WHERE gst_no ~ '^9[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$'
  AND org_id IN (
    SELECT id FROM vendor_organizations WHERE name IN (
      'Go Digit General Insurance Limited',
      'ICICI Lombard General Insurance Co. Ltd',
      'Indian Oil Corporation Limited',
      'Retailez Private Limited',
      'Spacelance Office Solutions Private Limited'
    )
  );
-- expect 7 rows (the regex excludes Trontek Group's 98765456787654567)
```

### 8.2 Stale legacy-AP rows — 2 rows, safe

The same GSTINs already exist under `Andhra Pradesh (New)`.

```sql
DELETE FROM vendor_gsts WHERE gst_state = 'Andhra Pradesh';
-- expect 2 rows (Haier, LG)
```

### 8.3 Hari Om Electrical junk cell — 1 row, safe

The old export stored the single character `v` as the address with no GSTIN. This
workbook has no such cell, so the row is orphaned.

```sql
DELETE FROM vendor_gsts
WHERE gst_no IS NULL AND gst_state = 'Tamil Nadu' AND address = 'v';
-- expect 1 row
```

### 8.4 Recoverable nulls — 2 rows

```sql
UPDATE vendor_gsts SET gst_no = '09AABCD0971F1ZU'
WHERE gst_no IS NULL AND gst_state = 'Uttar Pradesh'
  AND org_id = (SELECT id FROM vendor_organizations
                WHERE name = 'Daikin Airconditioning India Private Limited');
UPDATE vendor_gsts SET gst_no = '19AABCD0971F1C4'
WHERE gst_no IS NULL AND gst_state = 'West Bengal'
  AND org_id = (SELECT id FROM vendor_organizations
                WHERE name = 'Daikin Airconditioning India Private Limited');
-- expect 1 row each
```

Adarsh Kumar Verma (§3) has no GSTIN to recover — keep the `NULL` or delete the row.

### 8.5 Needs verification first — do not run blind

- **§1** Whirlpool (`18…L2Z6` in West Bengal) and Sankar Das (`27…1ZX` in Dadra and
  Nagar Haveli) — both look like another vendor's registration pasted into the wrong
  row. Confirm on the GST portal before moving or deleting.
- **§2** the 8 length anomalies — the "likely fix" column is inferred from the address
  text and sibling cells, not from the portal. Row 19 col W (Daikin, Patna address in
  the UP column) and row 19 col AS (`37…` in a Madhya Pradesh column) also need a state
  decision, not just a character trimmed.
- **§5** the 9 shared GSTINs — decide which organisation owns each registration before
  deleting anything; two organisations currently reference the same row key pattern.
- **§6** Haier — decide which of the two addresses is authoritative, since only one can
  be stored.

### 8.6 Verification

After 8.1–8.3 (the deletions), before 8.4:

```sql
SELECT count(*)                                                    AS total,
       count(*) FILTER (WHERE gst_no IS NULL)                      AS nulls,
       count(*) FILTER (WHERE gst_no ~ '^9')                       AS leading9,
       count(*) FILTER (WHERE gst_no IS NOT NULL
                          AND gst_no !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$') AS bad_shape,
       count(*) FILTER (WHERE gst_state = 'Andhra Pradesh')        AS legacy_ap,
       count(*) FILTER (WHERE gst_state = 'Andhra Pradesh (New)')  AS ap_new,
       count(*) FILTER (WHERE gst_state = 'Dadra and Nagar Haveli') AS dnh,
       count(*) FILTER (WHERE gst_state = 'West Bengal'
                          AND gst_no LIKE '18%')                   AS wb_code18,
       count(*) FILTER (WHERE gst_no LIKE '25%')                   AS daman25
FROM vendor_gsts;
```

| total | nulls | leading9 | bad_shape | legacy_ap | ap_new | dnh | wb_code18 | daman25 |
|---|---|---|---|---|---|---|---|---|
| 924 | 3 | 1 | 29 | 0 | 33 | 10 | 1 | 1 |

Derivation: 934 (after the migration) − 7 (8.1) − 2 (8.2) − 1 (8.3) = **924**;
`bad_shape` 36 − 7 = **29**; `leading9` 8 − 7 = **1** (Trontek's junk); `nulls` 4 − 1 = **3**.

`nulls` should fall to **1** after 8.4 (only Adarsh left). `wb_code18`, `daman25`,
`legacy_ap`, the 8 length anomalies and the 9 shared GSTINs stay until §8.5 is resolved.
If `total`, `nulls` or `leading9` do not match, stop and inspect before touching anything
else.

---

## 9. Note on the source workbook

- One sheet, `Sheet1`, 185 rows with a vendor name, **185 distinct names** — no repeated
  rows, so nothing is merged away (the old workbook merged 512 → 424 and could silently
  drop a later row's email or phone).
- Field coverage: email **143/185**, phone **176/185**, PAN **183/185**, MSME **52/185**.
- The old second `EMAIL`/`PHONE NO.`/`PAN NUMBER` block (`BX`–`CA`) is gone — the export
  now carries those fields only in `B`/`C`/`D`.
- The 7 leading-`9` cells and the Hari Om Electrical Tamil Nadu junk cell (`v`) are
  fixed or absent in this export; the surviving problems are the ones in §1–§5.
- **`tms_sheet.xlsx` sits untracked at the repo root** and contains 185 vendors' emails,
  phone numbers and PANs — the root `.gitignore` now excludes `*.xlsx`.
- `Creditor_Master.xlsx` no longer exists; it was renamed to `tms_sheet.xlsx`.
