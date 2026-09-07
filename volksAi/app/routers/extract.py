import asyncio
import logging
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.pdf_parent_ingest import ingest_parent_tender_pdf
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
}


def _format_field_object(
    field_name: str,
    raw_val: Any,
    field_statuses: Dict[str, str],
    field_sources: Dict[str, str]
) -> Dict[str, Any]:
    """
    Transforms an extracted field into a structured object containing:
    - value: Any (None for missing fields)
    - confidence: "high" | "fallback" | "missing" | "not_applicable"
    - source: "regex" | "atc" | "llm" | None
    """
    status_val = field_statuses.get(field_name)
    raw_source = field_sources.get(field_name)

    # 1. Determine confidence & clean value using exact status constants
    if status_val == FIELD_STATUS_MISSING or raw_val in ("⚠️ MISSING", None, ""):
        confidence = "missing"
        clean_value = None
    elif status_val == FIELD_STATUS_NOT_APPLICABLE:
        confidence = "not_applicable"
        clean_value = raw_val
    elif status_val == FIELD_STATUS_OK_FALLBACK:
        confidence = "fallback"
        clean_value = raw_val
    elif status_val == FIELD_STATUS_OK:
        confidence = "high"
        clean_value = raw_val
    else:
        # Defensive fallback for unclassified status
        if raw_val in ("⚠️ MISSING", None, ""):
            confidence = "missing"
            clean_value = None
        else:
            confidence = "high"
            clean_value = raw_val

    # 2. Determine source: 'regex' | 'atc' | 'llm' | None
    # Truly missing or unrecorded fields surface as None (null in JSON) rather than guessing "regex"
    if confidence == "missing" or not raw_source:
        source: Optional[str] = None
    else:
        source_key = str(raw_source).lower().strip()
        source = SOURCE_MAP.get(source_key)
        if source is None:
            if "llm" in source_key:
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
        "source": source
    }


@router.post("/extract")
async def extract_tender(pdf_file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Extracts structured fields from an uploaded tender PDF.

    Executes:
    1. Hybrid OCR / native text extraction
    2. Document classification
    3. Spatial & regex field extraction
    4. ATC child link discovery & download
    5. Layer 2 LLM fallback resolution (with socket and defensive timeouts)
    6. Normalization, field precedence, and 4-tier status evaluation

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

            # Construct structured response with top-level version tag
            response: Dict[str, Any] = {
                "extraction_version": "1.0.0"
            }

            for field_name, value in infosheet_data.items():
                # Skip internal metadata keys
                if field_name.startswith("_") or field_name in ("status_summary", "missing_fields"):
                    continue

                response[field_name] = _format_field_object(
                    field_name=field_name,
                    raw_val=value,
                    field_statuses=field_statuses,
                    field_sources=field_sources
                )

            logger.info(
                f"[EXTRACT_API] Extraction complete for '{filename}' ({len(response) - 1} fields returned)"
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
