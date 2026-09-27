# Vendor Master workbook — data quality report

**Source:** `Creditor_Master.xlsx`, sheet `VM`
**Detected by:** `scripts/parseVm.ts` + `scripts/migrate-vendor-master.ts --dry-run`
**Scope:** 424 vendors parsed (deduped by name), 903 non-empty GST cells

| Category | Count | Meaning |
|---|---|---|
| Parse warnings | 3 | Cell does not match `(GSTIN) address` at all → stored with `gst_no = NULL` |
| State/column mismatch | 4 | GSTIN is 15 chars but its state code disagrees with its column |
| `(` mis-typed as `9` | 7 | Missing/wrong opening paren → 16-char GSTIN that parses to garbage |
| Extra trailing character | 4 | GSTIN is 16–17 chars with a valid-looking prefix |
| Truncated GSTIN | 4 | GSTIN is 14 chars — final check character missing |
| **Total flagged** | **22** | |

**Nothing is dropped.** Every value above is stored exactly as found in the workbook —
`vendor_gsts.gst_no` accepts `varchar(255)`, so malformed values land in the database
intact. This document is the record of what needs correcting afterwards.

---

## Reproduce

```bash
cd api
pnpm migrate:vendor-master ../Creditor_Master.xlsx --dry-run
```

Runs SELECT-only. Writes a report to `migration-logs/vendor-master-dryrun-*.log.txt`,
makes no database changes.

> **Sheet coordinates:** row numbers below are 1-based spreadsheet rows (header rows
> are 1–2, data starts at row 3). Column letters are Excel column letters.

---

## 1. `(` mis-typed as `9` — 7 cells (high confidence)

The cell text starts with `9` where `(` was intended. `9` and `(` share a key, so this
is a dropped shift key. Read as `9…`, the GSTIN is 16 characters; read with the `9`
corrected to `(`, it is a valid 15-character GSTIN **whose state code matches the column
it sits in, in all 7 cases.**

| Row | Col | Vendor | State column | Found | Corrected |
|---|---|---|---|---|---|
| 82 | AD | Go Digit General Insurance Limited | Bihar | `910AACCO4128Q1ZF` | `10AACCO4128Q1ZF` |
| 87 | AI | ICICI Lombard General Insurance Co. Ltd | Manipur | `914AAACI7904G1ZU` | `14AAACI7904G1ZU` |
| 88 | AT | Indian Oil Corporation Limited | Odisha | `921AAACI1681G1DA` | `21AAACI1681G1DA` |
| 88 | BR | Indian Oil Corporation Limited | Andaman & Nicobar | `935AAACI1681G1ZS` | `35AAACI1681G1ZS` |
| 146 | Y | Retailez Private Limited | Rajasthan | `908AALCR3173P1ZN` | `08AALCR3173P1ZN` |
| 162 | BA | Spacelance Office Solutions Pvt Ltd | Gujarat | `924AAZCS2065D1Z6` | `24AAZCS2065D1Z6` |
| 162 | BH | Spacelance Office Solutions Pvt Ltd | Karnataka | `929AAZCS2065D1ZW` | `29AAZCS2065D1ZW` |

**Why it parses wrong:** the regex in `parseVm.ts` allows an *optional* `(`, so it
matches `910AACCO4128Q1ZF` as the token and captures all 16 characters. No warning is
raised — this class is only caught by the length check.

**Corroboration.** Several corrected values sit exactly on a check-digit sequence built
from neighbouring cells of the same vendor (same PAN, adjacent state codes):

- ICICI: `13…1ZW`, **`14…1ZU`**, `15…1ZS` — step of 2
- Retailez: `07…1ZP`, **`08…1ZN`**, `09…1ZL` — step of 2
- Indian Oil: `34…1ZU`, **`35…1ZS`**, `36…1ZQ` — step of 2

The address in each cell matches the state too (Patna→Bihar, Imphal→Manipur,
Bhubaneswar→Odisha, Port Blair→Andaman, Jaipur→Rajasthan, Ahmedabad→Gujarat,
Bengaluru→Karnataka).

---

## 2. Extra trailing character — 4 cells

| Row | Col | Vendor | State column | Found | Likely correct | Confidence |
|---|---|---|---|---|---|---|
| 13 | Y | Havells India Limited | Rajasthan | `08AAACH0351E1Z5A` | `08AAACH0351E1Z5` | High |
| 20 | AR | Daikin Airconditioning India Pvt Ltd | Jharkhand | `20AABCD0971F1ZA3` | `20AABCD0971F1ZA` | High |
| 11 | BU | HBL Engineering Limited | Andhra Pradesh (New) | `37AAACH8421K1ZGSY` | `37AAACH8421K1ZG` | Medium |
| 20 | AX | Daikin Airconditioning India Pvt Ltd | Madhya Pradesh | `37AABCD0971F2ZU4` | *see note* | n/a |

Dropping the surplus character(s) yields 15 characters with a state code that matches
the column (except Daikin/MP — below).

**Havells.** Check-digit sequence across the same PAN: `05…1ZB`, `06…1Z9`, `07…1Z7`,
`08…1Z5`, `09…1Z3` — descending by 2. `08AAACH0351E1Z5` fits. Address (Alwar,
Rajasthan) matches the column.

**HBL.** Two extra characters with no obvious origin; the prefix `37AAACH8421K1ZG`
is structurally sound and state code 37 matches Andhra Pradesh (New). Address
(Vizianagaram, AP) confirms the column. **Verify against the portal** — HBL already has
a valid `37AAACH8421K2ZF` one column to the left (row 11, col BT) for a
different address (Duvvada, Visakhapatnam), so this is a second AP registration, not a
duplicate.

> **Daikin / Madhya Pradesh — special case.**
> `37AABCD0971F2ZU4` sits in the MP column (expects state `23`) but carries state `37`.
> Stripping the trailing `4` gives `37AABCD0971F2ZU`, which is **byte-identical to
> Daikin's Andhra Pradesh (New) entry** at row 20, col BV — whose address is
> Vijayawada, AP. The MP cell's address is Indore, MP.
>
> Conclusion: this cell holds a copy of the AP registration plus a stray character,
> not a Madhya Pradesh GSTIN. **Daikin's MP registration appears to be absent from the
> workbook.** Correcting the length alone would create a duplicate AP GSTIN filed
> under Madhya Pradesh. Needs the real MP GSTIN to be supplied.

---

## 3. State code disagrees with column — 4 cells

The GSTIN is a valid 15-character value; the problem is *where it sits*.

### 3a. Sankar Das — cell is in the wrong column (high confidence)

| Row | Col | Column label | GSTIN | State code | Address |
|---|---|---|---|---|---|
| 155 | BD | Dadra and Nagar Haveli (expects `26`) | `27AACCT8765G1ZX` | `27` = Maharashtra | Deoli, **Wardha, Maharashtra** 442101 |

State code and address both say Maharashtra; only the column says Dadra and Nagar
Haveli. This is Sankar Das's **only** GST cell, so if left alone the database records a
Maharashtra address under state "Dadra and Nagar Haveli".

**Fix:** move to the Maharashtra column (row 155, col BE/BF), or set `gst_state = 'Maharashtra'`
after import.

### 3b. Haier and LG — one registration duplicated across two columns

Both vendors hold the **same GSTIN** in the legacy *Andhra Pradesh* column (expects
state `28`) and in *Andhra Pradesh (New)* (state `37`). State `37` is the current code
for Andhra Pradesh; `28` is the pre-2017 code. The GSTINs are correct — the workbook
layout is what is wrong.

| Row | Col 58 (`AP`, expects `28`) | Col 71 (`AP (New)`, expects `37`) |
|---|---|---|
| 3 | `37AABCH3162L1ZH` — Vijaywada Rural, NTR | `37AABCH3162L1ZH` — Kanuru, NTR |
| 4 | `37AAACL1745Q1Z3` — Vijayawada, Krishna | `37AAACL1745Q1Z3` — *identical address* |

Dedupe keys on `(gst_state, gst_no, address)`, and the two columns carry different
`gst_state` labels, so **both copies are inserted — 2 rows per vendor for 1
registration.** LG's pair is identical apart from the label; Haier's pair has two
different addresses for one GSTIN (a GSTIN has one registered address, so one of the
two is wrong).

**Fix:** delete the col-58 copies after import and keep `gst_state = 'Andhra Pradesh (New)'`,
or vice versa — but keep exactly one, and confirm which Haier address is current.

### 3c. Whirlpool — likely a one-digit typo (verify)

| Row | Col | Column | GSTIN | State code | Address |
|---|---|---|---|---|---|
| 18 | AP | West Bengal (expects `19`) | `18AAACW1336L2Z6` | `18` = **Assam** | Salt Lake, **Kolkata, West Bengal** 700091 |

Whirlpool's Assam column (row 18, col AM) already holds a distinct Assam GSTIN,
`18AAACW1336L1Z7` (Dispur, Assam). So `…2Z6` is not a second Assam office by accident —
it has a Kolkata address and belongs under West Bengal.

Most likely `18` should be `19`: `19AAACW1336L2Z6`. **Not verifiable from the workbook
alone — confirm on the GST portal before correcting.**

---

## 4. Truncated GSTIN — 4 cells (14 characters)

One character short. The missing character is a **check digit, which cannot be
recomputed from the data available here** — it must come from the GST portal or the
vendor.

| Row | Col | Vendor | State column | Found | State / address agree? |
|---|---|---|---|---|---|
| 12 | M | Blue Star Limited | Himachal Pradesh | `02AAACB4487D1Z` | Yes — Kala Amb, Sirmaur, HP |
| 65 | AX | Dee Key Yes Associates | Madhya Pradesh | `23AAACT2688L1Z` | Yes — Singrauli, MP |
| 87 | BT | ICICI Lombard General Insurance | Andhra Pradesh (New) | `37AACI7904G1ZM` | Yes — Visakhapatnam, AP |
| 20 | AB | Daikin Airconditioning | *Uttar Pradesh* | `09AABCD0971F1C` | **No — see below** |

> **Daikin row 20, col AB is a second problem.** The cell sits in the *Uttar Pradesh*
> column and carries state code `09`, but its address is
> *"54th Floor, Office No-405, Rakhi Complex, Ashiana Digha Road, **Patna, Bihar**,
> and Daikin has **no GST registration in the Bihar column (AD) — the cell is `N/A`**.
>
> So this is a Bihar registration misfiled under Uttar Pradesh *and* truncated.
> Expected form is `10AABCD0971F1C?` in column AD. Daikin's other UP entry
> (`09AABCD0971F1C5`, col AC, Lucknow) is valid and unaffected.

---

## 5. Parse warnings — 3 cells (`gst_no` stored as `NULL`)

The regex never matches, so no GSTIN is extracted and the **whole cell string is stored
as `address`**. These rows are recoverable.

### 5.1 Daikin — doubled opening parenthesis

- **Row 20, col AA**, Uttar Pradesh
- Found: `((09AABCD0971F1ZU) 5th Floor, 502A, B , 503 & 504, Shalimar Iridium, …, Lucknow, Uttar Pradesh, 226010`
- Two `(` characters; the regex anchors on the first and finds no digit to follow.

**Fix:** delete one `(` → `09AABCD0971F1ZU` (valid 15 chars, state `09` = UP, address
matches). Note this is a *distinct* registration from Daikin's other UP entry
`09AABCD0971F1C5` (different building — Shalimar Iridium vs Shalimar Titanium) — both
are real, so keep both.

### 5.2 Daikin — space before closing parenthesis

- **Row 20, col AQ**, West Bengal
- Found: `19AABCD0971F1C4 )37/2, Block Gn, 7th Floor, Smart Works Business Centre
  Private Limited, Block C, Sector-V, Salt Lake, Kolkata, West Bengal, 700091`
- The regex requires `)` to immediately follow the token; the space breaks it.

**Fix:** remove the space → `19AABCD0971F1C4` (valid 15 chars, state `19` = West
Bengal, address matches).

### 5.3 Hari Om Electrical — junk cell

- **Row 85, BO**, Tamil Nadu
- Found: `v` — a single stray character, no GSTIN and no address.

**Fix:** clear the cell. Until then the import creates a `vendor_gsts` row with
`gst_no = NULL` and `address = 'v'`.

---

## 6. Impact on the migration

| | |
|---|---|
| Vendors parsed | 424 (512 source rows, 88 names repeated) |
| GST rows that will be inserted | 903 |
| Rows needing correction | 22 |
| Rows dropped by the migration | 0 |

Breakdown of the 903 rows to be inserted:

- **881** clean
- **3** with `gst_no = NULL` (section 5) — address holds the unparseable cell text
- **19** with a malformed `gst_no` (sections 1–4), of which **2** (Haier, LG) are also
  duplicate registrations already counted here (section 3b)

22 distinct rows are flagged: 3 warnings + 19 anomalies. 903 − 22 = 881.

Corrections are **not** applied by the migration. `vendor_gsts.gst_no` is
`varchar(255)` with no length or format constraint, so nothing is rejected — the bad
values are stored and this document is the cleanup list.

---

## 7. Cleaning up after import

Run these **after** `pnpm migrate:vendor-master ../Creditor_Master.xlsx`. If you
decide the migration itself was wrong, roll it back first — the rollback manifest can
only be used once and must be used before manual edits:

```bash
# preview — prints what it would undo, changes nothing
pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson

# actually undo it
pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson --confirm
```

Rows touched by some other process since the migration are skipped rather than
clobbered (they show up as `skipped (modified since)`), and a manifest can only be
rolled back once — a `.rolled-back` marker is written next to it.

### 7.1 Section 1 — `(` mis-typed as `9` (7 rows, safe)

```sql
UPDATE vendor_gsts SET gst_no = substring(gst_no FROM 2)
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
```

The pattern is a full GSTIN shape prefixed with a stray `9` — state code, PAN, entity,
`Z`, check character. It matches **exactly 7** rows (verified against the parsed values)
and cannot match a legitimate GSTIN, because valid state codes run `01`–`38`.
A simpler-looking `^9[0-9]{14}$` matches **0** rows: these GSTINs contain letters, not
digits.

Expect `UPDATE 7`.

### 7.2 Section 5.1 / 5.2 — recover the 2 Daikin GSTINs (safe)

```sql
-- Daikin: split the GSTIN out of the address field
UPDATE vendor_gsts
SET gst_no  = substring(address FROM '\(? *([0-9A-Z]{15}) *\)'),
    address = substring(address FROM '\) *(.*)$')
WHERE gst_no IS NULL
  AND address ~ '[0-9A-Z]{15}'
  AND org_id IN (SELECT id FROM vendor_organizations WHERE name = 'Daikin Airconditioning India Private Limited');
```

Expect `UPDATE 2`, yielding:

| Cell | `gst_no` | `address` |
|---|---|---|
| row 20, AA | `09AABCD0971F1ZU` | `5th Floor, 502A, B , 503 & 504, Shalimar Iridium, …, Uttar Pradesh, 226010` |
| row 20, AQ | `19AABCD0971F1C4` | `37/2, Block Gn, …, West Bengal, 700091` |

The filter `address ~ '[0-9A-Z]{15}'` excludes the junk row; an `LIKE '(%…)%'` variant
would not, because the West Bengal cell has no opening parenthesis at all.

Then clear the junk row:

```sql
-- Section 5.3: Hari Om Electrical
DELETE FROM vendor_gsts
WHERE gst_no IS NULL AND address = 'v'
  AND org_id IN (SELECT id FROM vendor_organizations WHERE name = 'Hari Om Electrical');
```

Expect `DELETE 1`.

### 7.3 Section 3b — drop the duplicated AP registrations (safe)

```sql
-- Keep the 'Andhra Pradesh (New)' copy, remove the legacy-AP duplicate
DELETE FROM vendor_gsts vg
USING vendor_organizations vo
WHERE vg.org_id = vo.id
  AND vo.name IN ('Haier Appliances India Private Limited', 'LG Electronics India Limited')
  AND vg.gst_state = 'Andhra Pradesh'
  AND EXISTS (
    SELECT 1 FROM vendor_gsts dup
    WHERE dup.org_id = vg.org_id
      AND dup.gst_no = vg.gst_no
      AND dup.gst_state = 'Andhra Pradesh (New)'
  );
```

Expect **2** rows deleted. Decide separately which of Haier's two addresses is current.

### 7.4 Section 3a — Sankar Das (safe)

```sql
UPDATE vendor_gsts SET gst_state = 'Maharashtra'
WHERE gst_no = '27AACCT8765G1ZX' AND gst_state = 'Dadra and Nagar Haveli';
```

### 7.5 Needs verification first — do not run blind

These require the correct value to be confirmed on the GST portal or with the vendor:

| Section | Row/col | Action needed |
|---|---|---|
| 2 — trailing chars | 11/BU (HBL), 13/Y (Havells), 20/AR (Daikin JH) | Confirm, then strip surplus |
| 2 — Daikin MP | 20/AX | Supply the real MP GSTIN; current value is a copy of the AP one |
| 3c — Whirlpool | 18/AP | Confirm `18`→`19`, or find the real WB registration |
| 4 — truncated | 12/M, 65/AX, 87/BT | Supply the missing check character |
| 4 — Daikin Bihar | 20/AB | Move to column AD as state `10`, supply missing check character |

### 7.6 Verification

After 7.1–7.4 (with 7.5 still pending), the totals should be:

| Check | Expected |
|---|---|
| `SELECT count(*) FROM vendor_gsts;` | **900** |
| Rows where `gst_no IS NULL` | **0** |
| Rows where `gst_no ~ '^9'` | **0** |
| Rows where `gst_no` fails the GSTIN shape | **8** — the 7.5 items of class 2 and 4 |
| Rows where `gst_state = 'Dadra and Nagar Haveli'` | **9** (was 10; only Sankar Das moves out) |
| Rows where `gst_state = 'Andhra Pradesh'` | **0** (only Haier and LG ever used the legacy column) |

After 7.5 is resolved, the shape-failure count should reach **0**.

Derivation of the 903 rows:

| | Rows |
|---|---|
| Already clean | 881 |
| Section 1 — `9`→`(` corrected | 7 |
| Section 5.1/5.2 — recovered from `address` | 2 |
| Section 3a — Sankar Das state corrected | 1 |
| Still pending (section 7.5) | 9 |
| Section 5.3 — Hari Om, **deleted** | 1 |
| Section 3b — Haier/LG duplicates, **deleted** | 2 |
| **Total** | **903** |

So `903 − 3 deleted = 900` rows remain, of which **9 are still awaiting verification**
in section 7.5: 4 trailing-character, 4 truncated, and 1 Whirlpool.

> Of those 9, **8 fail the GSTIN shape check below**. Whirlpool's `18AAACW1336L2Z6`
> is a well-formed 15-character GSTIN — its state code simply does not match its
> column. A shape check alone will not catch it.

```sql
SELECT count(*)                                               AS total,
       count(*) FILTER (WHERE gst_no IS NULL)                 AS nulls,
       count(*) FILTER (WHERE gst_no ~ '^9')                  AS leading9,
       count(*) FILTER (WHERE gst_no !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$') AS bad_shape,
       count(*) FILTER (WHERE gst_state = 'Dadra and Nagar Haveli') AS dnh,
       count(*) FILTER (WHERE gst_state = 'Andhra Pradesh')         AS legacy_ap,
       count(*) FILTER (WHERE gst_state = 'West Bengal'
                          AND gst_no LIKE '18%')              AS whirlpool
FROM vendor_gsts;
```

Expected immediately after 7.1–7.4:

```
total | nulls | leading9 | bad_shape | dnh | legacy_ap | whirlpool
------+-------+----------+-----------+-----+-----------+----------
  900 |     0 |        0 |         8 |   9 |         0 |         1
```

`bad_shape` stays at **8** and `whirlpool` at **1** until section 7.5 is resolved;
both should reach **0** after that. If `total`, `nulls` or `leading9` do not match,
stop and inspect before touching anything else.

---

## 8. Note on the source workbook

- Sheet `VM` has 512 rows with a vendor name but only **424 distinct names** — rows
  192–510 (88 of them) repeat an earlier row. `parseVm.ts` merges duplicates, keeping the first
  non-null value of each field (`??` at `parseVm.ts:153-156`). If a repeated row holds
  an email or phone the first row lacked, **that value is discarded silently.**
- `vendor_organizations` currently holds **59** organizations; only **2** of the 424
  parsed names already exist. The migration will create **422** new organizations.
- Column BX onward (cols 75–78: BX `EMAIL`, BY `PHONE NO.`, BZ `PAN NUMBER`, CA
  `REGISTRATION TYPE`) repeats the same fields. The parser reads only cols D/E/F
  (3/4/5); 0 rows held a value in the second block that the first block lacked, so
  nothing is lost — but 179 rows carry a duplicate of their email or phone there.
- **`Creditor_Master.xlsx` is untracked at the repo root** and root `.gitignore` does
  not exclude it. It contains 512 vendors' emails, phone numbers and PANs. Consider
  adding it to `.gitignore` before it is ever staged.
