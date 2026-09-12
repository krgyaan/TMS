"""
Deterministic (non-LLM) document-type classification signals.

STEP 1: extracted from the inline ATC-resolution logic that previously lived
directly in pdf_parent_ingest.py's `ingest_parent_tender_pdf`, preserving the
exact same keyword lists, exclusion rules, and confidence tiers. Behavior is
unchanged -- this is a pure extraction into a standalone, reusable function so
future document-type detectors (BOQ, Main Tender) can follow the same pattern.

Confidence is expressed on a 0-100 scale.
"""

import re
from dataclasses import dataclass, field
from typing import Dict

# --- ATC (Additional Terms & Conditions) signal keyword sets ---------------
ATC_EXCLUDING_TERMS = [
    "mse", "mii", "gtc", "rules", "list-of-categories", "catalog",
    "specification", "spec", "drawing", "schedule", "boq",
]
ATC_HIGH_PRIORITY_KEYWORDS = ["atc", "tendoc", "buyer1", "buyer_uploaded"]
ATC_GENERAL_FALLBACK_KEYWORDS = ["upload", "shared", "doc", "buyer", "resource"]
ATC_FULLTEXT_KEYWORDS = [
    "bidding data sheet", "special conditions of contract",
    "buyer added bid specific atc", "buyer uploaded atc document",
    "price reduction schedule", "terms of payment", "general conditions of contract",
    "invitation for bid", "section-iii", "section-ii", "scc", "bds",
]

ATC_CONFIDENCE_HIGH_PRIORITY = 95.0
ATC_CONFIDENCE_GENERAL_FALLBACK = 60.0
ATC_CONFIDENCE_WEAK_ANY_PDF = 15.0
ATC_CONFIDENCE_SELF_TEXT_MATCH = 75.0
ATC_CONFIDENCE_SELF_FILENAME_MATCH = 70.0
ATC_CONFIDENCE_NONE = 0.0


def classify_document(
    name: str = "",
    url: str = "",
    anchor_text: str = "",
    is_atc_anchor: bool = False,
) -> float:
    """
    Scores a candidate linked/downloaded file as an ATC (Additional Terms &
    Conditions) document using filename/URL/anchor-text keyword signals.

    Mirrors signals 1 and 2 of the original inline ATC resolver:
      1. High-priority explicit ATC/TENDOC markers (or a verified ATC anchor
         hyperlink), excluding known false-positive terms (MSE, MII, GTC,
         rules, catalogs, specs, drawings, schedules, BOQ).
      2. General fallback keyword match (upload/shared/doc/buyer/resource).

    Returns a confidence score in [0, 100]; 0 means no ATC signal matched.
    """
    url_l = (url or "").lower()
    name_l = (name or "").lower()
    anchor_l = (anchor_text or "").lower()
    signals = (url_l, name_l, anchor_l)

    excluded = any(term in s for s in signals for term in ATC_EXCLUDING_TERMS)
    is_explicit_atc = (
        any(kw in s for s in signals for kw in ATC_HIGH_PRIORITY_KEYWORDS) and not excluded
    )
    is_valid_atc_anchor = bool(is_atc_anchor) and not excluded

    if is_explicit_atc or is_valid_atc_anchor:
        return ATC_CONFIDENCE_HIGH_PRIORITY

    if any(kw in s for s in signals for kw in ATC_GENERAL_FALLBACK_KEYWORDS):
        return ATC_CONFIDENCE_GENERAL_FALLBACK

    return ATC_CONFIDENCE_NONE


def classify_document_weak_fallback() -> float:
    """
    Confidence assigned when a PDF is accepted purely because no better ATC
    candidate exists (original tier-3 "any downloaded PDF" / extracted-children
    directory fallback in pdf_parent_ingest.py). Intentionally low.
    """
    return ATC_CONFIDENCE_WEAK_ANY_PDF


def classify_self_as_atc(original_filename: str, page_text_combined: str) -> float:
    """
    Scores whether the primary/main tender PDF is itself the ATC document
    (used when no separate ATC child file could be resolved), via full-text
    keyword sniffing of the first ~30 pages and a filename fallback.

    Mirrors the `is_direct_atc` check in pdf_parent_ingest.py.
    """
    text_l = (page_text_combined or "").lower()
    name_l = (original_filename or "").lower()

    if any(kw in text_l for kw in ATC_FULLTEXT_KEYWORDS):
        return ATC_CONFIDENCE_SELF_TEXT_MATCH

    if any(kw in name_l for kw in ("atc", "buyer")):
        return ATC_CONFIDENCE_SELF_FILENAME_MATCH

    return ATC_CONFIDENCE_NONE


# --- BOQ (Bill of Quantities) signal keyword sets ---------------------------
#
# STEP 2 (new detector -- no equivalent inline logic existed for BOQ before;
# pdf_parent_ingest.py only ever used "boq" as an ATC *exclusion* term, never
# as a positive signal). Confidence bar is set deliberately high per the
# earlier investigation's recommendation: under-confident is fine (falls
# through to needs-confirmation in Step 4), over-confident is not (would
# silently misroute a real BOQ into the wrong precedence bucket).
BOQ_FILENAME_KEYWORDS = [
    "boq", "bill of quantities", "billofquantities", "bill_of_quantities",
    "price schedule", "priceschedule", "price_schedule",
    "schedule of rates", "scheduleofrates", "schedule_of_rates",
]

# Table-header vocabulary typical of a BOQ / price-schedule line-item table.
# A single keyword (e.g. "unit" or "rate") is far too generic on its own, so
# this signal requires several distinct matches co-occurring (see
# BOQ_STRUCTURAL_STRONG_MATCH_COUNT / BOQ_STRUCTURAL_WEAK_MATCH_COUNT below)
# rather than triggering on any one keyword.
BOQ_TABLE_HEADER_KEYWORDS = [
    "item no", "sl.no", "sl no", "s.no",
    "description of goods", "description of work", "description of item",
    "unit", "quantity", "qty",
    "rate", "amount", "unit price", "total price", "estimated cost",
]

BOQ_STRUCTURAL_STRONG_MATCH_COUNT = 5
BOQ_STRUCTURAL_WEAK_MATCH_COUNT = 2

BOQ_CONFIDENCE_FILENAME_EXPLICIT = 90.0
BOQ_CONFIDENCE_STRUCTURAL_STRONG = 80.0
BOQ_CONFIDENCE_STRUCTURAL_WEAK = 40.0
BOQ_CONFIDENCE_NONE = 0.0


def classify_boq_filename(name: str = "", url: str = "", anchor_text: str = "") -> float:
    """
    Scores a candidate file as a BOQ (Bill of Quantities) / price schedule
    document using filename/URL/anchor-text keyword signals.

    Returns a confidence score in [0, 100]; 0 means no BOQ filename signal.
    """
    signals = ((url or "").lower(), (name or "").lower(), (anchor_text or "").lower())

    if any(kw in s for s in signals for kw in BOQ_FILENAME_KEYWORDS):
        return BOQ_CONFIDENCE_FILENAME_EXPLICIT

    return BOQ_CONFIDENCE_NONE


def classify_boq_content(page_text_combined: str) -> float:
    """
    Scores a candidate file as a BOQ using a structural keyword sniff of its
    own first few pages: BOQ line-item tables reliably carry a cluster of
    header terms (item no / description / unit / quantity / rate / amount).
    Counting *distinct* matches (rather than trusting any single generic
    word like "unit") keeps this from firing on ordinary prose.
    """
    text_l = (page_text_combined or "").lower()
    match_count = sum(1 for kw in BOQ_TABLE_HEADER_KEYWORDS if kw in text_l)

    if match_count >= BOQ_STRUCTURAL_STRONG_MATCH_COUNT:
        return BOQ_CONFIDENCE_STRUCTURAL_STRONG
    if match_count >= BOQ_STRUCTURAL_WEAK_MATCH_COUNT:
        return BOQ_CONFIDENCE_STRUCTURAL_WEAK

    return BOQ_CONFIDENCE_NONE


def classify_document_as_boq(
    name: str = "",
    url: str = "",
    anchor_text: str = "",
    page_text_combined: str = "",
) -> float:
    """
    Combined BOQ classifier: the strongest of the filename signal and the
    first-pages structural signal wins (deliberately not additive, so two
    weak/ambiguous signals can't stack into a false high-confidence result).
    """
    return max(
        classify_boq_filename(name=name, url=url, anchor_text=anchor_text),
        classify_boq_content(page_text_combined),
    )


# --- Main Tender / NIT (Notice Inviting Tender) signal set ------------------
#
# STEP 3 (new detector). Previously there was no positive Main Tender
# detection anywhere in the pipeline -- the primary uploaded PDF was always
# *assumed* to be the main tender purely by being the file passed in as
# `pdf_path` (see pdf_parent_ingest.py). This adds an actual content-based
# check so a multi-file upload can be classified without relying on upload
# order / "whichever file came first".
#
# Reuses `classify_document_type` (app/ocr/pipeline.py) -- the GeM
# bid-document regex/phrase already used elsewhere in this codebase -- as the
# starting signal, per the earlier investigation's recommendation, plus two
# additional content signals: a generic tender reference-ID line (same shape
# as the `r"Tender No[:\-\s]+([^\n]+)"` pattern already used in
# tender_mapper.py's `tender_id_display` resolution, broadened to also match
# "NIT No" / "Reference ID" / "RFP No", mirroring field_extractor.py's own
# "NIT No" / "bid_number" / "tender_id" -> "Reference ID / NIT No" label
# grouping), and "Invitation for Bid" / "Notice Inviting Tender" language.
#
# NOTE on overlap with ATC: "invitation for bid" also appears in
# ATC_FULLTEXT_KEYWORDS above (used by classify_self_as_atc to detect when
# the main PDF doubles as the ATC). That overlap is real and intentional --
# on GeM tenders the BDS/SCC sections are frequently appended to the same
# PDF as the NIT, so a single file can legitimately carry both NIT-shaped
# language and ATC-style clauses. When a file scores confidently on both
# Main Tender and ATC, that ambiguity should be surfaced for manual
# confirmation (Step 4) rather than silently resolved in either direction.
MAIN_TENDER_REFERENCE_ID_REGEX = re.compile(
    r"(?:tender\s*no\.?|nit\s*no\.?|reference\s*id|bid\s*number|rfp\s*no\.?)"
    r"[:\-\s]{1,5}[A-Za-z0-9][A-Za-z0-9/\-_.]{4,}",
    re.IGNORECASE,
)
MAIN_TENDER_TEXT_KEYWORDS = [
    "invitation for bid", "notice inviting tender", "request for proposal",
    "bid document",
]
MAIN_TENDER_FILENAME_HINTS = ["nit", "tender", "rfp", "invitation"]

MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED = 90.0
MAIN_TENDER_CONFIDENCE_REFERENCE_ID = 85.0
MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD = 75.0
MAIN_TENDER_CONFIDENCE_FILENAME_HINT = 25.0
MAIN_TENDER_CONFIDENCE_NONE = 0.0


def classify_document_as_main_tender(name: str = "", page_text_combined: str = "") -> float:
    """
    Scores a candidate file as the Main Tender / NIT document using positive
    NIT-shape content signals -- this never assumes "the first uploaded file
    is the main tender".

    `page_text_combined` should ideally be page-1-focused text (matching how
    `classify_document_type` is called elsewhere in the pipeline, on
    `page_texts[0]`), though the reference-ID and keyword checks here are
    tolerant of a longer combined-pages string too.

    Returns a confidence score in [0, 100].
    """
    text = page_text_combined or ""

    # Signal 1: GeM portal bid-document shape (reuses the existing detector
    # rather than duplicating its regex).
    from app.ocr.pipeline import classify_document_type
    if classify_document_type(text) == "gem_structured":
        return MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED

    # Signal 2: a generic tender reference-ID / NIT-number line.
    if MAIN_TENDER_REFERENCE_ID_REGEX.search(text):
        return MAIN_TENDER_CONFIDENCE_REFERENCE_ID

    # Signal 3: NIT-shaped invitation language.
    text_l = text.lower()
    if any(kw in text_l for kw in MAIN_TENDER_TEXT_KEYWORDS):
        return MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD

    # Signal 4 (weak): filename hint only, with no content confirmation.
    name_l = (name or "").lower()
    if any(kw in name_l for kw in MAIN_TENDER_FILENAME_HINTS):
        return MAIN_TENDER_CONFIDENCE_FILENAME_HINT

    return MAIN_TENDER_CONFIDENCE_NONE


def classify_document_as_atc(name: str = "", page_text_combined: str = "") -> float:
    """
    Combined ATC classifier for a standalone uploaded file (no separate
    hyperlink/URL/anchor-text context, unlike the pdf_parent_ingest.py child-
    PDF resolution loop from Step 1) -- takes the stronger of the
    filename-based signal (`classify_document`) and the content-based signal
    (`classify_self_as_atc`, reused here on the file's own text rather than
    "is the main PDF also the ATC"). Same max-not-additive combiner pattern
    as `classify_document_as_boq`.
    """
    return max(
        classify_document(name=name),
        classify_self_as_atc(name, page_text_combined),
    )


# --- STEP 4: combined per-file classification + needs-confirmation flow ----
#
# Runs all three category detectors against one uploaded file and decides:
#   - which category is the best guess,
#   - whether that guess is confident enough to auto-tag, and
#   - if not (or if two categories are ambiguously close), flags the file as
#     needing manual confirmation instead of silently defaulting to "other".
#
# This directly implements the earlier investigation's recommendation:
# silently bucketing a real ATC/BOQ file into "Other" is worse than asking,
# because "Other" is excluded from OCR/parsing/LLM processing entirely.
DOCUMENT_TYPE_MAIN_TENDER = "mainTender"
DOCUMENT_TYPE_ATC = "atc"
DOCUMENT_TYPE_BOQ = "boq"
DOCUMENT_TYPE_OTHER = "other"

# A category must score at or above this to be considered "confident" at
# all. Chosen so that every detector's weak/fallback tiers (ATC general
# fallback=60, BOQ structural-weak=40, Main Tender filename-hint=25) land
# below it, while every detector's real content-match tiers (ATC high-
# priority=95, BOQ filename/structural-strong=90/80, Main Tender
# gem/reference-id/text-keyword=90/85/75) land at or above it.
CLASSIFICATION_CONFIDENCE_THRESHOLD = 70.0

# If the top two category scores are within this gap of each other, treat
# the result as ambiguous even when the top score clears the confidence
# threshold on its own (see the documented ATC/Main-Tender "Invitation for
# Bid" overlap from Step 3 -- a real case this guards against).
CLASSIFICATION_AMBIGUITY_GAP = 15.0

REASON_CONFIDENT = "confident"
REASON_LOW_CONFIDENCE = "low_confidence"
REASON_AMBIGUOUS = "ambiguous"


@dataclass
class DocumentClassificationResult:
    suggested_type: str
    confidence: float
    needs_confirmation: bool
    reason: str
    scores: Dict[str, float] = field(default_factory=dict)


def classify_document_category(name: str = "", page_text_combined: str = "") -> DocumentClassificationResult:
    """
    Classifies one uploaded file into mainTender / atc / boq / other.

    `needs_confirmation` is True whenever:
      - no category reaches CLASSIFICATION_CONFIDENCE_THRESHOLD (including
        the all-zero case, where `suggested_type` is "other" as the best
        guess -- but the caller must still surface it for confirmation
        rather than silently finalizing it), or
      - the top two categories are within CLASSIFICATION_AMBIGUITY_GAP of
        each other, even if the top one individually clears the threshold.
    """
    scores: Dict[str, float] = {
        DOCUMENT_TYPE_MAIN_TENDER: classify_document_as_main_tender(
            name=name, page_text_combined=page_text_combined
        ),
        DOCUMENT_TYPE_ATC: classify_document_as_atc(
            name=name, page_text_combined=page_text_combined
        ),
        DOCUMENT_TYPE_BOQ: classify_document_as_boq(
            name=name, page_text_combined=page_text_combined
        ),
    }

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_type, top_score = ranked[0]
    second_score = ranked[1][1]

    if top_score < CLASSIFICATION_CONFIDENCE_THRESHOLD:
        return DocumentClassificationResult(
            suggested_type=top_type if top_score > 0 else DOCUMENT_TYPE_OTHER,
            confidence=top_score,
            needs_confirmation=True,
            reason=REASON_LOW_CONFIDENCE,
            scores=scores,
        )

    if (top_score - second_score) < CLASSIFICATION_AMBIGUITY_GAP:
        return DocumentClassificationResult(
            suggested_type=top_type,
            confidence=top_score,
            needs_confirmation=True,
            reason=REASON_AMBIGUOUS,
            scores=scores,
        )

    return DocumentClassificationResult(
        suggested_type=top_type,
        confidence=top_score,
        needs_confirmation=False,
        reason=REASON_CONFIDENT,
        scores=scores,
    )
