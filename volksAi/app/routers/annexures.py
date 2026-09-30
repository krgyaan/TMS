"""
Annexure Identification endpoint (Role 4).

A new, separate capability alongside /extract and /analyze-bidding-requirements:
given a tender's main PDF (and optional ATC PDF(s)), identifies every fillable
annexure/proforma/format the tender provides, reproduces each as a .docx, and
returns the metadata plus a path to each generated file.

Follows bidding_requirements.py's request pattern exactly (multipart pdf_file +
atc_files, extract_pdf_text_hybrid -> build_page_tagged_text) and does not call
ingest_parent_tender_pdf(), build_infosheet_data(), or touch /extract.

Generated files live under ANNEXURE_OUTPUT_DIR (default app/storage/generated_annexures,
which is gitignored/dockerignored). They are scratch output: the NestJS backend
fetches each one via GET /annexure-files/{job_id}/{filename} and re-saves it into
the tender's own uploads directory -- VolksAI is never the long-term store.
"""
import logging
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from app.services.pdf_text_extractor import extract_pdf_text_hybrid
from app.services.pdf_parent_ingest import build_page_tagged_text
from app.services.annexure_resolver import _sanitize_block, identify_annexures
from app.services.annexure_docx_builder import build_annexure_docx

router = APIRouter(tags=["Annexures"])
logger = logging.getLogger(__name__)

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "storage" / "generated_annexures"
_SAFE_SEGMENT_RE = re.compile(r"^[A-Za-z0-9_\-.]+$")


def get_output_dir() -> Path:
    """Read at call time (not import time) so tests can redirect it via env."""
    return Path(os.getenv("ANNEXURE_OUTPUT_DIR") or _DEFAULT_OUTPUT_DIR).resolve()


def _slugify(name: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name or "").strip("-").lower()
    return (slug[:max_len].rstrip("-")) or "annexure"


@router.post("/identify-annexures")
async def identify_annexures_endpoint(
    pdf_file: UploadFile = File(...),
    atc_files: List[UploadFile] = File(default=[]),
) -> Dict[str, Any]:
    """
    Response shape:
    {
      "job_id": str,
      "annexures": [
        {
          "annexureName": str,
          "source": { "document": "main" | "atc", "page": int, "snippet": str },
          "docxPath": str,      # "<job_id>/<file>.docx", relative to VolksAI's output dir
          "downloadUrl": str    # "/annexure-files/<job_id>/<file>.docx"
        }, ...
      ],
      "rejected": [ { "annexureName": str | null, "reason": str }, ... ],
      "truncated": bool,
      "llm_usage": { ... } | null
    }
    """
    filename = pdf_file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF files are supported.",
        )

    job_id = f"annx_{uuid.uuid4().hex[:12]}"
    logger.info(
        "[ANNEXURES_API] Starting annexure identification for '%s' (job_id: %s, atc_files: %d)",
        filename, job_id, len(atc_files or []),
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

            page_tagged_text = build_page_tagged_text(page_texts, atc_page_texts)

        result = identify_annexures(page_tagged_text=page_tagged_text)

        job_dir = get_output_dir() / job_id
        annexures_out: List[Dict[str, Any]] = []
        for idx, annexure in enumerate(result.get("annexures", []), start=1):
            docx_name = f"{idx:02d}_{_slugify(annexure['annexureName'])}.docx"
            build_annexure_docx(annexure, job_dir / docx_name)
            annexures_out.append({
                "annexureName": annexure["annexureName"],
                "source": annexure["source"],
                "docxPath": f"{job_id}/{docx_name}",
                "downloadUrl": f"/annexure-files/{job_id}/{docx_name}",
            })

        logger.info(
            "[ANNEXURES_API] Complete for '%s' (job_id: %s): %d annexure(s) generated, %d rejected",
            filename, job_id, len(annexures_out), len(result.get("rejected", [])),
        )
        return {
            "job_id": job_id,
            "annexures": annexures_out,
            # "raw" model output is kept server-side in logs only, not echoed back.
            "rejected": [
                {"annexureName": r.get("annexureName"), "reason": r.get("reason")}
                for r in result.get("rejected", [])
            ],
            "truncated": bool(result.get("truncated")),
            "llm_usage": result.get("usage"),
        }

    except HTTPException:
        raise
    except RuntimeError as exc:
        # Missing/placeholder ANTHROPIC_API_KEY -- no fallback for this role.
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.error(
            "[ANNEXURES_API_ERROR] Failed for '%s' (job_id: %s): %s", filename, job_id, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Annexure identification failed for '{filename}': {str(exc)}",
        )


@router.get("/annexure-files/{job_id}/{filename}")
async def get_annexure_file(job_id: str, filename: str) -> FileResponse:
    """
    Internal fetch route for a generated annexure .docx (used by the NestJS backend,
    which re-saves the file into the tender's uploads). Both path segments are
    restricted to a safe character set and the resolved path must stay inside the
    output directory, so this cannot be used to read arbitrary files.
    """
    if (
        not _SAFE_SEGMENT_RE.match(job_id)
        or not _SAFE_SEGMENT_RE.match(filename)
        or ".." in job_id
        or ".." in filename
        or not filename.lower().endswith(".docx")
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid annexure file path")

    base = get_output_dir()
    file_path = (base / job_id / filename).resolve()
    if base not in file_path.parents or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annexure file not found")

    return FileResponse(str(file_path), media_type=DOCX_MEDIA_TYPE, filename=filename)


class GenerateAnnexureDocxRequest(BaseModel):
    """One annexure exactly as previously identified and stored (e.g. from the cached
    /analyze-bidding-requirements response) -- no tender text, no LLM input."""
    annexureName: str = ""
    blocks: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/generate-annexure-docx")
async def generate_annexure_docx_endpoint(payload: GenerateAnnexureDocxRequest) -> Response:
    """
    Renders ONE annexure's stored blocks to a .docx and returns the file bytes.

    Purely deterministic (build_annexure_docx, python-docx): this endpoint never re-reads
    the tender and never calls Claude, so re-downloading an annexure costs nothing.
    Malformed blocks are dropped with the same sanitizer the identification step uses;
    a payload with no usable block is a 400, not an empty document.
    """
    blocks = [b for b in (_sanitize_block(raw) for raw in payload.blocks) if b is not None]
    if not blocks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Annexure has no valid blocks to render.",
        )

    filename = f"{_slugify(payload.annexureName)}.docx"
    with tempfile.TemporaryDirectory(prefix="volksai_annexure_docx_") as temp_dir:
        out_path = build_annexure_docx(
            {"annexureName": payload.annexureName, "blocks": blocks}, Path(temp_dir) / filename
        )
        content = out_path.read_bytes()

    logger.info(
        "[ANNEXURE_DOCX] Generated '%s' (%d block(s), %d bytes)", filename, len(blocks), len(content),
    )
    return Response(
        content=content,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
