"""
Annexure Identifier -- Role 4 (Claude Sonnet 5).

A new, separate LLM capability alongside:
  Role 1: Missing-field fallback (Claude Haiku 4.5)       -- llm_field_resolver.py
  Role 2: Ambiguity resolution (Claude Sonnet 5)          -- llm_field_resolver.py
  Role 3: Bidding requirement identification (Sonnet 5)   -- bidding_requirements_resolver.py
  Role 4: Annexure / proforma / format identification and structural
          reproduction (Claude Sonnet 5) -- this module.

Role 3 identifies WHAT documents a bidder must submit, by name. Role 4 finds the
documents whose exact FORMAT the tender itself provides (e.g. "ANNEXURE-I",
"Format F-2A Declaration for Bid Security", "Proforma for Bank Guarantee") and
reproduces each one's structure as an ordered list of typed blocks, which
annexure_docx_builder.build_annexure_docx() then renders deterministically to .docx.

Input is the same page-tagged main+ATC text Role 3 uses (build_page_tagged_text()
in pdf_parent_ingest.py). Every returned annexure must carry a page citation that
actually exists in that input text -- annexures with a missing, malformed, or
non-existent citation are moved to a separate "rejected" list with a reason
instead of being silently accepted (same discipline as Role 3's OEM null-match
guard: never trust the model's output shape blindly).

This module does not modify llm_field_resolver.py, bidding_requirements_resolver.py,
tender_mapper.py, or any existing extraction logic -- it only reads pricing
constants from llm_field_resolver.py for cost accounting.
"""
import logging
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.services.annexure_docx_builder import BLOCK_TYPES
from app.services.llm_field_resolver import (
    SONNET_5_INPUT_PRICE_PER_M,
    SONNET_5_OUTPUT_PRICE_PER_M,
    SONNET_5_CACHE_WRITE_5M_PER_M,
    SONNET_5_CACHE_READ_PER_M,
)

logger = logging.getLogger(__name__)

ROLE_4_MODEL_DEFAULT = os.getenv("ANTHROPIC_ROLE4_MODEL", "claude-sonnet-5")
# Same reasoning as ROLE_3_MAX_TOKENS: the whole main+ATC text is read in one call,
# and this role emits the full body of every annexure it finds, so output is even
# larger than Role 3's. Kept at 16000 (not higher) because the SDK refuses
# non-streaming requests whose max_tokens implies a >10-minute generation.
ROLE_4_MAX_TOKENS = int(os.getenv("ANTHROPIC_ROLE4_MAX_TOKENS", "16000"))

TOOL_NAME = "report_annexures"
VALID_SOURCE_DOCUMENTS = ("main", "atc")

_PAGE_LABEL_RE = re.compile(r"\[(Main|ATC) Page (\d+)\]:")


def _build_annexures_tool_schema() -> Dict[str, Any]:
    """Build a strict JSON schema for Role 4 annexure tool use."""
    return {
        "name": TOOL_NAME,
        "description": (
            "Reports every annexure, proforma, or format the tender requires a bidder "
            "to fill in and submit, each with a page citation and its structure "
            "reproduced as ordered typed blocks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "annexures": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "annexureName": {
                                "type": "string",
                                "description": "Clean title including the tender's own identifier, e.g. 'Annexure-III: Manufacturer's Authorization Form' or 'Format F-2A: Declaration for Bid Security'.",
                            },
                            "source": {
                                "type": "object",
                                "properties": {
                                    "document": {
                                        "type": "string",
                                        "enum": list(VALID_SOURCE_DOCUMENTS),
                                        "description": "Which document the annexure's format appears in, taken from the '[Main Page N]' / '[ATC Page N]' label.",
                                    },
                                    "page": {
                                        "type": "integer",
                                        "description": "The page number from that same label -- the page where the annexure's format itself begins.",
                                    },
                                    "snippet": {
                                        "type": "string",
                                        "description": "A short quoted excerpt of the annexure's title/opening text from that page.",
                                    },
                                },
                                "required": ["document", "page", "snippet"],
                            },
                            "blocks": {
                                "type": "array",
                                "description": "The annexure's content in document order.",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {"type": "string", "enum": list(BLOCK_TYPES)},
                                        "text": {
                                            "type": "string",
                                            "description": "For 'heading' and 'paragraph' blocks.",
                                        },
                                        "label": {
                                            "type": "string",
                                            "description": "For 'blank_field' and 'signature_line' blocks: what the bidder fills in / signs.",
                                        },
                                        "headers": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                            "description": "For 'table' blocks: column headers.",
                                        },
                                        "rows": {
                                            "type": "array",
                                            "items": {"type": "array", "items": {"type": "string"}},
                                            "description": "For 'table' blocks: body rows; use '' for cells the bidder must fill in.",
                                        },
                                    },
                                    "required": ["type"],
                                },
                            },
                        },
                        "required": ["annexureName", "source", "blocks"],
                    },
                }
            },
            "required": ["annexures"],
        },
    }


SYSTEM_PROMPT = (
    "You are an expert bid-preparation assistant reviewing an Indian government/PSU tender "
    "(main tender document plus any ATC amendment).\n\n"
    "Your task: find EVERY annexure, proforma, form, or format that the tender provides and "
    "requires a bidder to fill in and submit -- for example 'ANNEXURE-I', 'Format F-2A "
    "Declaration for Bid Security', 'Proforma for Bank Guarantee', 'Format for Manufacturer's "
    "Authorization', 'Guaranteed Technical Particulars (To be filled by Bidder)'. Read the whole "
    "page-tagged text, not just the first few pages; these formats are usually near the end.\n\n"
    "This is NOT a list of required documents by name. Only report a document when the tender "
    "text itself contains its format/template (its body text, blanks, table, or signature "
    "block). A clause that merely says 'submit an ISO certificate' or 'as per proforma at Form "
    "F-2A' without the form's content appearing in the text is not an annexure to report. "
    "Do not report annexures that are purely informational (e.g. a technical specification or "
    "scope of work the bidder only reads and does not fill in).\n\n"
    "For each annexure:\n"
    "  - annexureName: a clean title with the tender's own identifier, e.g. 'Annexure-III: "
    "Manufacturer's Authorization Form'.\n"
    "  - source: cite exactly which page label ('[Main Page N]' or '[ATC Page N]') the "
    "annexure's format begins under, and quote its title/opening text as the snippet. Never "
    "cite a page you did not see the annexure on, and never omit the citation.\n"
    "  - blocks: reproduce the annexure's actual required content and structure faithfully "
    "from the source text, in order, using these block types:\n"
    "      heading        -- a title or section heading of the form\n"
    "      paragraph      -- running text of the form, reproduced verbatim (fix only broken "
    "line-wrapping / hyphenation from PDF extraction)\n"
    "      blank_field    -- a line the bidder must fill in (e.g. 'Name of Authorized "
    "Signatory: ______'); label is the text that precedes the blank\n"
    "      table          -- a table in the form; headers are its column headers, rows its "
    "body rows, with '' for cells the bidder must fill in\n"
    "      signature_line -- a signature/seal line (e.g. 'Signature & Seal of Bidder')\n"
    "    Where a blank appears inline inside a sentence (e.g. 'we M/s______ (Name of Bidder) "
    "have submitted...'), keep the sentence as a paragraph with the blank shown as '______'.\n\n"
    "Strict rules:\n"
    "  - Do not invent fields, clauses, rows, or signature lines that are not present in the "
    "document.\n"
    "  - If a blank's exact label is not stated in the text, describe what the blank is for "
    "(e.g. 'Tender number (blank in format)') rather than guessing specific wording.\n"
    "  - Do not merge distinct annexures into one entry, and do not split one annexure into "
    "several.\n"
    "  - If the tender contains no fillable annexures, return an empty list."
)


def _available_page_labels(page_tagged_text: str) -> Set[Tuple[str, int]]:
    """{('main', 3), ('atc', 1), ...} for every page label present in the input text."""
    return {(doc.lower(), int(page)) for doc, page in _PAGE_LABEL_RE.findall(page_tagged_text or "")}


def _sanitize_block(block: Any) -> Optional[Dict[str, Any]]:
    """Returns a clean copy of a valid block, or None if the block is unusable."""
    if not isinstance(block, dict):
        return None
    btype = block.get("type")
    if btype in ("heading", "paragraph"):
        text = block.get("text")
        if isinstance(text, str) and text.strip():
            return {"type": btype, "text": text.strip()}
        return None
    if btype in ("blank_field", "signature_line"):
        label = block.get("label")
        if isinstance(label, str) and label.strip():
            return {"type": btype, "label": label.strip()}
        return None
    if btype == "table":
        headers = block.get("headers") or []
        rows = block.get("rows") or []
        if not isinstance(headers, list) or not isinstance(rows, list):
            return None
        headers = [str(h) for h in headers]
        rows = [[str(c) for c in r] for r in rows if isinstance(r, list)]
        if not headers and not rows:
            return None
        return {"type": "table", "headers": headers, "rows": rows}
    return None


def validate_annexures(
    annexures: Any,
    page_tagged_text: str,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Splits raw model output into (accepted, rejected).

    An annexure is REJECTED (never silently accepted) when:
      - it is not an object, or has no annexureName;
      - source is missing, or source.document is not 'main'/'atc';
      - source.page is missing / not a positive integer;
      - source.snippet is missing or blank;
      - the cited (document, page) label does not exist in the input text
        (i.e. the model cited a page it could not have seen);
      - no valid blocks remain after dropping malformed ones.

    Each rejected entry is {"annexureName": str | None, "reason": str, "raw": <original>}
    so the caller can surface it for review rather than lose it.
    Malformed individual blocks inside an otherwise valid annexure are dropped and
    counted in that annexure's "droppedBlocks" field.
    """
    accepted: List[Dict[str, Any]] = []
    rejected: List[Dict[str, Any]] = []
    available = _available_page_labels(page_tagged_text)

    def reject(raw: Any, reason: str) -> None:
        name = raw.get("annexureName") if isinstance(raw, dict) else None
        logger.warning("[LLM_ANNEXURES][Role 4] Rejected annexure %r: %s", name, reason)
        rejected.append({"annexureName": name, "reason": reason, "raw": raw})

    for raw in annexures if isinstance(annexures, list) else []:
        if not isinstance(raw, dict):
            reject(raw, "annexure is not an object")
            continue

        name = raw.get("annexureName")
        if not isinstance(name, str) or not name.strip():
            reject(raw, "missing annexureName")
            continue

        source = raw.get("source")
        if not isinstance(source, dict):
            reject(raw, "missing source citation")
            continue
        document = source.get("document")
        page = source.get("page")
        snippet = source.get("snippet")
        if document not in VALID_SOURCE_DOCUMENTS:
            reject(raw, f"invalid source.document {document!r}")
            continue
        # bool is a subclass of int -- exclude it explicitly.
        if isinstance(page, bool) or not isinstance(page, int) or page < 1:
            reject(raw, f"missing or invalid source.page {page!r}")
            continue
        if not isinstance(snippet, str) or not snippet.strip():
            reject(raw, "missing source.snippet")
            continue
        if (document, page) not in available:
            label = "Main" if document == "main" else "ATC"
            reject(raw, f"cited page '[{label} Page {page}]' does not exist in the input text")
            continue

        raw_blocks = raw.get("blocks") if isinstance(raw.get("blocks"), list) else []
        blocks = [b for b in (_sanitize_block(rb) for rb in raw_blocks) if b is not None]
        if not blocks:
            reject(raw, "no valid structural blocks")
            continue

        accepted.append({
            "annexureName": name.strip(),
            "source": {"document": document, "page": page, "snippet": snippet.strip()},
            "blocks": blocks,
            "droppedBlocks": len(raw_blocks) - len(blocks),
        })

    return accepted, rejected


def identify_annexures(
    page_tagged_text: str,
    *,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    timeout: float = 180.0,
) -> Dict[str, Any]:
    """
    Role 4: identifies every fillable annexure/proforma/format in page-tagged
    tender text and reproduces each one's structure as typed blocks.

    page_tagged_text: output of build_page_tagged_text() in pdf_parent_ingest.py.

    Returns:
      {
        "annexures": [{"annexureName", "source", "blocks", "droppedBlocks"}, ...],
        "rejected":  [{"annexureName", "reason", "raw"}, ...],
        "truncated": bool,   # True if the model hit max_tokens (output may be incomplete)
        "usage": {...} | None,
      }
    Returns empty lists and usage=None for empty input text without calling the API.

    Raises RuntimeError if ANTHROPIC_API_KEY is missing/placeholder (same fail-loud
    behavior as Role 3) -- the router translates this into an HTTP 503.
    """
    empty = {"annexures": [], "rejected": [], "truncated": False, "usage": None}
    if not page_tagged_text or not page_tagged_text.strip():
        return empty

    anthropic_key = (
        api_key
        or os.getenv("ANTHROPIC_API_KEY", "").strip()
        or os.getenv("LLM_API_KEY", "").strip()
    )
    if not anthropic_key or "placeholder" in anthropic_key.lower() or "your_claude" in anthropic_key.lower():
        raise RuntimeError(
            "FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder. "
            "Anthropic Claude API key is required for annexure identification."
        )

    import anthropic
    client = anthropic.Anthropic(api_key=anthropic_key, timeout=timeout)

    tool_spec = _build_annexures_tool_schema()
    tool_spec["cache_control"] = {"type": "ephemeral"}

    user_prompt = (
        "Page-tagged tender text (main tender pages, then ATC pages if present):\n"
        "--- START OF DOCUMENT TEXT ---\n"
        f"{page_tagged_text}\n"
        "--- END OF DOCUMENT TEXT ---"
    )

    resolved_model = model or ROLE_4_MODEL_DEFAULT
    logger.info("[LLM_ANNEXURES][Role 4] Identifying annexures via Claude (%s)", resolved_model)

    response = client.messages.create(
        model=resolved_model,
        max_tokens=ROLE_4_MAX_TOKENS,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
        tools=[tool_spec],
        tool_choice={"type": "tool", "name": TOOL_NAME},
    )

    usage: Optional[Dict[str, Any]] = None
    if hasattr(response, "usage") and response.usage:
        u = response.usage
        in_tok = int(getattr(u, "input_tokens", 0) or 0)
        out_tok = int(getattr(u, "output_tokens", 0) or 0)
        cache_create = int(getattr(u, "cache_creation_input_tokens", 0) or 0)
        cache_read = int(getattr(u, "cache_read_input_tokens", 0) or 0)
        cost = (
            (in_tok / 1_000_000 * SONNET_5_INPUT_PRICE_PER_M)
            + (out_tok / 1_000_000 * SONNET_5_OUTPUT_PRICE_PER_M)
            + (cache_create / 1_000_000 * SONNET_5_CACHE_WRITE_5M_PER_M)
            + (cache_read / 1_000_000 * SONNET_5_CACHE_READ_PER_M)
        )
        usage = {
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "cache_creation_tokens": cache_create,
            "cache_read_tokens": cache_read,
            "estimated_cost_usd": round(cost, 5),
            "model": resolved_model,
        }
        logger.info(
            "[LLM_ANNEXURES][Role 4] Token usage: %d in / %d out (Est. cost: $%.5f USD)",
            in_tok, out_tok, cost,
        )

    truncated = getattr(response, "stop_reason", None) == "max_tokens"
    if truncated:
        logger.warning(
            "[LLM_ANNEXURES][Role 4] Response hit max_tokens=%d; annexure list may be incomplete",
            ROLE_4_MAX_TOKENS,
        )

    raw_annexures: Any = []
    for block in response.content:
        if getattr(block, "type", "") == "tool_use" and getattr(block, "name", "") == TOOL_NAME:
            input_data = getattr(block, "input", {}) or {}
            raw_annexures = input_data.get("annexures", [])
            break

    accepted, rejected = validate_annexures(raw_annexures, page_tagged_text)
    logger.info(
        "[LLM_ANNEXURES][Role 4] %d annexure(s) accepted, %d rejected", len(accepted), len(rejected),
    )
    return {"annexures": accepted, "rejected": rejected, "truncated": truncated, "usage": usage}
