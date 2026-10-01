"""
Bidding Requirements Analyzer -- Role 3 (Claude Sonnet 5).

A new, separate LLM capability alongside the two existing roles in
llm_field_resolver.py:
  Role 1: Missing-field fallback (Claude Haiku 4.5)
  Role 2: Ambiguity resolution (Claude Sonnet 5)
  Role 3: Bidding requirement identification + company-library matching
          (Claude Sonnet 5) -- this module.

Given the page-tagged text of a tender's main document (and ATC, if any --
see build_page_tagged_text() in pdf_parent_ingest.py) plus a caller-supplied
company document library, identifies every document/certificate a bidder
must submit, with a page citation and, for non-OEM items, an attempt to
match against the supplied library.

VolksAI holds no database of its own: library_documents is always passed in
by the caller, never queried here.

This module does not modify llm_field_resolver.py, tender_mapper.py,
build_infosheet_data(), or any existing extraction logic -- it only reads
pricing constants from llm_field_resolver.py for cost accounting.
"""
import logging
import os
import re
from typing import Any, Dict, List, Optional

from app.services.annexure_resolver import (
    _build_annexures_tool_schema,
    snippet_from_page,
    split_page_tagged_text,
    validate_annexures,
)
from app.services.llm_field_resolver import (
    SONNET_5_INPUT_PRICE_PER_M,
    SONNET_5_OUTPUT_PRICE_PER_M,
    SONNET_5_CACHE_WRITE_5M_PER_M,
    SONNET_5_CACHE_READ_PER_M,
)

logger = logging.getLogger(__name__)

ROLE_3_MODEL_DEFAULT = os.getenv("ANTHROPIC_ROLE3_MODEL", "claude-sonnet-5")
# Unlike Role 2 (which reasons over a small scoped-context slice per field),
# this role reads the ENTIRE page-tagged main+ATC document in one call and must
# enumerate every requirement it finds, each with a citation and snippet -- a
# real tender+ATC pair easily needs several thousand output tokens just to list
# 15-20 items in full. 4000 was verified (via a live call against a real GAIL
# tender+ATC pair) to truncate mid-JSON (stop_reason="max_tokens") before a
# single requirement was even parseable, silently returning zero results.
ROLE_3_MAX_TOKENS = int(os.getenv("ANTHROPIC_ROLE3_MAX_TOKENS", "16000"))
# One call now emits requirements AND the full block structure of every annexure, so it
# needs the same headroom the standalone annexure call had (180s); the former 60s default
# was sized for requirements alone. The NestJS caller waits longer than this (see
# BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS in bidding-requirements.service.ts).
ROLE_3_TIMEOUT_S = float(os.getenv("ANTHROPIC_ROLE3_TIMEOUT_S", "180"))

VALID_CATEGORIES = ("oem", "standard", "company", "other")

# Version of this role's extraction output shape. Bump whenever the shape grows so
# consumers (the NestJS tender_extractions cache) can detect and refresh stale entries.
#   1: requirements[] + annexures[] (annexures added additively to the same tool call).
TENDER_KNOWLEDGE_SCHEMA_VERSION = 1
VALID_CONFIDENCE = ("high", "medium", "low")


def _build_requirements_tool_schema() -> Dict[str, Any]:
    """Build a strict JSON schema for Role 3 bidding-requirements tool use."""
    return {
        "name": "report_bidding_requirements",
        "description": (
            "Reports every document or certificate a bidder must submit for this "
            "tender, with a page citation and an optional company-library match, and "
            "every annexure/proforma/format the tender provides for the bidder to fill in, "
            "with a page citation and its structure as ordered typed blocks."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "requirements": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "documentName": {
                                "type": "string",
                                "description": "A clean, short document/certificate name, e.g. 'OEM Authorization Certificate' or 'ISO 9001:2015 Certificate' -- not the raw clause sentence.",
                            },
                            "category": {
                                "type": "string",
                                "enum": list(VALID_CATEGORIES),
                                "description": "'oem' for manufacturer/product-specific items (MAF, MII, Type Test Report, Service Center certificate, ISO/CE/UL); 'standard' for generic statutory/company paperwork (PAN, GST, MSME, incorporation); 'company' only when a strong match was found in the supplied library; 'other' for anything else.",
                            },
                            "required": {
                                "type": "boolean",
                                "description": "True if the tender text states this document as mandatory; false if conditional or advisory only.",
                            },
                            "source": {
                                "type": "object",
                                "properties": {
                                    "document": {
                                        "type": "string",
                                        "enum": ["main", "atc"],
                                        "description": "Which document the supporting text appeared in, taken from the '[Main Page N]' / '[ATC Page N]' label.",
                                    },
                                    "page": {
                                        "type": "integer",
                                        "description": "The page number from that same label.",
                                    },
                                    "snippet": {
                                        "type": "string",
                                        "description": "A short quoted or closely paraphrased excerpt of the supporting text.",
                                    },
                                },
                                "required": ["document", "page", "snippet"],
                            },
                            "matchedLibraryId": {
                                "type": ["string", "null"],
                                "description": "The id of the best-matching entry from the supplied library list, or null if no good match exists. Always null when category is 'oem'.",
                            },
                            "confidence": {
                                "type": "string",
                                "enum": list(VALID_CONFIDENCE),
                                "description": "Confidence that this is a genuine, tender-specific requirement (not generic legal boilerplate).",
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "One concise line explaining why this requirement was identified and, if matched, why that library entry was chosen.",
                            },
                        },
                        "required": [
                            "documentName", "category", "required", "source",
                            "matchedLibraryId", "confidence", "reasoning",
                        ],
                    },
                },
                # Same per-annexure schema (annexureName, source, typed blocks) as the
                # standalone Role 4 tool in annexure_resolver.py. Required so the model must
                # always answer this task (an empty list when there are none) rather than
                # silently omitting the field; the parser still defaults a missing field to [].
                "annexures": _build_annexures_tool_schema()["input_schema"]["properties"]["annexures"],
            },
            "required": ["requirements", "annexures"],
        },
    }


SYSTEM_PROMPT = (
    "You are an expert procurement auditor reviewing an Indian government/PSU tender "
    "(main tender document plus any ATC amendment) to build a complete bidder document "
    "checklist.\n\n"
    "Identify EVERY document or certificate a bidder must submit to be eligible to bid "
    "or to qualify technically/commercially -- read the whole page-tagged text, not just "
    "the first few pages. Explicitly look for and include, when present:\n"
    "  - OEM-related items: OEM Undertaking / Authorization letter, Manufacturer's "
    "Authorization Form (MAF), Type Test Report, Service Center / after-sales-support "
    "certificate, ISO/CE/UL or other product certifications.\n"
    "  - MAF and MII (Make in India) driven submission requirements (e.g. local-content "
    "self-certification, Class-I/II local supplier declaration).\n"
    "  - Any other document named anywhere in the text as something the bidder must "
    "submit, upload, enclose, or furnish -- financial certificates, experience/turnover "
    "proof, statutory registrations, EMD/PBG instruments, declarations, etc.\n\n"
    "For every requirement you report:\n"
    "  - documentName: a clean, short name (not the raw clause sentence).\n"
    "  - category: 'oem' for manufacturer/product-specific items (MAF, MII, Type Test "
    "Report, Service Center cert, ISO/CE/UL); 'standard' for generic statutory/company "
    "paperwork (PAN, GST, MSME, incorporation); 'company' only when you found a strong "
    "match in the supplied library; 'other' for anything that doesn't fit those.\n"
    "  - source: cite exactly which page label ('[Main Page N]' or '[ATC Page N]') the "
    "supporting text appeared under, and quote that text as the snippet (verbatim, at most "
    "about 20 words). The snippet is required for every requirement -- never omit it or "
    "leave it empty. Never cite a page you did not see the requirement on.\n"
    "  - matchedLibraryId: for non-OEM items only, try to match against the supplied "
    "company library list by meaning (not just exact string), and return that entry's "
    "id. Return null if no entry is a good match. ALWAYS return null for category='oem' "
    "-- there is no OEM certificate library yet, do not force a match.\n"
    "  - confidence: your confidence that this is a genuine, tender-specific requirement "
    "(not generic legal boilerplate).\n\n"
    "Do not invent documents that are not actually referenced in the text. Do not merge "
    "distinct requirements into one entry.\n\n"
    "SECOND TASK, in the same response -- annexures: also find EVERY annexure, proforma, "
    "form, or format that the tender itself provides for the bidder to fill in and submit "
    "(e.g. 'ANNEXURE-I', 'Format F-2A Declaration for Bid Security', 'Proforma for Bank "
    "Guarantee', 'Format for Manufacturer's Authorization', 'Guaranteed Technical "
    "Particulars (To be filled by Bidder)'). The requirements list above names WHAT must be "
    "submitted; this list reproduces the STRUCTURE of documents whose format the tender "
    "text actually contains. Only report an annexure when its body (text, blanks, table, or "
    "signature block) appears in the text -- a clause that merely says 'as per proforma at "
    "Form F-2A' is not enough. Do not report purely informational annexures the bidder only "
    "reads (e.g. technical specifications, scope of work).\n"
    "For every annexure:\n"
    "  - annexureName: a clean title with the tender's own identifier, e.g. 'Annexure-III: "
    "Manufacturer's Authorization Form'.\n"
    "  - source: the page label ('[Main Page N]' or '[ATC Page N]') the format begins "
    "under, with its title/opening text as the snippet -- same citation discipline as "
    "requirements; never omit it and never cite a page you did not see it on.\n"
    "  - blocks: the annexure's content in order, reproduced faithfully from the text: "
    "heading (title/section heading), paragraph (running text, verbatim apart from fixing "
    "broken PDF line-wrapping), blank_field (a line the bidder fills in; label = the text "
    "before the blank), table (headers + rows, '' for cells the bidder fills in), "
    "signature_line (a signature/seal line). Keep an inline blank inside a sentence as a "
    "paragraph with the blank shown as '______'.\n"
    "Do not invent fields, clauses, rows, or signature lines not present in the document. "
    "If a blank's exact label is not stated, describe what it is for rather than guessing "
    "wording. Do not merge or split annexures. Return an empty annexures list if there are none."
)


def fill_missing_requirement_snippets(requirements: List[Any], page_tagged_text: str) -> Dict[str, int]:
    """
    Ensures every requirement's source carries a string snippet. A model-provided snippet
    is kept (stripped); a missing/blank one is filled from the cited page's text when that
    page exists and a matching line is found, otherwise set to ''. Mutates in place and
    returns counts {model, filled, missing}.
    """
    pages = split_page_tagged_text(page_tagged_text)
    counts = {"model": 0, "filled": 0, "missing": 0}
    for r in requirements:
        if not isinstance(r, dict) or not isinstance(r.get("source"), dict):
            continue
        source = r["source"]
        snippet = source.get("snippet")
        if isinstance(snippet, str) and snippet.strip():
            source["snippet"] = snippet.strip()
            counts["model"] += 1
            continue
        page_text = pages.get((str(source.get("document", "")).lower(), source.get("page")))
        filled = snippet_from_page(str(r.get("documentName") or ""), page_text) if page_text else ""
        source["snippet"] = filled
        counts["filled" if filled else "missing"] += 1
    if counts["filled"] or counts["missing"]:
        logger.warning(
            "[LLM_BIDDING_REQUIREMENTS][Role 3] Requirement snippets: %d from model, %d filled "
            "from cited page, %d still missing",
            counts["model"], counts["filled"], counts["missing"],
        )
    return counts


def analyze_bidding_requirements(
    page_tagged_text: str,
    library_documents: Optional[List[Dict[str, Any]]] = None,
    *,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    timeout: float = ROLE_3_TIMEOUT_S,
) -> Dict[str, Any]:
    """
    Role 3: identifies bidding document requirements from page-tagged tender
    text and attempts to match non-OEM items against a supplied company
    document library.

    page_tagged_text: output of build_page_tagged_text() in pdf_parent_ingest.py
        -- "[Main Page N]: ..." / "[ATC Page N]: ..." blocks for the whole
        document. Works fine with main-only text (no ATC blocks).
    library_documents: caller-supplied company library rows, e.g.
        [{"id": "42", "document_name": "GST Certificate", "document_type": "Statutory"}, ...].
        VolksAI holds no database -- this is never queried, only passed through.

    Returns {"requirements": [...], "usage": {...} | None} per the schema in
    _build_requirements_tool_schema(). Returns {"requirements": [], "usage": None}
    for empty input text without calling the API.

    Raises RuntimeError if ANTHROPIC_API_KEY is missing/placeholder (mirrors
    LLMFieldResolver's fail-loud behavior on construction) -- the caller
    (the new router endpoint) is expected to translate this into a clean
    HTTP error rather than a silent empty result, since this role has no
    Layer-1 fallback to fall back to.
    """
    if not page_tagged_text or not page_tagged_text.strip():
        return {"requirements": [], "usage": None}

    anthropic_key = (
        api_key
        or os.getenv("ANTHROPIC_API_KEY", "").strip()
        or os.getenv("LLM_API_KEY", "").strip()
    )
    if not anthropic_key or "placeholder" in anthropic_key.lower() or "your_claude" in anthropic_key.lower():
        raise RuntimeError(
            "FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder. "
            "Anthropic Claude API key is required for bidding requirements analysis."
        )

    import anthropic
    client = anthropic.Anthropic(api_key=anthropic_key, timeout=timeout)

    library_documents = library_documents or []
    library_lines = [
        f"- id={d.get('id')!r}, name={d.get('document_name')!r}, type={d.get('document_type')!r}"
        for d in library_documents if isinstance(d, dict)
    ]
    library_block = "\n".join(library_lines) if library_lines else "(no company library documents supplied)"

    tool_spec = _build_requirements_tool_schema()
    tool_spec["cache_control"] = {"type": "ephemeral"}

    user_prompt = (
        "Company document library (match non-OEM requirements against these by id "
        "where a good meaning-based match exists):\n"
        f"{library_block}\n\n"
        "Page-tagged tender text (main tender pages, then ATC pages if present):\n"
        "--- START OF DOCUMENT TEXT ---\n"
        f"{page_tagged_text}\n"
        "--- END OF DOCUMENT TEXT ---"
    )

    resolved_model = model or ROLE_3_MODEL_DEFAULT
    logger.info(
        "[LLM_BIDDING_REQUIREMENTS][Role 3] Analyzing bidding requirements via Claude (%s), "
        "%d library doc(s) supplied", resolved_model, len(library_documents),
    )

    response = client.messages.create(
        model=resolved_model,
        max_tokens=ROLE_3_MAX_TOKENS,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
        tools=[tool_spec],
        tool_choice={"type": "tool", "name": "report_bidding_requirements"},
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
        }
        logger.info(
            "[LLM_BIDDING_REQUIREMENTS][Role 3] Token usage: %d in / %d out (Est. cost: $%.5f USD)",
            in_tok, out_tok, cost,
        )

    requirements: List[Dict[str, Any]] = []
    raw_annexures: Any = []
    for block in response.content:
        if getattr(block, "type", "") == "tool_use" and getattr(block, "name", "") == "report_bidding_requirements":
            input_data = getattr(block, "input", {}) or {}
            requirements = input_data.get("requirements", [])
            # Absent in an old-shape response -> no annexures, not an error.
            raw_annexures = input_data.get("annexures") or []
            break

    # Defensive normalization: category='oem' must never carry a library match,
    # regardless of what the model returned.
    for r in requirements:
        if isinstance(r, dict) and r.get("category") == "oem":
            r["matchedLibraryId"] = None

    # The model sometimes omits source.snippet for requirements (the tool schema's
    # "required" is not enforced). Fill it from the cited page's own text -- deterministic,
    # no extra Claude call -- so every requirement's citation shows supporting text.
    fill_missing_requirement_snippets(requirements, page_tagged_text)

    # Citation guard for annexures (same discipline as the OEM null-match guard below the
    # requirements): missing/malformed/non-existent page citations or no valid blocks ->
    # moved to rejectedAnnexures with a reason, never silently accepted.
    annexures, rejected_annexures = validate_annexures(raw_annexures, page_tagged_text)

    truncated = getattr(response, "stop_reason", None) == "max_tokens"
    if truncated:
        logger.warning(
            "[LLM_BIDDING_REQUIREMENTS][Role 3] Response hit max_tokens=%d; requirements/annexures may be incomplete",
            ROLE_3_MAX_TOKENS,
        )

    return {
        "requirements": requirements,
        "annexures": annexures,
        "rejectedAnnexures": rejected_annexures,
        "truncated": truncated,
        "usage": usage,
    }
