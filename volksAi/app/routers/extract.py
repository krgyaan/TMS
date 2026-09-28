import asyncio
import logging
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.services.pdf_parent_ingest import build_document_identity_check, ingest_parent_tender_pdf
from app.services.tms_field_mapper import map_to_tms_dto
from app.services.tender_mapper import (
    FIELD_STATUS_MISSING,
    FIELD_STATUS_NOT_APPLICABLE,
    FIELD_STATUS_OK,
    FIELD_STATUS_OK_FALLBACK,
)

router = APIRouter(tags=["Extract"])
logger = logging.getLogger(__name__)


# Map internal source identifiers to canonical API sources
SOURCE_MAP: Dict[str, str] = {
    "main_tender": "regex",
    "regex": "regex",
    "atc": "atc",
    "ambiguous_preserved": "atc",
    "atc_llm": "llm",
    "llm": "llm",
    "llm_override": "llm",
    "atc_llm_override": "llm",
}

# Mapping between TMS DTO field names and Python-native extraction display keys
TMS_TO_SOURCE_KEY_MAP: Dict[str, str] = {
    # Fees & EMD
    "processingFeeAmount": "processing_fee_amount_display",
    "processingFeeModes": "processing_fee_mode_display",
    "tenderFeeAmount": "tender_fee_amount_display",
    "tenderFeeModes": "tender_fee_mode_display",
    "emdAmount": "emd_amount_display",
    "emdRequired": "emd_required_display",
    "emdModes": "emd_mode_display",
    "tenderValue": "tender_value_display",

    # Evaluation & Terms
    "bidValidityDays": "bid_validity_days_display",
    "commercialEvaluation": "commercial_evaluation_display",
    "reverseAuctionApplicable": "reverse_auction_applicable_display",
    "mafRequired": "maf_required_display",

    # Delivery Time
    "deliveryTimeSupply": "delivery_time_supply_display",
    "deliveryTimeInstallationDays": "delivery_time_installation_display",
    "deliveryTimeInstallationInclusive": "installation_inclusive_display",

    # Payment Terms
    "paymentTermsSupply": "payment_terms_supply_display",
    "paymentTermsInstallation": "payment_terms_installation_display",

    # PBG & SD
    "pbgRequired": "pbg_required_display",
    "pbgMode": "pbg_mode_display",
    "pbgPercentage": "pbg_percentage_display",
    "pbgDurationMonths": "pbg_duration_display",
    "sdMode": "sd_mode_display",
    "sdPercentage": "sd_percentage_display",
    "sdDurationMonths": "sd_duration_display",

    # LD (Liquidated Damages)
    "ldPercentagePerWeek": "ld_percentage_display",
    "maxLdPercentage": "max_ld_percentage_display",

    # Physical Documents
    "physicalDocsRequired": "physical_docs_required_display",
    "physicalDocsDeadline": "physical_docs_deadline_display",

    # Before-Bidding Requirements
    "preBidMeeting": "pre_bid_meeting_display",
    "siteVisit": "site_visit_display",
    "siteVisitRequired": "site_visit_display",
    "sampleSubmission": "sample_submission_display",
    "sampleSubmissionRequired": "sample_submission_display",

    # Make in India (MII)
    "miiPreference": "mii_preference_display",
    "miiRequired": "mii_preference_display",

    # Seller Required Documents
    "requiredDocuments": "doc_1_display",
    "doc1": "doc_1_display",
    "doc2": "doc_2_display",
    "doc3": "doc_3_display",
    "doc4": "doc_4_display",
    "doc5": "doc_5_display",
    "doc6": "doc_6_display",
    "doc7": "doc_7_display",
    "doc8": "doc_8_display",
    "doc9": "doc_9_display",

    # BEC Financial & Work Orders
    "orderValue1": "order_value_1_display",
    "orderValue2": "order_value_2_display",
    "orderValue3": "order_value_3_display",
    "avgAnnualTurnoverType": "avg_annual_turnover_type_display",
    "avgAnnualTurnoverValue": "avg_annual_turnover_value_display",
    "workingCapitalType": "working_capital_type_display",
    "workingCapitalValue": "working_capital_value_display",
    "netWorthType": "net_worth_type_display",
    "netWorthValue": "net_worth_value_display",
    "solvencyCertificateType": "solvency_certificate_type_display",
    "solvencyCertificateValue": "solvency_certificate_value_display",
    "customEligibilityCriteria": "custom_eligibility_criteria_display",
    "techEligibilityAge": "experience_years_display",

    # Selected Documents
    "technicalWorkOrders": "po_selected_documents_display",
    "commercialDocuments": "commercial_eligibility_documents_display",

    # Contacts & Address
    "clients": "client_name_1_display",
    "courierAddress": "courier_address_display",
}


def _normalize_extracted_value_for_key(tms_key: str, raw_val: Any) -> Any:
    """Normalizes raw string extraction to typed value matching TMS DTO schema."""
    if raw_val is None or str(raw_val).strip() in ("", "None", "NA", "N/A", "Not Found", "⚠️ MISSING"):
        return None
    if isinstance(raw_val, (int, float, bool)):
        return raw_val
    s = str(raw_val).strip()

    float_keys = {
        "emdAmount", "tenderValue", "processingFeeAmount", "tenderFeeAmount",
        "orderValue1", "orderValue2", "orderValue3", "avgAnnualTurnoverValue",
        "workingCapitalValue", "netWorthValue", "solvencyCertificateValue",
        "pbgPercentage", "sdPercentage", "ldPercentagePerWeek", "maxLdPercentage",
        "paymentTermsSupply", "paymentTermsInstallation"
    }
    if tms_key in float_keys:
        from app.services.tms_field_mapper import _parse_float
        parsed = _parse_float(s)
        return parsed if parsed is not None else s

    int_keys = {
        "bidValidityDays", "deliveryTimeSupply", "deliveryTimeInstallationDays",
        "pbgDurationMonths", "sdDurationMonths", "techEligibilityAge"
    }
    if tms_key in int_keys:
        from app.services.tms_field_mapper import _parse_int
        parsed = _parse_int(s)
        return parsed if parsed is not None else s

    bool_keys = {
        "reverseAuctionApplicable", "deliveryTimeInstallationInclusive", "physicalDocsRequired",
        "siteVisitRequired", "sampleSubmissionRequired", "miiRequired"
    }
    if tms_key in bool_keys:
        s_lower = s.lower()
        if "yes" in s_lower or "true" in s_lower or "applicable" in s_lower:
            return True
        if "no" in s_lower or "false" in s_lower or "not" in s_lower:
            return False

    return s


# Reasons a field's citation cannot point at a verified page/snippet.
UNLOCATED_NO_SOURCE_RECORD = "no_source_record"          # no Layer-1 record exists for this field
UNLOCATED_VALUE_CHANGED = "value_changed_after_extraction"  # snapshot exists but no longer matches the value
UNLOCATED_NO_PAGE = "no_page_recorded"                  # value matches, but the page was never captured


def _has_real_page(page: Any) -> bool:
    return isinstance(page, int) and not isinstance(page, bool) and page >= 1


def _build_citation(tms_key: str, item: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizes a snapshot record and states honestly whether its location is known."""
    raw = item.get("value")
    norm = _normalize_extracted_value_for_key(tms_key, raw)
    if norm is not None:
        item["raw_value"] = str(raw if raw is not None else "")
        item["value"] = norm
    snippet = item.get("snippet") or None
    item["snippet"] = snippet
    if _has_real_page(item.get("page")):
        item["located"] = True
        item["unlocated_reason"] = None
    else:
        item["page"] = None
        item["located"] = False
        item["unlocated_reason"] = UNLOCATED_NO_PAGE
    return item


def _unlocated_citation(
    value: Any, source: Optional[str], is_self_classified_atc: bool, reason: str
) -> Dict[str, Any]:
    if is_self_classified_atc or source == "atc":
        document: Optional[str] = "atc"
    elif source == "regex":
        document = "main_tender"
    else:
        document = None  # LLM-resolved: no document/page attribution is known
    return {
        "value": value,
        "raw_value": None if value is None else str(value),
        "page": None,
        "snippet": None,
        "located": False,
        "unlocated_reason": reason,
        "document": document,
    }


def _normalize_for_compare(val: Any) -> Any:
    if isinstance(val, str):
        return " ".join(val.split()).casefold()
    if isinstance(val, dict):
        name = val.get("name")
        if name:
            return _normalize_for_compare(name)
        return tuple(sorted((str(k), str(v).casefold()) for k, v in val.items() if v not in (None, "")))
    return val


def _values_match(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b if (isinstance(a, bool) and isinstance(b, bool)) else str(a).casefold() == str(b).casefold()
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) <= 1e-4 * max(1.0, abs(float(a)), abs(float(b)))
    if isinstance(a, list) and isinstance(b, list):
        return {repr(_normalize_for_compare(x)) for x in a} == {repr(_normalize_for_compare(x)) for x in b}
    return _normalize_for_compare(str(a) if not isinstance(a, (str, dict)) else a) == _normalize_for_compare(
        str(b) if not isinstance(b, (str, dict)) else b
    )


def _citation_supports_value(
    tms_key: str, source_field_name: Optional[str], raw_item: Optional[Dict[str, Any]], final_value: Any
) -> bool:
    """
    True when a Layer-1 snapshot record's value, projected through the same DTO
    transform as the final value, equals the final value. Any overwrite after the
    snapshot (regex BEC merge, Role 1 / Role 2 LLM writes) makes this False.
    """
    if not raw_item:
        return False
    raw_val = raw_item.get("value")
    candidates: List[Any] = []
    if source_field_name:
        try:
            candidates.append(map_to_tms_dto({source_field_name: raw_val}).get(tms_key))
        except Exception:
            pass
    candidates.append(_normalize_extracted_value_for_key(tms_key, raw_val))
    candidates.append(raw_val)
    return any(_values_match(c, final_value) for c in candidates)


def _resolve_dual_source_for_tms_key(
    tms_key: str,
    source_field_name: Optional[str],
    dual_sources: Dict[str, Any],
    is_self_classified_atc: bool,
    has_atc: bool,
    clean_value: Any,
    source: Optional[str],
) -> Dict[str, Any]:
    candidates = [tms_key, tms_key.lower()]
    if source_field_name:
        base_name = source_field_name.replace("_display", "")
        with_spaces = base_name.replace("_", " ")
        candidates.extend([
            source_field_name,
            source_field_name.lower(),
            base_name,
            base_name.lower(),
            with_spaces,
            with_spaces.lower(),
            with_spaces.title(),
            base_name.replace("_percent", ""),
            base_name.replace("_percent", "").replace("_", " ").lower(),
        ])

    dual_entry = None
    for cand in candidates:
        if cand in dual_sources:
            dual_entry = dual_sources[cand]
            break
    if not dual_entry:
        lower_dual = {k.lower(): v for k, v in dual_sources.items()}
        for cand in candidates:
            if cand.lower() in lower_dual:
                dual_entry = lower_dual[cand.lower()]
                break

    # Layer-1 snapshot records for this field. Self-classified ATC tenders have
    # only one document, so any record belongs in the ATC slot.
    if is_self_classified_atc:
        raw_items: Dict[str, Optional[Dict[str, Any]]] = {
            "main_tender": None,
            "atc": (dual_entry.get("atc") or dual_entry.get("main_tender")) if dual_entry else None,
        }
    else:
        raw_items = {
            "main_tender": dual_entry.get("main_tender") if dual_entry else None,
            "atc": dual_entry.get("atc") if dual_entry else None,
        }

    items: Dict[str, Optional[Dict[str, Any]]] = {}
    for slot, item in raw_items.items():
        items[slot] = _build_citation(tms_key, dict(item)) if item else None

    present = {slot: item for slot, item in items.items() if item is not None}
    supports = {
        slot: _citation_supports_value(tms_key, source_field_name, raw_items[slot], clean_value)
        for slot in present
    }

    unlocated: Optional[Dict[str, Any]] = None
    if present and not any(supports.values()):
        # Every snapshot record disagrees with the final value: the value was
        # overwritten after Layer 1 (regex BEC block, Role 1 / Role 2 LLM, DTO
        # mapping). Showing the old page/snippet would cite text that does not
        # contain the displayed value, so drop them and say so.
        items = {"main_tender": None, "atc": None}
        if clean_value is not None:
            unlocated = _unlocated_citation(clean_value, source, is_self_classified_atc, UNLOCATED_VALUE_CHANGED)
    elif not present and clean_value is not None:
        unlocated = _unlocated_citation(clean_value, source, is_self_classified_atc, UNLOCATED_NO_SOURCE_RECORD)

    main_item, atc_item = items["main_tender"], items["atc"]

    has_conflict = False
    if (
        not is_self_classified_atc
        and main_item is not None
        and atc_item is not None
        and main_item.get("value") is not None
        and atc_item.get("value") is not None
    ):
        has_conflict = not _values_match(main_item.get("value"), atc_item.get("value"))

    located = any(item.get("located") for item in (main_item, atc_item) if item)

    return {
        "self_classified_atc": bool(is_self_classified_atc),
        "has_conflict": has_conflict,
        "main_tender": main_item,
        "atc": atc_item,
        "located": located,
        "unlocated": unlocated,
    }


def _format_field_object(
    tms_key: str,
    dto_value: Any,
    source_field_name: Optional[str],
    field_statuses: Dict[str, str],
    field_sources: Dict[str, str],
    dual_sources: Optional[Dict[str, Any]] = None,
    is_self_classified_atc: bool = False,
    has_atc: bool = False,
) -> Dict[str, Any]:
    """
    Transforms an extracted TMS DTO field into a structured object containing:
    - value: Any (None for missing fields, or DTO-converted value)
    - confidence: "high" | "fallback" | "missing" | "not_applicable"
    - source: "regex" | "atc" | "llm" | None
    - sources: { self_classified_atc: bool, has_conflict: bool, main_tender: dict | None, atc: dict | None }
    """
    status_val = field_statuses.get(source_field_name) if source_field_name else None
    raw_source = field_sources.get(source_field_name) if source_field_name else None

    # Derive not-applicable status for fee amounts if sibling mode is not-applicable
    if (
        source_field_name == "processing_fee_amount_display"
        and field_statuses.get("processing_fee_mode_display") == FIELD_STATUS_NOT_APPLICABLE
    ):
        status_val = FIELD_STATUS_NOT_APPLICABLE
    elif (
        source_field_name == "tender_fee_amount_display"
        and field_statuses.get("tender_fee_mode_display") == FIELD_STATUS_NOT_APPLICABLE
    ):
        status_val = FIELD_STATUS_NOT_APPLICABLE

    # 1. Determine confidence & clean value using exact status constants & DTO value
    if dto_value is None:
        if (
            status_val == FIELD_STATUS_NOT_APPLICABLE
            or (source_field_name and "not applicable" in str(field_statuses.get(source_field_name, "")).lower())
        ):
            confidence = "not_applicable"
        else:
            confidence = "missing"
        clean_value = None
    elif isinstance(dto_value, list) and len(dto_value) == 0:
        confidence = "missing"
        clean_value = []
    else:
        if dto_value == "NOT_APPLICABLE" or status_val == FIELD_STATUS_NOT_APPLICABLE:
            confidence = "not_applicable"
            # Numeric zero or dummy placeholder paired with not_applicable must map to null
            clean_value = None if (isinstance(dto_value, (int, float)) and dto_value == 0.0) else dto_value
        elif status_val == FIELD_STATUS_OK_FALLBACK:
            confidence = "fallback"
            clean_value = dto_value
        elif status_val == FIELD_STATUS_OK:
            confidence = "high"
            clean_value = dto_value
        else:
            confidence = "high"
            clean_value = dto_value

    # 2. Determine source: 'regex' | 'atc' | 'llm' | None
    if confidence == "missing" or clean_value is None:
        source: Optional[str] = None
    else:
        if not raw_source:
            source = "atc" if "atc" in str(source_field_name) else "regex"
        else:
            source_key = str(raw_source).lower().strip()
            source = SOURCE_MAP.get(source_key)
            if source is None:
                if "llm" in source_key or "override" in source_key:
                    source = "llm"
                elif "atc" in source_key:
                    source = "atc"
                elif "main" in source_key or "regex" in source_key:
                    source = "regex"
                else:
                    source = None

    sources_obj = _resolve_dual_source_for_tms_key(
        tms_key=tms_key,
        source_field_name=source_field_name,
        dual_sources=dual_sources or {},
        is_self_classified_atc=is_self_classified_atc,
        has_atc=has_atc,
        clean_value=clean_value,
        source=source,
    )

    return {
        "value": clean_value,
        "confidence": confidence,
        "source": source,
        "sources": sources_obj,
    }


@router.post("/extract")
async def extract_tender(
    pdf_file: UploadFile = File(...),
    atc_files: List[UploadFile] = File(default=[]),
    boq_file: Optional[UploadFile] = File(None),
    user_id: Optional[int] = Form(None),
) -> Dict[str, Any]:
    """
    Extracts structured fields from an uploaded tender PDF and returns
    TMS DTO-shaped fields with merged confidence and source metadata.

    Executes:
    1. Hybrid OCR / native text extraction
    2. Document classification
    3. Spatial & regex field extraction
    4. ATC child link discovery & download (or explicit atc_files, when provided)
    5. Layer 2 LLM fallback resolution (with socket and defensive timeouts)
    6. Normalization, field precedence, and 4-tier status evaluation
    7. Pure TMS DTO transformation via map_to_tms_dto()
    8. Merging value, confidence, and source metadata under canonical TMS keys

    atc_files / boq_file: explicitly user-tagged ATC/BOQ uploads (see
    document_classifier.py). Previously accepted as multipart fields by the
    caller but never declared here, so FastAPI silently dropped them and
    ingest_parent_tender_pdf() ran on the main PDF alone -- see BUG FIX note
    below. These now take priority over heuristic ATC discovery.

    Cleans up all temporary files (uploaded PDF, page PNGs, child PDFs) upon completion.
    """
    filename = pdf_file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF files are supported."
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    start_time = time.time()
    logger.info(
        f"[EXTRACT_API] Starting extraction request for '{filename}' "
        f"(job_id: {job_id}, user_id: {user_id}, atc_files: {len(atc_files or [])}, "
        f"boq_file: {bool(boq_file and boq_file.filename)})"
    )

    # Use TemporaryDirectory as context manager so all generated files
    # (temp PDF, page PNGs in pages/{job_id}, and downloaded child PDFs)
    # are completely and reliably wiped upon request completion.
    try:
        with tempfile.TemporaryDirectory(prefix=f"volksai_{job_id}_") as temp_dir:
            temp_dir_path = Path(temp_dir)
            temp_pdf_path = temp_dir_path / filename

            # Write uploaded content to temp disk for PyMuPDF / Tesseract access
            contents = await pdf_file.read()
            temp_pdf_path.write_bytes(contents)

            logger.info(f"[EXTRACT_API] Uploaded PDF saved to '{temp_pdf_path}' ({len(contents)} bytes)")

            # BUG FIX: atc_files/boq_file were previously accepted by the NestJS
            # caller's multipart payload but never declared as parameters here,
            # so FastAPI dropped them silently and the pipeline ran without ATC
            # content on every extraction. Save them to disk and forward their
            # paths into ingest_parent_tender_pdf() so they actually participate.
            atc_paths: List[Path] = []
            for idx, atc_upload in enumerate(atc_files or []):
                if not atc_upload or not atc_upload.filename:
                    continue
                atc_dest = temp_dir_path / f"atc_{idx}_{atc_upload.filename}"
                atc_contents = await atc_upload.read()
                atc_dest.write_bytes(atc_contents)
                atc_paths.append(atc_dest)
                logger.info(f"[EXTRACT_API] ATC file saved to '{atc_dest}' ({len(atc_contents)} bytes)")

            boq_path: Optional[Path] = None
            if boq_file and boq_file.filename:
                boq_dest = temp_dir_path / f"boq_{boq_file.filename}"
                boq_contents = await boq_file.read()
                boq_dest.write_bytes(boq_contents)
                boq_path = boq_dest
                logger.info(f"[EXTRACT_API] BOQ file saved to '{boq_dest}' ({len(boq_contents)} bytes)")

            # Run orchestrator in threadpool to prevent blocking the async event loop
            infosheet_data: Dict[str, Any] = await asyncio.to_thread(
                ingest_parent_tender_pdf,
                job_id=job_id,
                pdf_path=temp_pdf_path,
                original_filename=filename,
                explicit_atc_paths=atc_paths,
                explicit_boq_path=boq_path,
            )

            field_statuses: Dict[str, str] = infosheet_data.get("_info_sheet_statuses", {})
            field_sources: Dict[str, str] = infosheet_data.get("_info_sheet_sources", {})
            dual_sources: Dict[str, Any] = infosheet_data.get("_dual_sources", {})
            is_self_classified_atc: bool = bool(infosheet_data.get("_self_classified_atc", False))
            has_atc: bool = bool(infosheet_data.get("_has_atc", bool(atc_paths)))
            ambiguous_field_conflicts: Dict[str, Any] = infosheet_data.get("_ambiguous_field_conflicts", {})
            # Always present, including when unverifiable, so the check's own reliability is visible.
            document_identity_check: Dict[str, Any] = infosheet_data.get("_document_identity_check") or build_document_identity_check(
                None, None, has_atc=has_atc, same_document=is_self_classified_atc
            )

            # 1. Transform raw extraction dictionary into TMS DTO shape
            tms_dto: Dict[str, Any] = map_to_tms_dto(infosheet_data)

            fields: Dict[str, Any] = {}
            missing_fields: List[str] = []

            # 2. Merge DTO-shaped values with confidence and source metadata
            for tms_key, dto_val in tms_dto.items():
                source_key = TMS_TO_SOURCE_KEY_MAP.get(tms_key)
                if tms_key == "techEligibilityAge" and "eligibility_criterion_years_display" in field_statuses:
                    source_key = "eligibility_criterion_years_display"

                field_obj = _format_field_object(
                    tms_key=tms_key,
                    dto_value=dto_val,
                    source_field_name=source_key,
                    field_statuses=field_statuses,
                    field_sources=field_sources,
                    dual_sources=dual_sources,
                    is_self_classified_atc=is_self_classified_atc,
                    has_atc=has_atc,
                )
                fields[tms_key] = field_obj

                if (
                    field_obj.get("confidence") == "missing"
                    or (field_obj.get("value") is None and field_obj.get("confidence") != "not_applicable")
                    or field_obj.get("value") == []
                ):
                    missing_fields.append(tms_key)

            processing_time_ms = int((time.time() - start_time) * 1000)

            # 3. Construct final response envelope matching TMS specification
            response: Dict[str, Any] = {
                "extraction_version": "1.0.0",
                "fields": fields,
                "missing_fields": missing_fields,
                "processing_time_ms": processing_time_ms,
                "llm_usage": infosheet_data.get("_llm_usage"),
                "self_classified_atc": is_self_classified_atc,
                "has_atc": has_atc,
                "ambiguous_field_conflicts": ambiguous_field_conflicts,
                "documentIdentityCheck": document_identity_check,
            }


            logger.info(
                f"[EXTRACT_API] Extraction complete for '{filename}' "
                f"({len(fields)} fields, {len(missing_fields)} missing, {processing_time_ms}ms)"
            )
            return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            f"[EXTRACT_API_ERROR] Extraction pipeline failed for file '{filename}' (job_id: {job_id}): {exc}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction pipeline failed for '{filename}': {str(exc)}"
        )
