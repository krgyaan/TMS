"""
Annexure generation endpoint.

Hosts POST /generate-annexure-docx: given one annexure's stored blocks (from the
cached /analyze-bidding-requirements analysis), renders it to a .docx on demand
without re-reading the tender or calling Claude.
"""
import logging
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.annexure_resolver import _sanitize_block
from app.services.annexure_docx_builder import build_annexure_docx, requires_bidder_letterhead

router = APIRouter(tags=["Annexures"])
logger = logging.getLogger(__name__)

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _slugify(name: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name or "").strip("-").lower()
    return (slug[:max_len].rstrip("-")) or "annexure"


class GenerateAnnexureDocxRequest(BaseModel):
    """One annexure exactly as previously identified and stored (e.g. from the cached
    /analyze-bidding-requirements response) -- no tender text, no LLM input."""
    annexureName: str = ""
    blocks: List[Dict[str, Any]] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    letterhead: Optional[bool] = None


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
    annexure = {"annexureName": payload.annexureName, "blocks": blocks}
    # Deterministic letterhead: uses explicit caller override if provided, else auto-detects
    letterhead = payload.letterhead if payload.letterhead is not None else requires_bidder_letterhead(annexure)
    try:
        with tempfile.TemporaryDirectory(prefix="volksai_annexure_docx_") as temp_dir:
            out_path = build_annexure_docx(
                annexure,
                Path(temp_dir) / filename,
                letterhead=letterhead,
                context=payload.context,
            )
            content = out_path.read_bytes()
    except Exception as exc:
        logger.error(
            "[ANNEXURE_DOCX_ERROR] Failed to generate docx for '%s': %s",
            payload.annexureName, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate docx for '{payload.annexureName}': {exc}",
        )

    logger.info(
        "[ANNEXURE_DOCX] Generated '%s' (%d block(s), %d bytes, letterhead=%s)",
        filename, len(blocks), len(content), letterhead,
    )
    return Response(
        content=content,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
