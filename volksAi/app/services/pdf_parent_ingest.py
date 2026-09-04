import time
from pathlib import Path
from typing import Dict, Any, List, cast
from app.services.pdf_text_extractor import extract_pdf_text_hybrid
from app.services.pdf_link_extractor import extract_links_and_mentions
from app.services.field_extractor import extract_tender_fields
# STRIPPED: info_sheet_generator write removed — function returns dict directly with zero side effects per review-only requirement
# from app.services.info_sheet_generator import generate_info_sheet_csv
import logging

logger = logging.getLogger(__name__)


# BUG 3 FIX: Field precedence constants defining field ownership rules
ATC_SOURCED_LABELS = {
    "Processing Fee", "Tender Fee", "EMD Amount", "Payment Terms %", "Payment Terms",
    "Payment Terms Supply", "Payment Terms Installation", "Payment Terms Installation (%)",
    "Commercial Evaluation Type", "Reverse Auction Applicable", "Delivery Time",
    "PBG Mode", "SD Required", "SD Mode", "SD %", "SD Duration",
    "Security Deposit Required", "Security Deposit Mode", "Security Deposit %", "Security Deposit Duration",
    "LD Applicable", "LD Percentage", "LD Max", "Courier Information", "Client Contacts",
    "Processing Fee Amount", "Tender Fee Amount", "EMD Amount / Total", "PBG Percentage",
    "SD Percentage", "LD Percentage per Week", "Max LD Percentage", "Courier Address", "MAF Required",
    "Price Reduction Schedule (PRS)", "Price Reduction Schedule", "PRS",
    "maf_required", "sd_mode", "sd_required", "sd_percentage", "sd_duration", "ld_percentage_per_week",
    "max_ld_percentage", "payment_terms_supply_percent", "payment_terms_installation_percent"
}

MAIN_SOURCED_LABELS = {
    "PBG Required", "PBG Percentage", "PBG Duration", "PBG Duration (Months)",
    "Eligibility Criterion (Years)", "Bid Validity (Days)", "Bid Validity Period",
    "Tender Name / Title", "Reference ID / NIT No", "Estimated Tender Value",
    "Organisation", "Authority Agency"
}

AMBIGUOUS_LABELS = {
    "Installation Inclusive", "Custom Eligibility Criteria", "Custom Rules",
    "delivery_time_installation_inclusive", "custom_eligibility_criteria", "custom_rules"
}


def _resolve_top_level_fields(sections: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Walks info-sheet sections and maps field labels to top-level tender values.
    Uses exact labels as emitted by field_extractor.py.
    Falls back to empty string if a field is not found or has 'missing' status.
    """
    # Map: field_extractor label -> top-level key name
    label_map = {
        "Tender Name / Title": "title",
        "Reference ID / NIT No": "reference_id",
        "Authority Agency": "authorityName",
        "Department": "department",
        "Estimated Tender Value": "tenderValue",
        "EMD Amount": "emdAmount",
        "Tender Fee": "tenderFee",
        "Bid Submission Deadline": "deadline",
        "Technical Bid Opening Date": "bidOpeningDate",
        "Location of Site": "location",
        "Contact Officer": "contactOfficer",
    }

    resolved: Dict[str, str] = {}
    for sec in sections:
        for f in sec.get("fields", []):
            label = f.get("label", "")
            status = f.get("status", "")
            value = f.get("value", "")
            if label in label_map and status != "missing" and value:
                resolved[label_map[label]] = value

    return resolved


def _compute_parse_confidence(page_texts: List[Dict[str, Any]], sections: List[Dict[str, Any]]) -> float:
    """
    Calculates overall parse confidence from two signals:
    1. Average page-level OCR confidence (weight 0.6)
    2. Field extraction hit rate (weight 0.4)
    """
    # Page confidence
    page_confs = [p.get("confidence", 0.0) for p in page_texts if p.get("confidence") is not None]
    avg_page_conf = sum(page_confs) / len(page_confs) if page_confs else 50.0

    # Field hit rate
    total_fields = 0
    extracted_fields = 0
    for sec in sections:
        for f in sec.get("fields", []):
            total_fields += 1
            if f.get("status") == "extracted" and f.get("value"):
                extracted_fields += 1
    field_hit_rate = (extracted_fields / total_fields * 100) if total_fields > 0 else 0.0

    confidence = (avg_page_conf * 0.6) + (field_hit_rate * 0.4)
    return round(min(confidence, 100.0), 1)


def ingest_parent_tender_pdf(
    job_id: str,
    pdf_path: Path,
    original_filename: str
) -> Dict[str, Any]:
    """
    Coordinates the full OCR, hyperlink extraction, and info-sheet generation pipeline.
    Saves outputs in the job directory and returns structured conforming tender details.
    """
    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Starting ingestion pipeline for '{original_filename}'")
    job_dir = pdf_path.parent
    pages_dir = job_dir / "pages" / job_id
    pages_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Step 1: Extracting text & page structures from PDF...")
    page_texts = extract_pdf_text_hybrid(str(pdf_path), pages_dir)
    all_pages = list(page_texts)
    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Step 1 complete: Extracted {len(all_pages)} text pages")

    # 2. Extract clickable hyperlinks and document mentions
    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Step 2: Extracting hyperlinks & ATC document mentions...")
    links, mentions = extract_links_and_mentions(str(pdf_path))
    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Step 2 complete: Found {len(links)} links, {len(mentions)} mentions")

    # 3. Deterministic Field Extraction
    title_raw = original_filename.replace(".pdf", "").replace("_", " ").replace("-", " ")
    
    # Classify document type using page 1 text
    page1_text = page_texts[0].get("text", "") if page_texts else ""
    from app.ocr.pipeline import classify_document_type
    doc_type = classify_document_type(page1_text)
    
    logger.info(f"[INGEST_PIPELINE][Job {job_id}] Step 3: Running Layer 1 spatial field extraction (doc_type='{doc_type}')...")
    sections = extract_tender_fields(page_texts, title_raw, document_type=doc_type)

    # 3a. Bridge resolved ATC link URL to sections atc_document_link_present field
    matched_atc_link = None
    # First pass: verified is_atc_anchor links (fulfilment.gem.gov.in / Buyer ATC)
    for l in links:
        if l.get("is_atc_anchor"):
            matched_atc_link = l
            break

    # Second pass: links containing explicit ATC keywords, excluding non-ATC endpoints
    if not matched_atc_link:
        non_atc_excl = ["specificationdocument", "boqdocument", "boqlineitemsdocument", "excel/bid-", ".xlsx", ".csv", "downloadomppdfile", "list-of-categories", "/gtc/", "pdfbydate"]
        for l in links:
            url_str = l.get("url", "").lower()
            name_str = l.get("name", "").lower()
            anchor_str = l.get("anchorText", "").lower()
            if any(ex in url_str for ex in non_atc_excl):
                continue
            if any(k in s for s in (url_str, name_str, anchor_str) for k in ["buyer-atc", "buyer uploaded atc", "bid specific atc", "atc"]):
                matched_atc_link = l
                break

    if matched_atc_link and matched_atc_link.get("url"):
        target_url = matched_atc_link["url"]
        anchor_snippet = matched_atc_link.get("anchorText") or "ATC Hyperlink Annotation"
        for sec in sections:
            for f in sec.get("fields", []):
                if f.get("label") == "atc_document_link_present":
                    f["value"] = target_url
                    f["status"] = "extracted"
                    f["sourceSnippet"] = anchor_snippet

    atc_path = None

    # 1. High-priority search: explicit ATC or TENDOC markers (excluding MSE, MII, GTC, rules, catalogs, specs, drawings)
    for l in links:
        if l.get("local_path") and Path(l["local_path"]).exists() and str(l["local_path"]).lower().endswith(".pdf"):
            url_s = l.get("url", "").lower()
            name_s = l.get("name", "").lower()
            anchor_s = l.get("anchorText", "").lower()
            
            excluding_terms = ["mse", "mii", "gtc", "rules", "list-of-categories", "catalog", "specification", "spec", "drawing", "schedule", "boq"]
            is_explicit_atc = any(k in s for s in (url_s, name_s, anchor_s) for k in ["atc", "tendoc", "buyer1", "buyer_uploaded"]) and not any(k in s for s in (url_s, name_s, anchor_s) for k in excluding_terms)
            is_valid_atc_anchor = l.get("is_atc_anchor") and not any(k in s for s in (url_s, name_s, anchor_s) for k in excluding_terms)
            
            if is_explicit_atc or is_valid_atc_anchor:
                atc_path = Path(l["local_path"])
                logger.info(f"[ATC_RESOLVER] Selected high-priority ATC child PDF: '{atc_path}'")
                break

    # 2. General fallback search if no high-priority match found
    if not atc_path:
        for l in links:
            if l.get("local_path") and Path(l["local_path"]).exists() and str(l["local_path"]).lower().endswith(".pdf"):
                url_s = l.get("url", "").lower()
                name_s = l.get("name", "").lower()
                anchor_s = l.get("anchorText", "").lower()
                if any(k in s for s in (url_s, name_s, anchor_s) for k in ["upload", "shared", "doc", "buyer", "resource"]):
                    atc_path = Path(l["local_path"])
                    logger.info(f"[ATC_RESOLVER] Selected downloaded ATC child PDF: '{atc_path}'")
                    break

    if not atc_path:
        for l in links:
            if l.get("local_path") and Path(l["local_path"]).exists() and str(l["local_path"]).lower().endswith(".pdf"):
                atc_path = Path(l["local_path"])
                logger.info(f"[ATC_RESOLVER] Fallback selected downloaded PDF link: '{atc_path}'")
                break

    if not atc_path:
        ext_children_dir = job_dir / "extracted_children"
        # Only scan if job_dir is an isolated per-job folder, never the shared tender-documents root
        if ext_children_dir.exists() and job_dir.name != "tender-documents":
            child_pdfs = [p for p in ext_children_dir.glob("*.pdf") if p.is_file() and p.stat().st_size > 0]
            if child_pdfs:
                # Also sort to prioritize explicit atc/tendoc filenames
                atc_candidates = [p for p in child_pdfs if any(k in p.name.lower() for k in ["atc", "tendoc", "buyer1", "buyer_uploaded"])]
                if atc_candidates:
                    atc_candidates.sort(key=lambda p: p.stat().st_size, reverse=True)
                    atc_path = atc_candidates[0]
                else:
                    child_pdfs.sort(key=lambda p: p.stat().st_size, reverse=True)
                    atc_path = child_pdfs[0]
                logger.info(f"[ATC_RESOLVER] Discovered largest extracted child PDF in job directory: '{atc_path}' (size: {atc_path.stat().st_size} bytes)")

    page_texts_combined = " ".join([p.get("text", "") for p in page_texts[:30]]).lower()
    atc_keywords = [
        "bidding data sheet", "special conditions of contract",
        "buyer added bid specific atc", "buyer uploaded atc document",
        "price reduction schedule", "terms of payment", "general conditions of contract",
        "invitation for bid", "section-iii", "section-ii", "scc", "bds"
    ]
    is_direct_atc = any(kw in page_texts_combined for kw in atc_keywords) or any(k in original_filename.lower() for k in ["atc", "buyer"])

    if not atc_path and is_direct_atc:
        atc_path = pdf_path
        logger.info(f"[ATC_RESOLVER] Selected primary PDF itself as ATC document: '{atc_path}'")

    # --- ATC PRECONDITION GUARD ---
    # If the main tender PDF contained an ATC hyperlink but the downloaded file is
    # unavailable (None path or non-existent file), surface a structured warning so
    # the infosheet clearly signals that ATC-sourced fields may be incomplete.
    atc_link_was_detected = matched_atc_link is not None
    atc_pdf_was_ingested = atc_path is not None
    if atc_link_was_detected and not atc_pdf_was_ingested:
        logger.warning(
            "[ATC_RESOLVER] ATC_NOT_FETCHED: ATC hyperlink detected in tender "
            f"'{original_filename}' but no local ATC PDF is available. "
            "ATC-sourced fields (Payment Terms, LD/PRS, Contacts, Courier) "
            "will remain at main-document values."
        )
        # Inject a visible warning field into the first section
        warning_field = {
            "id": "atc-not-fetched-warning",
            "label": "ATC Not Fetched Warning",
            "value": (
                f"ATC hyperlink detected (URL: {matched_atc_link.get('url', 'unknown')}) "
                "but ATC PDF was not downloaded or supplied. "
                "Payment Terms %, LD/PRS, Client Contacts and Courier Address "
                "may be incomplete — reprocess with ATC PDF attached."
            ),
            "status": "warning",
            "confidence": 0.0,
            "critical": True,
            "source": "derived",
            "sourceSnippet": "ATC_NOT_FETCHED guard: atc_link_detected=True, atc_pdf_ingested=False",
        }
        if sections:
            sections[0].setdefault("fields", []).insert(0, warning_field)
        else:
            sections.append({"id": "sec-warnings", "title": "Pipeline Warnings", "fields": [warning_field]})

    atc_full_text = ""  # Outer-scope ATC text — used by LLM fallback post-pass
    merged_atc_field_count = 0
    if atc_path:
        try:
            logger.info(f"[ATC_RESOLVER] Ingest pipeline parsing downloaded ATC child PDF: '{atc_path}'...")
            if str(atc_path) == str(pdf_path):
                import copy
                atc_page_texts = page_texts
                atc_sections = copy.deepcopy(sections)
            else:
                atc_pages_dir = job_dir / "atc_pages"
                atc_page_texts = extract_pdf_text_hybrid(str(atc_path), atc_pages_dir)
                all_pages.extend(atc_page_texts)
                atc_sections = extract_tender_fields(atc_page_texts, f"{title_raw} ATC", document_type="generic_nit")
            
            # Upsert standalone resolve_atc_anchor_fields output into atc_sections (Task 2)
            atc_full_text = "\n".join([p.get("text", "") for p in atc_page_texts])
            atc_checkboxes = [cb for p in atc_page_texts for cb in p.get("checkboxes", [])]
            from app.services.tender_mapper import resolve_atc_anchor_fields
            resolved_atc = resolve_atc_anchor_fields(atc_full_text, checkboxes=atc_checkboxes, page_texts=atc_page_texts)
            
            schema_label_map = {
                "ld_percentage_per_week": "LD Percentage Per Week",
                "max_ld_percentage": "Max LD Percentage",
                "maf_required": "MAF Required",
                "payment_terms_supply_percent": "Payment Terms Supply",
                "payment_terms_installation_percent": "Payment Terms Installation",
                "sd_mode": "Security Deposit Mode",
                "sd_required": "SD Required",
                "sd_percentage": "Security Deposit %",
                "sd_duration": "SD Duration (Months)",
                "client_contacts": "Client Contacts",
                "courier_address": "Courier Address",
                "delivery_time_supply": "Delivery Time Supply (Days)",
                "pbg_mode": "PBG Mode",
                "commercial_evaluation": "Commercial Evaluation Type",
                "reverse_auction": "Reverse Auction Applicable",
            }
            if atc_sections:
                sec_to_update = atc_sections[0]
                for key, val in resolved_atc.items():
                    lbl = schema_label_map.get(key, key.replace("_", " ").title())
                    sec_to_update.setdefault("fields", []).append({
                        "id": f"f-{key}",
                        "label": lbl,
                        "field_name": key,
                        "value": val,
                        "status": "extracted",
                        "confidence": 85.0,
                        "source": "atc"
                    })
            
            # BUG 4 FIX: Build label -> (section_index, field_index) map to preserve section layout
            label_to_loc = {}
            for sec_idx, sec in enumerate(sections):
                for f_idx, field in enumerate(sec.get("fields", [])):
                    lbl = field.get("label")
                    if lbl and lbl not in label_to_loc:
                        label_to_loc[lbl] = (sec_idx, f_idx)

            atc_new_fields = []
            for atc_sec in atc_sections:
                for f in atc_sec.get("fields", []):
                    lbl = f.get("label")
                    val = f.get("value")
                    # Check if ATC value is valid (non-empty, non-zero, non-stub)
                    if isinstance(val, bool):
                        is_val_valid = True
                    else:
                        is_val_valid = val not in (None, "", "Not Found", "Out of Scope (Stage 1)", 0, 0.0, "0", "0.0", "0.00")
                    if is_val_valid:
                        # BUG 3 FIX: MAIN_SOURCED_LABELS are never overridden by ATC
                        if lbl in MAIN_SOURCED_LABELS:
                            continue

                        f_copy = dict(f)
                        f_copy["source"] = "atc"

                        if lbl in label_to_loc:
                            sec_idx, field_idx = label_to_loc[lbl]
                            existing_field = sections[sec_idx]["fields"][field_idx]
                            old_val = existing_field.get("value")

                            if lbl in AMBIGUOUS_LABELS:
                                old_valid = old_val not in (None, "", "Not Found", "Out of Scope (Stage 1)", 0, 0.0, "0", "0.0", "0.00")
                                if old_valid:
                                    amb_copy = dict(existing_field)
                                    amb_copy["value"] = {"main_tender": old_val, "atc": val}
                                    amb_copy["source"] = "ambiguous_preserved"
                                    amb_copy["status"] = "extracted"
                                    sections[sec_idx]["fields"][field_idx] = amb_copy
                                    merged_atc_field_count += 1
                                    logger.info(
                                        f"[FIELD_MERGE] Field: {lbl} | Old value: {old_val!r} | "
                                        f"New value (atc): {val!r} | Reason: ambiguous-preserved"
                                    )
                                    continue

                            if lbl in ATC_SOURCED_LABELS or atc_path == pdf_path or is_direct_atc:
                                # BUG 3 FIX: ATC_SOURCED_LABELS (or direct ATC uploads) override main doc
                                sections[sec_idx]["fields"][field_idx] = f_copy
                                merged_atc_field_count += 1
                                logger.info(
                                    f"[FIELD_MERGE] Field: {lbl} | Old value: {old_val!r} | "
                                    f"New value (atc): {val!r} | Reason: atc-authoritative-override"
                                )
                            else:
                                # Unlisted labels use fill-if-missing
                                if existing_field.get("status") == "missing" or not old_val or old_val in ("Not Found", "Out of Scope (Stage 1)"):
                                    sections[sec_idx]["fields"][field_idx] = f_copy
                                    merged_atc_field_count += 1
                                    logger.info(
                                        f"[FIELD_MERGE] Field: {lbl} | Old value: {old_val!r} | "
                                        f"New value (atc): {val!r} | Reason: atc-fill-if-missing"
                                    )
                        else:
                            # BUG 4 FIX: Genuinely new field from ATC -> add to ATC-Sourced Fields section
                            f_atc = dict(f_copy)
                            orig_id = f_atc.get("id", f"field-{merged_atc_field_count}")
                            f_atc["id"] = f"atc-{orig_id}" if not str(orig_id).startswith("atc-") else orig_id
                            atc_new_fields.append(f_atc)
                            merged_atc_field_count += 1
                            logger.info(
                                f"[FIELD_MERGE] Field: {lbl} | Old value: None | "
                                f"New value (atc): {val!r} | Reason: atc-new-field"
                            )

            # BUG 4 FIX: Append genuinely new ATC fields into a dedicated section instead of flattening
            if atc_new_fields:
                atc_sec_idx = None
                for idx, sec in enumerate(sections):
                    if sec.get("title") == "ATC-Sourced Fields":
                        atc_sec_idx = idx
                        break

                if atc_sec_idx is not None:
                    sections[atc_sec_idx]["fields"].extend(atc_new_fields)
                else:
                    sections.append({
                        "id": "sec-atc-sourced",
                        "title": "ATC-Sourced Fields",
                        "fields": atc_new_fields
                    })

            if merged_atc_field_count > 0:
                logger.info(f"[ATC_RESOLVER] ATC_PARSE_SUCCESS: Merged {merged_atc_field_count} fields from ATC PDF '{atc_path}'.")
            else:
                logger.warning(f"[ATC_RESOLVER] ATC_PARSE_NO_FIELDS: ATC PDF '{atc_path}' parsed successfully but yielded 0 mergeable fields.")
        except Exception as atc_err:
            logger.warning(f"[ATC_RESOLVER] ATC_PARSE_FAILED: Error processing ATC PDF '{atc_path}': {atc_err}. Continuing with main tender parsing only.")

    # 3b. Normalize Financial Exemption status if Financial Criteria is NOT APPLICABLE
    from app.services.tender_mapper import is_unconditional_financial_exemption
    all_text_combined = " ".join([p.get("text", "") for p in page_texts])
    if atc_full_text:
        all_text_combined += f" {atc_full_text}"
    if is_unconditional_financial_exemption(all_text_combined):
        fin_keywords = {"turnover", "solvency", "net worth", "working capital", "financial"}
        for sec in sections:
            is_fin_sec = any(kw in sec.get("title", "").lower() for kw in fin_keywords)
            for f in sec.get("fields", []):
                lbl = (f.get("label") or f.get("id") or "").lower()
                if is_fin_sec or any(kw in lbl for kw in fin_keywords):
                    f["value"] = "Exempt / Not Applicable"
                    f["status"] = "exempt"
                    f["confidence"] = 99.0
                    f["sourceSnippet"] = "Financial Criteria explicitly declared unconditionally NOT APPLICABLE in Tender BEC (Section-II)"

    # 4. Generate XLSX Spreadsheet Info Sheet
    csv_filename = f"{original_filename.replace('.pdf', '')}_InfoSheet.xlsx"
    csv_path = job_dir / csv_filename
    infosheet_data = {}
    try:
        from app.services.tender_mapper import build_infosheet_data
        infosheet_data = build_infosheet_data(sections, all_pages, job_id=job_id)

        # 4a. LLM Fallback Post-Pass — resolve remaining NA fields via LLM (Gemini / OpenAI-compatible)
        import os
        if os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true":
            try:
                from app.services.llm_field_resolver import LLMFieldResolver, FIELD_PROMPT_MAP
                from app.services.tender_mapper import FIELD_STATUS_OK_FALLBACK, FIELD_STATUS_MISSING
                _DISPLAY_KEY_TO_LABEL = {
                    "payment_terms_supply_display": "Payment Terms Supply",
                    "payment_terms_installation_display": "Payment Terms Installation",
                    "ld_percentage_display": "LD Percentage Per Week",
                    "max_ld_percentage_display": "Max LD Percentage",
                    "sd_required_display": "Security Deposit Required",
                    "sd_mode_display": "Security Deposit Mode",
                    "sd_percentage_display": "Security Deposit %",
                    "sd_duration_display": "SD Duration (Months)",
                    "maf_required_display": "MAF Required",
                    "client_name_1_display": "Client Contacts",
                    "client_email_1_display": "Client Email",
                    "client_phone_1_display": "Client Phone",
                    "client_name_2_display": "Client Contacts 2",
                    "client_email_2_display": "Client Email 2",
                    "client_phone_2_display": "Client Phone 2",
                    "client_name_3_display": "Client Contacts 3",
                    "client_email_3_display": "Client Email 3",
                    "client_phone_3_display": "Client Phone 3",
                    "custom_eligibility_criteria_display": "Custom Eligibility Criteria",
                    "courier_address_display": "Courier Address",
                    "delivery_time_supply_display": "Delivery Time Supply (Days)",
                    "pbg_mode_display": "PBG Mode",
                    "commercial_evaluation_display": "Commercial Evaluation Type",
                    "reverse_auction_applicable_display": "Reverse Auction Applicable",
                    "order_value_1_display": "Order Value 1",
                    "order_value_2_display": "Order Value 2",
                    "order_value_3_display": "Order Value 3",
                    "avg_annual_turnover_value_display": "Average Annual Turnover Value",
                    "working_capital_value_display": "Working Capital Value",
                    "solvency_certificate_value_display": "Solvency Certificate Value",
                    "net_worth_value_display": "Net Worth Value",
                    "eligibility_criterion_years_display": "Eligibility Criterion Years",
                }
                COMPLEX_BEC_KEYS = [
                    "custom_eligibility_criteria_display",
                    "order_value_1_display",
                    "order_value_2_display",
                    "order_value_3_display",
                    "avg_annual_turnover_value_display",
                    "working_capital_value_display",
                    "solvency_certificate_value_display",
                    "net_worth_value_display",
                    "eligibility_criterion_years_display",
                ]
                _stub_vals = ("NA", "N/A", None, "", "Not Found", "NOT_APPLICABLE", "Not Applicable", "0", "0.0", "0.00", "₹0.00", 0, 0.0, "⚠️ MISSING")
                # Dynamically collect ALL infosheet fields that are still NA / missing after Layer 1 regex pass
                missing_keys = [
                    k for k, v in infosheet_data.items()
                    if not k.startswith("_") and (v in _stub_vals or (isinstance(v, str) and not v.strip()))
                ]
                # Combine parent and ATC child texts to ensure LLM has full context
                parent_text = "\n".join([p.get("text", "") for p in all_pages])
                target_text = f"{parent_text}\n\n{atc_full_text}".strip() if atc_full_text else parent_text.strip()
                
                # Check for BEC / Section-II content in target text
                has_bec_content = bool(
                    re.search(r"SECTION-II|BID EVALUATION CRITERIA|\bBEC\b|TECHNICAL CRITERIA|ELIGIBILITY CRITERIA", target_text, re.IGNORECASE)
                )

                keys_to_resolve = list(missing_keys)
                if has_bec_content:
                    for bec_key in COMPLEX_BEC_KEYS:
                        if bec_key not in keys_to_resolve and bec_key in FIELD_PROMPT_MAP:
                            curr_val = str(infosheet_data.get(bec_key, "")).strip()
                            is_suspicious = (
                                curr_val in _stub_vals
                                or any(kw in curr_val.lower() for kw in ["make in india", "local content", "purchase preference", "etc."])
                                or (bec_key in ("order_value_1_display", "order_value_2_display", "avg_annual_turnover_value_display")
                                    and ("₹" in curr_val or "rs" in curr_val.lower())
                                    and not any(u in curr_val.lower() for u in ["lakh", "lac", "cr", "crore", ",00", "000"]))
                            )
                            if is_suspicious or bec_key == "custom_eligibility_criteria_display":
                                keys_to_resolve.append(bec_key)

                if keys_to_resolve and target_text:
                    logger.info("[LLM_FALLBACK][Layer 2] %d fields queued for LLM resolution (has_bec=%s): %s", len(keys_to_resolve), has_bec_content, keys_to_resolve)
                    resolver = LLMFieldResolver()
                    llm_resolved = resolver.resolve(target_text, keys_to_resolve)
                    
                    field_statuses = cast(Dict[str, str], infosheet_data.get("_info_sheet_statuses", {}))
                    missing_fields = cast(List[str], infosheet_data.get("missing_fields", []))
                    status_summary = cast(Dict[str, int], infosheet_data.get("status_summary", {}))
                    
                    for key, item in llm_resolved.items():
                        if key.startswith("_") or not isinstance(item, dict):
                            continue
                        val = item.get("value")
                        if not val or val in _stub_vals:
                            continue

                        current_val = infosheet_data.get(key)
                        is_stub = current_val in _stub_vals or (isinstance(current_val, str) and not current_val.strip())

                        is_bec_override = False
                        if key in COMPLEX_BEC_KEYS:
                            # Rule: If eligibility_criterion_years_display is already a clean integer from main_tender, preserve it (MAIN_SOURCED_LABELS)
                            if key == "eligibility_criterion_years_display":
                                if is_stub or not str(current_val).strip().isdigit():
                                    is_bec_override = True
                            elif is_stub:
                                is_bec_override = True
                            elif any(kw in str(current_val).lower() for kw in ["make in india", "local content", "purchase preference", "etc."]):
                                is_bec_override = True
                            elif key == "custom_eligibility_criteria_display":
                                # LLM technical BEC overrides regex which often picks up MII or boilerplate
                                is_bec_override = True
                            elif key in ("order_value_1_display", "order_value_2_display", "avg_annual_turnover_value_display"):
                                # If existing value lacked units (e.g. bare "₹32.00") and LLM has unit multiplier, override
                                curr_has_unit = any(u in str(current_val).lower() for u in ["lakh", "lac", "cr", "crore", ",00", "000"])
                                val_has_unit = any(u in str(val).lower() for u in ["lakh", "lac", "cr", "crore", ",00", "000"])
                                if not curr_has_unit and val_has_unit:
                                    is_bec_override = True

                        if is_stub or is_bec_override:
                            infosheet_data[key] = val
                            logger.info("[LLM_FALLBACK][Layer 2] Merged '%s' = %r into infosheet_data (override=%s, prev=%r)", key, val, is_bec_override, current_val)
                            
                            # 1. Update status tracking dicts
                            field_statuses[key] = FIELD_STATUS_OK_FALLBACK
                            if key in missing_fields:
                                missing_fields.remove(key)
                            if FIELD_STATUS_MISSING in status_summary and status_summary[FIELD_STATUS_MISSING] > 0:
                                status_summary[FIELD_STATUS_MISSING] -= 1
                            status_summary[FIELD_STATUS_OK_FALLBACK] = status_summary.get(FIELD_STATUS_OK_FALLBACK, 0) + 1
                            
                            # 2. Sync to infoSheetSections for UI preview
                            target_label = _DISPLAY_KEY_TO_LABEL.get(key, key.replace("_display", "").replace("_", " ").title())
                            if sections:
                                field_found = False
                                raw_key_name = key.replace("_display", "")
                                for sec in sections:
                                    for f in sec.get("fields", []):
                                        f_name = f.get("field_name", "")
                                        f_lbl = f.get("label", "")
                                        if f_lbl == target_label or f_name == key or f_name == raw_key_name or f.get("id") == f"f-{key}":
                                            f["value"] = val
                                            f["status"] = "extracted"
                                            f["confidence"] = 90.0
                                            f["source"] = "atc_llm"
                                            f["resolution_source"] = item.get("source", "unknown")
                                            f["resolution_layer"] = item.get("layer", "layer_2")
                                            field_found = True
                                            break
                                    if field_found:
                                        break
                                if not field_found and sections:
                                    sections[0].setdefault("fields", []).append({
                                        "id": f"f-{key}",
                                        "label": target_label,
                                        "field_name": key,
                                        "value": val,
                                        "status": "extracted",
                                        "confidence": 90.0,
                                        "source": "atc_llm",
                                        "resolution_source": item.get("source", "unknown"),
                                        "resolution_layer": item.get("layer", "layer_2")
                                    })
                elif missing_keys and not atc_full_text:
                    logger.info("[LLM_FALLBACK] Skipping LLM — no ATC text available (ATC not downloaded)")
            except Exception as llm_err:
                logger.warning("[LLM_FALLBACK] Non-fatal LLM resolution error: %s", llm_err)

        # STRIPPED: generate_info_sheet_csv removed to prevent disk write; returning pure dict
        # generate_info_sheet_csv(infosheet_data, str(csv_path))
    except Exception as e:
        logger.error(f"Failed to generate info sheet workbook for job {job_id}: {e}", exc_info=True)

    # 5. Resolve top-level fields from extracted sections (NO hardcoded fallbacks)
    resolved = _resolve_top_level_fields(sections)

    tender_title = resolved.get("title", title_raw)
    authority = resolved.get("authorityName", "")
    tender_value = resolved.get("tenderValue", "")
    emd_amount = resolved.get("emdAmount", "")
    tender_fee = resolved.get("tenderFee", "")
    deadline_val = resolved.get("deadline", "")
    location = resolved.get("location", "")

    # 6. Compute confidence from actual OCR data
    parse_confidence = _compute_parse_confidence(page_texts, sections)

    # 7. Build document groups
    source_docs = [
        {
            "id": f"src-{job_id}",
            "name": original_filename,
            "kind": "pdf",
            "origin": "source",
            "url": f"/storage/jobs/{job_id}/{original_filename}",
            "downloadable": True,
            "openable": True,
            "isPrimary": True,
            "uploadedBy": "System"
        }
    ]

    gen_outputs = [
        {
            "id": f"out-{job_id}",
            "name": csv_filename,
            "kind": "xlsx",
            "origin": "generated",
            "url": f"/storage/jobs/{job_id}/{csv_filename}",
            "downloadable": True,
            "openable": True,
            "generator": "ocr",
            "outputKind": "info_sheet"
        }
    ]

    extracted_pdfs = []
    for idx, l in enumerate(links):
        extracted_pdfs.append({
            "id": f"link-{job_id}-{idx+1}",
            "name": l["name"],
            "kind": "pdf",
            "origin": "linked",
            "url": l["url"],
            "downloadable": True,
            "openable": True,
            "extractedFromDocumentId": f"src-{job_id}",
            "sourcePage": l["sourcePage"],
            "anchorText": l["anchorText"],
            "extractionConfidence": l["extractionConfidence"],
            "local_path": l.get("local_path")
        })

    mentioned_docs = []
    for idx, m in enumerate(mentions):
        mentioned_docs.append({
            "id": f"ment-{job_id}-{idx+1}",
            "name": m["name"],
            "kind": "xlsx" if "boq" in m["name"].lower() else "pdf",
            "origin": "mentioned",
            "mentionText": m["mentionText"],
            "sourcePage": m["sourcePage"],
            "resolved": False
        })

    # 8. Count issues: missing critical fields + unresolved mentions + ATC warnings
    issues = 0
    for sec in sections:
        for f in sec.get("fields", []):
            if f.get("critical") and f.get("status") == "missing":
                issues += 1
            elif f.get("critical") and f.get("status") == "warning":
                # ATC_NOT_FETCHED and other pipeline warnings count as actionable issues
                issues += 1
            elif f.get("critical") and f.get("confidence", 100) < 70:
                issues += 1
    issues += len(mentioned_docs)

    # STRIPPED: 8a. Neo4j Graph Synchronization (ENABLE_NEO4J / sync_tender_graph / clause_segmenter)
    # Excluded per review-only microservice scope; pure extraction pipeline with no graph database writes.

    # 9. Build conforming detailed tender payload
    status_sum = infosheet_data.get("status_summary", {}) if 'infosheet_data' in locals() else {}
    missing_fls = infosheet_data.get("missing_fields", []) if 'infosheet_data' in locals() else []
    field_sts = infosheet_data.get("_info_sheet_statuses", {}) if 'infosheet_data' in locals() else {}

    payload = {
        "id": job_id,
        "title": tender_title,
        "authorityName": authority,
        "deadline": deadline_val,
        "tenderValue": tender_value,
        "emdAmount": emd_amount,
        "tenderFee": tender_fee,
        "location": location,
        "documents": {
            "sourceDocuments": source_docs,
            "generatedOutputs": gen_outputs,
            "extractedLinkedPdfs": extracted_pdfs,
            "mentionedAttachments": mentioned_docs
        },
        "infoSheetSections": sections,
        "rawTextPages": [
            {"page": p["page"], "text": p["text"]} for p in page_texts
        ],
        "parse_status": "completed",
        "parse_confidence": parse_confidence,
        "review_status": "unreviewed",
        "issues_count": issues,
        "status_summary": status_sum,
        "missing_fields": missing_fls,
        "field_statuses": field_sts,
        "infosheet_data": infosheet_data
    }

    return payload
