import asyncio
import logging
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.pdf_parent_ingest import ingest_parent_tender_pdf
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


def _format_field_object(
    tms_key: str,
    dto_value: Any,
    source_field_name: Optional[str],
    field_statuses: Dict[str, str],
    field_sources: Dict[str, str],
) -> Dict[str, Any]:
    """
    Transforms an extracted TMS DTO field into a structured object containing:
    - value: Any (None for missing fields, or DTO-converted value)
    - confidence: "high" | "fallback" | "missing" | "not_applicable"
    - source: "regex" | "atc" | "llm" | None
    """
    status_val = field_statuses.get(source_field_name) if source_field_name else None
    raw_source = field_sources.get(source_field_name) if source_field_name else None

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
        elif status_val == FIELD_STATUS_OK_FALLBACK:
            confidence = "fallback"
        elif status_val == FIELD_STATUS_OK:
            confidence = "high"
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

    return {
        "value": clean_value,
        "confidence": confidence,
        "source": source,
    }


@router.post("/extract")
async def extract_tender(pdf_file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Extracts structured fields from an uploaded tender PDF and returns
    TMS DTO-shaped fields with merged confidence and source metadata.

    Executes:
    1. Hybrid OCR / native text extraction
    2. Document classification
    3. Spatial & regex field extraction
    4. ATC child link discovery & download
    5. Layer 2 LLM fallback resolution (with socket and defensive timeouts)
    6. Normalization, field precedence, and 4-tier status evaluation
    7. Pure TMS DTO transformation via map_to_tms_dto()
    8. Merging value, confidence, and source metadata under canonical TMS keys

    Cleans up all temporary files (uploaded PDF, page PNGs, child PDFs) upon completion.
    """
    filename = pdf_file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF files are supported."
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    logger.info(f"[EXTRACT_API] Starting extraction request for '{filename}' (job_id: {job_id})")

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

            # Run orchestrator in threadpool to prevent blocking the async event loop
            infosheet_data: Dict[str, Any] = await asyncio.to_thread(
                ingest_parent_tender_pdf,
                job_id=job_id,
                pdf_path=temp_pdf_path,
                original_filename=filename
            )

            field_statuses: Dict[str, str] = infosheet_data.get("_info_sheet_statuses", {})
            field_sources: Dict[str, str] = infosheet_data.get("_info_sheet_sources", {})

            # 1. Transform raw extraction dictionary into TMS DTO shape
            tms_dto: Dict[str, Any] = map_to_tms_dto(infosheet_data)

            # 2. Construct structured response with top-level version tag
            response: Dict[str, Any] = {
                "extraction_version": "1.0.0"
            }

            # 3. Merge DTO-shaped values with confidence and source metadata
            for tms_key, dto_val in tms_dto.items():
                source_key = TMS_TO_SOURCE_KEY_MAP.get(tms_key)

                response[tms_key] = _format_field_object(
                    tms_key=tms_key,
                    dto_value=dto_val,
                    source_field_name=source_key,
                    field_statuses=field_statuses,
                    field_sources=field_sources,
                )

            logger.info(
                f"[EXTRACT_API] Extraction complete for '{filename}' ({len(response) - 1} TMS fields returned)"
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
