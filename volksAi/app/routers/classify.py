import logging
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.document_classifier import classify_document_category
from app.services.pdf_text_extractor import extract_pdf_text_hybrid

router = APIRouter(tags=["Classify"])
logger = logging.getLogger(__name__)

# Classification is called interactively right after upload (not as part of
# the full extraction job), so only the first few pages are read -- enough
# for the reference-ID / GEM / ATC / BOQ signals, which are almost always
# near the front of the document, without paying full-document OCR latency.
CLASSIFICATION_MAX_PAGES = 5


@router.post("/classify-document")
async def classify_document_endpoint(pdf_file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Deterministic (non-LLM) document-type classification for a single
    uploaded file: mainTender / atc / boq / other.

    Returns a confidence score and a `needsConfirmation` flag. The caller
    (TMS NestJS backend, on behalf of the frontend upload flow) must not
    silently finalize a needs-confirmation file as "other" -- the user has
    to confirm or correct the suggested tag before the file is included in
    an auto-extract run.
    """
    filename = pdf_file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF files are supported for classification.",
        )

    job_id = f"classify_{uuid.uuid4().hex[:12]}"
    page_text_combined = ""

    with tempfile.TemporaryDirectory(prefix=f"{job_id}_") as temp_dir:
        temp_dir_path = Path(temp_dir)
        temp_pdf_path = temp_dir_path / filename
        contents = await pdf_file.read()
        temp_pdf_path.write_bytes(contents)

        try:
            page_texts = extract_pdf_text_hybrid(
                str(temp_pdf_path), temp_dir_path / "pages", max_pages=CLASSIFICATION_MAX_PAGES
            )
            page_text_combined = " ".join(p.get("text", "") for p in page_texts)
        except Exception as exc:
            logger.warning(
                f"[CLASSIFY_API] Text extraction failed for '{filename}' (job_id: {job_id}): {exc}. "
                "Falling back to filename-only classification."
            )

    result = classify_document_category(name=filename, page_text_combined=page_text_combined)

    return {
        "suggestedType": result.suggested_type,
        "confidence": result.confidence,
        "needsConfirmation": result.needs_confirmation,
        "reason": result.reason,
        "scores": result.scores,
    }
