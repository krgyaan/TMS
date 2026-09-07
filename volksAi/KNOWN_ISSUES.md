# volksAi Known Issues & Extraction Bug Registry

This document serves as our regression and architectural reference for bugs, false-positive traps, and fabricated-guess defaults discovered and fixed during isolated testing of the `volksAi` service.

---

## 1. Zero Tender Value Reported as High Confidence (`tenderValue: 0.0`)

* **Surfacing PDF / Comparison**: `GAIL Vadodra.pdf` (and general unpriced tenders). Ground truth showed missing estimated value, but API returned `{"value": 0.0, "confidence": "high", "source": "regex"}`.
* **Symptom**: Unextracted or unpriced tenders reported a tender value of ₹0.00 with "high" confidence, misleading Tender Executives (TEs) into believing the tender had zero monetary value rather than an undisclosed or missing value.
* **Root Cause**:
  1. `tender_mapper.py` line ~1268 contained `tender_value_display = "₹0.00"` as a fallback default when regex failed.
  2. `tms_field_mapper.py` line ~430 parsed `"₹0.00"` as float `0.0`.
  3. `extract.py` treated numeric `0.0` as an affirmative extracted number with status `extracted` / confidence `high`.
* **Fix Applied**:
  - In [`tender_mapper.py`](app/services/tender_mapper.py), removed `tender_value_display = "₹0.00"` fallback, setting it to `"NA"`.
  - In [`tms_field_mapper.py`](app/services/tms_field_mapper.py), updated `_parse_float` to treat `0.0` on `tenderValue` as `None` (missing).
  - In [`extract.py`](app/routers/extract.py), missing values now report strictly `{"value": null, "confidence": "missing", "source": null}`.

---

## 2. MAF Silent-False-as-Override (`mafRequired: "NO"`)

* **Surfacing PDF / Comparison**: `1788249376684_GeM-Bidding-9719175.pdf`. Ground truth expected `Yes General`, but API returned `{"value": "NO", "confidence": "high", "source": "atc"}`.
* **Symptom**: The main tender contained OEM authorization and principal representation clauses (Clauses 7(f) and 11(3)), but the final output asserted `mafRequired: "NO"` citing `source: "atc"`.
* **Root Cause**:
  1. In `resolve_atc_anchor_fields()` ([`tender_mapper.py`](app/services/tender_mapper.py)), when no MAF keyword appeared in the child ATC PDFs, line 427 executed `res["maf_required"] = False`. Silence in ATC was treated as a confident "No".
  2. In `pdf_parent_ingest.py`, `"MAF Required"` is designated in `ATC_SOURCED_LABELS`. Line 354 evaluated `isinstance(False, bool)` as `True` (`is_val_valid = True`), and line 388 unconditionally overwrote the main tender's field with `Reason: atc-authoritative-override`.
* **Fix Applied**:
  - In `resolve_atc_anchor_fields()`, changed silent fallback from `False` to `None`. Absence of evidence in ATC documents now signals "undetermined from this source".
  - In `pdf_parent_ingest.py`, added guards skipping `val is None` from `resolved_atc` and ensuring `None`/stub values never override main-document fields.

---

## 3. Missing Word Boundary Causing OCR Stamp Duty to Match PRS (`max_ld_percentage = 5.0`)

* **Surfacing PDF / Comparison**: `1788249376684_GeM-Bidding-9719175.pdf`. Container logs showed: `[FIELD_MERGE] Field: Max LD Percentage | Old value: None | New value (atc): 5.0 | Reason: atc-new-field`.
* **Symptom**: The child ATC PDFs contained no Liquidated Damages (LD) or Price Reduction Schedule (PRS) clauses, yet the ATC resolver authoritatively emitted `max_ld_percentage = 5.0`.
* **Root Cause**:
  1. In `tender_mapper.py` line 56, `_RE_PRS_FALLBACK_KW` was defined as `re.compile(r"(?:PRICE REDUCTION SCHEDULE|PRS)", re.IGNORECASE)` without word boundaries (`\b`).
  2. Child PDF `atc_8fd3d813c6706891.pdf` (Bank Guarantee format) included a state stamp duty table. On page 3, Punjab stamp duty is `Rs. 500/-`.
  3. Tesseract OCR misread `Rs. 500/-` as `PRsS00/-`.
  4. The un-bounded regex matched `PRs` inside `PRsS00/-`, triggering lines 458-460: `res["max_ld_percentage"] = 5.0`.
* **Fix Applied**:
  - Updated [`tender_mapper.py`](app/services/tender_mapper.py) line 56 to require word boundaries: `re.compile(r"\b(?:PRICE REDUCTION SCHEDULE|PRS)\b", re.IGNORECASE)`. Garbage OCR character sequences can no longer trigger false-positive PRS detections.

---

## 4. GeM GTC Max LD Ceiling Hardcoded to GAIL 5% Constant (`maxLdPercentage: 5.0` vs `10.0`)

* **Surfacing PDF / Comparison**: `1788249376684_GeM-Bidding-9719175.pdf`. Clause 14 stated *"LD charges as per GeM"*. Ground truth was `10%`, but pipeline emitted `5%`.
* **Symptom**: GeM tenders governed by standard GeM GTC reported a 5.0% maximum LD cap instead of the statutory 10.0% ceiling.
* **Root Cause**:
  1. In `tender_mapper.py` lines 1774-1776, the fallback for missing LD clauses was logged as `Resolved field 'prs_ld' via GeM GTC default (0.5% per week, max 5%)`.
  2. The author copied GAIL GCC Clause 26's 5% maximum into what was labeled as the GeM default. Under GeM GTC Clause 15, the statutory ceiling is 10% (0.5% per week up to 10%).
* **Fix Applied**:
  - Differentiated the fallback between GeM tenders (`"GEM/"` in NIT, `"gem.gov.in"`, or `"LD charges as per GeM"`) and standalone GAIL tenders.
  - GeM tenders default to `10%` per GeM GTC Clause 15. Standalone GAIL tenders preserve `5%` per GAIL GCC Clause 26.

---

## 5. Fabricated Guess: MAF Defaulting to "No" (`maf_required_display = "No"`)

* **Surfacing PDF / Comparison**: `1788249376684_GeM-Bidding-9719175.pdf` and minimal stubs.
* **Symptom**: Any tender lacking the specific legacy GAIL BEC regex keywords was unconditionally marked `mafRequired: "NO"`.
* **Root Cause**:
  1. `tender_mapper.py` line 1405 executed `else: maf_required_display = "No"` whenever `is_maf` evaluated to `False`.
  2. `tms_field_mapper.py` line 236 mapped empty/NA strings to `"NO"`.
* **Fix Applied**:
  - In `tender_mapper.py`, changed the fallback on line 1405 from `"No"` to `"NA"`.
  - In `tms_field_mapper.py`, updated `_map_maf_required` so that empty/NA values map to `None`. Unextracted MAF now reports strictly `{"value": null, "confidence": "missing", "source": null}`.

---

## 6. Fabricated Guess: Installation Payment Terms Deduced from Arithmetic (`100 - supply%`)

* **Surfacing PDF / Comparison**: Codebase audit across `tender_mapper.py:1713-1721`.
* **Symptom**: If supply payment terms were extracted (e.g. 95%), the pipeline automatically invented installation payment terms (e.g. 5%) even for pure supply contracts with no installation scope.
* **Root Cause**:
  1. `tender_mapper.py` contained hardcoded cascade:
     ```python
     if payment_terms_supply_display == "95%":
         payment_terms_installation_display = "5%"
     elif payment_terms_supply_display == "90%":
         payment_terms_installation_display = "10%"
     ...
     ```
  2. On pure supply contracts, the remaining 5% or 10% is typically held for final acceptance, material receipt certificate (MRC), or performance warranty—not installation.
* **Fix Applied**:
  - Removed the arithmetic deduction cascade. If installation payment terms are not explicitly found in the document or ATC schedule, `payment_terms_installation_display` remains `"NA"` and maps to `null` with `confidence: "missing"`.

---

## 7. Fabricated Guess: Emitting All 5 Banking Instruments on Keyword Hit (`sd_mode_display`)

* **Surfacing PDF / Comparison**: Codebase audit across `tender_mapper.py:464` and `1728`.
* **Symptom**: Any tender mentioning the phrase "SECURITY DEPOSIT" or "CONTRACT PERFORMANCE SECURITY" was assigned the full string: `"Bank Guarantee / DD / FDR / Online Transfer / Insurance Surety Bond"`, even if the tender only allowed Bank Guarantees.
* **Root Cause**:
  1. `_RE_SD_KW.search(full_text)` triggered a hardcoded assignment of all 5 banking instruments in both `resolve_atc_anchor_fields` and `build_infosheet_data`.
* **Fix Applied**:
  - Removed the hardcoded string fallback. If the allowed security deposit instruments are not explicitly extracted from the clause text, the field remains `"NA"` / `None` (`confidence: "missing"` or `"not_applicable"`).

---

## 8. Fabricated Guess: Hardcoded 365 Days Installation for "Part A:" (`delivery_time_installation`)

* **Surfacing PDF / Comparison**: Codebase audit across `tender_mapper.py:1552-1555`.
* **Symptom**: If the string `"Part A:"` was present in `delivery_time_supply_display`, installation delivery time was unconditionally forced to `"365 Days"`.
* **Root Cause**:
  1. A one-off historical patch for a multi-scope tender was hardcoded directly into the core extraction logic.
* **Fix Applied**:
  - Removed the hardcoded `365 Days` branch, allowing standard text extraction, SITC scope inheritance, or missing/None fallback to govern.
