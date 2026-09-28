"""
Bidding Requirements Analysis endpoint.

A new, separate capability alongside /extract (extract.py): given a
tender's main PDF (and optional ATC PDF(s)) plus a company document
library, returns an LLM-identified list of every document/certificate a
bidder must submit, with page citations and library matches where
applicable.

Reuses the existing hybrid text extractor (extract_pdf_text_hybrid) and the
new page-tagging utility (build_page_tagged_text) rather than re-running the
full ingestion pipeline -- this endpoint does not call
ingest_parent_tender_pdf(), build_infosheet_data(), or touch the existing
/extract endpoint or its Layer 1/2 extraction logic.
"""
import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.services.pdf_text_extractor import extract_pdf_text_hybrid
from app.services.pdf_parent_ingest import build_page_tagged_text
from app.services.bidding_requirements_resolver import analyze_bidding_requirements

router = APIRouter(tags=["Bidding Requirements"])
logger = logging.getLogger(__name__)


@router.post("/analyze-bidding-requirements")
async def analyze_bidding_requirements_endpoint(
    pdf_file: UploadFile = File(...),
    atc_files: List[UploadFile] = File(default=[]),
    library_documents: str = Form(default="[]"),
) -> Dict[str, Any]:
    """
    Accepts a tender's main PDF, optional ATC PDF(s), and a JSON-encoded
    libraryDocuments array as a multipart form field (mirroring /extract's
    file-upload pattern), and returns the identified bidding requirements.

    library_documents: JSON array of {"id": str, "document_name": str,
    "document_type": str | null} -- the caller's company document library.
    VolksAI has no database of its own, so this is always supplied by the
    caller, never queried here.

    Response shape:
    {
      "job_id": str,
      "requirements": [
        {
          "documentName": str,
          "category": "oem" | "standard" | "company" | "other",
          "required": bool,
          "source": { "document": "main" | "atc", "page": int, "snippet": str },
          "matchedLibraryId": str | null,
          "confidence": "high" | "medium" | "low",
          "reasoning": str
        }, ...
      ],
      "llm_usage": { "input_tokens": int, "output_tokens": int, ... } | null
    }
    """
    filename = pdf_file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF files are supported.",
        )

    try:
        library_docs = json.loads(library_documents) if library_documents else []
        if not isinstance(library_docs, list):
            raise ValueError("libraryDocuments must be a JSON array")
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid libraryDocuments JSON: {exc}",
        )

    job_id = f"breq_{uuid.uuid4().hex[:12]}"
    logger.info(
        "[BIDDING_REQUIREMENTS_API] Starting analysis for '%s' (job_id: %s, atc_files: %d, library_docs: %d)",
        filename, job_id, len(atc_files or []), len(library_docs),
    )

    try:
        with tempfile.TemporaryDirectory(prefix=f"volksai_{job_id}_") as temp_dir:
            temp_dir_path = Path(temp_dir)
            temp_pdf_path = temp_dir_path / filename
            temp_pdf_path.write_bytes(await pdf_file.read())

            pages_dir = temp_dir_path / "pages"
            page_texts = extract_pdf_text_hybrid(str(temp_pdf_path), pages_dir)

            atc_page_texts: List[Dict[str, Any]] = []
            for idx, atc_upload in enumerate(atc_files or []):
                if not atc_upload or not atc_upload.filename:
                    continue
                atc_dest = temp_dir_path / f"atc_{idx}_{atc_upload.filename}"
                atc_dest.write_bytes(await atc_upload.read())
                atc_page_texts.extend(extract_pdf_text_hybrid(str(atc_dest), pages_dir))
                logger.info(
                    "[BIDDING_REQUIREMENTS_API] ATC file '%s' saved and parsed (job_id: %s)",
                    atc_upload.filename, job_id,
                )

            page_tagged_text = build_page_tagged_text(page_texts, atc_page_texts)

            result = analyze_bidding_requirements(
                page_tagged_text=page_tagged_text,
                library_documents=library_docs,
            )

            requirements = result.get("requirements", [])
            logger.info(
                "[BIDDING_REQUIREMENTS_API] Analysis complete for '%s' (job_id: %s): %d requirement(s) identified",
                filename, job_id, len(requirements),
            )
            return {
                "job_id": job_id,
                "requirements": requirements,
                "llm_usage": result.get("usage"),
            }

    except HTTPException:
        raise
    except RuntimeError as exc:
        # Missing/placeholder ANTHROPIC_API_KEY from analyze_bidding_requirements --
        # this role has no Layer-1 fallback to degrade to, so surface it clearly
        # rather than returning a silently empty requirements list.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(
            "[BIDDING_REQUIREMENTS_API_ERROR] Analysis failed for '%s' (job_id: %s): %s",
            filename, job_id, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bidding requirements analysis failed for '{filename}': {str(exc)}",
        )
