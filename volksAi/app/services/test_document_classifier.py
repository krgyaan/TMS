"""
Unit tests for the extracted ATC document classifier (STEP 1 of the
deterministic document-classification effort).

These tests pin down the exact behavior that used to live inline in
pdf_parent_ingest.py's `ingest_parent_tender_pdf`, using realistic
filename/URL/anchor-text patterns drawn from the same GeM-tender link
shapes already handled elsewhere in this codebase (see
pdf_link_extractor.py). No LLM calls are involved -- purely keyword and
filename logic.

Note on "real sample PDFs": the real uploaded tender PDFs available in
this repo (api/uploads/tendering/tender-documents/*GAIL*.pdf) are scanned
image PDFs with no embedded hyperlinks. At the time these ATC tests were
first written, this dev environment had no working OCR engine (PaddleOCR
failed to import under numpy 2.x, and the Tesseract-availability gate in
pdf_text_extractor.py skipped OCR entirely when the Tesseract binary
wasn't on PATH), so full-text extraction on them returned empty strings.
Both issues have since been fixed (numpy pinned <2.0 in requirements.txt;
the gate now checks `OcrEngine.is_available()` instead of Tesseract-only),
and real OCR text now extracts successfully. There is still no evidence of
prior ATC-detector tests or fixtures in this repo's git history to compare
against (searched the full history; nothing found), so this suite tests
the classifiers at the function level with representative inputs, plus one
regression case (`test_real_sample_filename_has_no_false_positive_atc_signal`)
that runs the classifier against the actual filename of a real uploaded
tender PDF from this repo, so at least one assertion is anchored to real
production data rather than purely synthetic strings.
"""

from app.services.document_classifier import (
    classify_document,
    classify_document_weak_fallback,
    classify_self_as_atc,
    classify_boq_filename,
    classify_boq_content,
    classify_document_as_boq,
    BOQ_CONFIDENCE_FILENAME_EXPLICIT,
    BOQ_CONFIDENCE_STRUCTURAL_STRONG,
    BOQ_CONFIDENCE_STRUCTURAL_WEAK,
    BOQ_CONFIDENCE_NONE,
    classify_document_as_main_tender,
    MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED,
    MAIN_TENDER_CONFIDENCE_REFERENCE_ID,
    MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD,
    MAIN_TENDER_CONFIDENCE_FILENAME_HINT,
    MAIN_TENDER_CONFIDENCE_NONE,
    classify_document_category,
    DOCUMENT_TYPE_MAIN_TENDER,
    DOCUMENT_TYPE_ATC,
    DOCUMENT_TYPE_BOQ,
    DOCUMENT_TYPE_OTHER,
    REASON_CONFIDENT,
    REASON_LOW_CONFIDENCE,
    REASON_AMBIGUOUS,
    CLASSIFICATION_AMBIGUITY_GAP,
    ATC_CONFIDENCE_HIGH_PRIORITY,
    ATC_CONFIDENCE_GENERAL_FALLBACK,
    ATC_CONFIDENCE_WEAK_ANY_PDF,
    ATC_CONFIDENCE_SELF_TEXT_MATCH,
    ATC_CONFIDENCE_SELF_FILENAME_MATCH,
    ATC_CONFIDENCE_NONE,
)


# --- classify_document: high-priority tier ---------------------------------

def test_high_priority_filename_keyword_match():
    # e.g. a GeM "Buyer_Uploaded_ATC.pdf" child document
    confidence = classify_document(name="Buyer_Uploaded_ATC.pdf", url="", anchor_text="")
    assert confidence == ATC_CONFIDENCE_HIGH_PRIORITY


def test_high_priority_url_keyword_match():
    confidence = classify_document(
        name="linked_file_p3.pdf",
        url="https://bidplus.gem.gov.in/showbidDocument/tendoc123456.pdf",
        anchor_text="",
    )
    assert confidence == ATC_CONFIDENCE_HIGH_PRIORITY


def test_verified_atc_anchor_wins_without_keyword():
    confidence = classify_document(
        name="document_p2.pdf", url="", anchor_text="", is_atc_anchor=True
    )
    assert confidence == ATC_CONFIDENCE_HIGH_PRIORITY


def test_exclusion_term_blocks_high_priority_keyword_match():
    # Contains "atc" but also the excluded term "schedule" -> must NOT match.
    # This mirrors the original code's exact precedence bug/feature.
    confidence = classify_document(name="Payment_Schedule_ATC_Annexure.pdf", url="", anchor_text="")
    assert confidence == ATC_CONFIDENCE_NONE


def test_exclusion_term_blocks_verified_anchor():
    confidence = classify_document(
        name="boq_and_atc_combined.pdf", url="", anchor_text="", is_atc_anchor=True
    )
    assert confidence == ATC_CONFIDENCE_NONE


# --- classify_document: general fallback tier ------------------------------

def test_general_fallback_keyword_match():
    confidence = classify_document(name="uploaded_document.pdf", url="", anchor_text="")
    assert confidence == ATC_CONFIDENCE_GENERAL_FALLBACK


def test_general_fallback_matches_on_anchor_text():
    confidence = classify_document(
        name="file123.pdf", url="", anchor_text="Buyer resource document"
    )
    assert confidence == ATC_CONFIDENCE_GENERAL_FALLBACK


# --- classify_document: no signal -------------------------------------------

def test_no_match_returns_zero():
    confidence = classify_document(name="drawing_layout.pdf", url="", anchor_text="")
    assert confidence == ATC_CONFIDENCE_NONE


def test_empty_inputs_return_zero():
    assert classify_document() == ATC_CONFIDENCE_NONE


# --- classify_document_weak_fallback ---------------------------------------

def test_weak_fallback_confidence_is_low():
    confidence = classify_document_weak_fallback()
    assert confidence == ATC_CONFIDENCE_WEAK_ANY_PDF
    assert confidence < ATC_CONFIDENCE_GENERAL_FALLBACK


# --- classify_self_as_atc ----------------------------------------------------

def test_self_atc_fulltext_keyword_match():
    text = "section-ii invitation for bid instructions to bidders ..."
    confidence = classify_self_as_atc("NIT_Document.pdf", text)
    assert confidence == ATC_CONFIDENCE_SELF_TEXT_MATCH


def test_self_atc_filename_fallback_match():
    confidence = classify_self_as_atc("Buyer_Special_Terms.pdf", "")
    assert confidence == ATC_CONFIDENCE_SELF_FILENAME_MATCH


def test_self_atc_no_match():
    confidence = classify_self_as_atc("Main_Tender_Document.pdf", "general scope of work description")
    assert confidence == ATC_CONFIDENCE_NONE


def test_real_sample_filename_has_no_false_positive_atc_signal():
    """
    Regression check against a real uploaded production filename from this
    repo (api/uploads/tendering/tender-documents/1788863681627_REAL_GAIL_Split_Morena.pdf).
    The real PDF is a scanned document with no extractable OCR text in this
    dev environment (no Tesseract installed), so page text is empty here --
    this only exercises the filename-fallback path, using the genuine
    filename rather than a synthetic one.
    """
    real_filename = "1788863681627_REAL_GAIL_Split_Morena.pdf"
    confidence = classify_self_as_atc(real_filename, "")
    assert confidence == ATC_CONFIDENCE_NONE


# --- classify_boq_filename (STEP 2, new) -------------------------------------

def test_boq_filename_explicit_keyword():
    assert classify_boq_filename(name="BOQ_Annexure_4.pdf") == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_filename_bill_of_quantities_phrase():
    assert classify_boq_filename(name="Bill of Quantities - Package 1.pdf") == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_filename_price_schedule_phrase():
    assert classify_boq_filename(url="https://bidplus.gem.gov.in/priceschedule.pdf") == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_filename_schedule_of_rates_phrase():
    assert classify_boq_filename(anchor_text="Schedule of Rates Annexure") == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_filename_no_match():
    # Bare "schedule" alone must NOT match -- only compound BOQ phrases should.
    assert classify_boq_filename(name="delivery_schedule.pdf") == BOQ_CONFIDENCE_NONE


def test_boq_filename_empty_inputs():
    assert classify_boq_filename() == BOQ_CONFIDENCE_NONE


# --- classify_boq_content (structural sniff, STEP 2, new) -------------------

def test_boq_content_strong_structural_match():
    text = (
        "Sl.No Item No Description of Goods Unit Quantity Rate Amount "
        "1 Steel Pipe DN100 Nos 50 1200 60000"
    )
    assert classify_boq_content(text) == BOQ_CONFIDENCE_STRUCTURAL_STRONG


def test_boq_content_weak_structural_match():
    # Only 2 header keywords present ("unit", "rate") -- not enough for strong confidence.
    text = "The unit rate shall be inclusive of all taxes."
    assert classify_boq_content(text) == BOQ_CONFIDENCE_STRUCTURAL_WEAK


def test_boq_content_single_generic_keyword_is_not_confident():
    # A single generic word like "unit" alone must not trigger any match.
    text = "Please deliver to the specified unit within 30 days."
    assert classify_boq_content(text) == BOQ_CONFIDENCE_NONE


def test_boq_content_no_match_on_unrelated_text():
    text = "This tender invites bids for the supply of office furniture."
    assert classify_boq_content(text) == BOQ_CONFIDENCE_NONE


def test_boq_content_empty_input():
    assert classify_boq_content("") == BOQ_CONFIDENCE_NONE


# --- classify_document_as_boq (combined, STEP 2, new) ------------------------

def test_boq_combined_takes_filename_signal_when_stronger():
    confidence = classify_document_as_boq(name="BOQ.pdf", page_text_combined="")
    assert confidence == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_combined_takes_structural_signal_when_filename_is_generic():
    text = (
        "Item No Description of Work Unit Quantity Rate Amount Total Price "
        "1 Excavation Cum 500 250 125000"
    )
    confidence = classify_document_as_boq(name="Annexure_3.pdf", page_text_combined=text)
    assert confidence == BOQ_CONFIDENCE_STRUCTURAL_STRONG


def test_boq_combined_weak_signals_do_not_stack_into_high_confidence():
    # Weak filename-adjacent hint ("schedule" alone, not a real match) plus a
    # weak structural hint (2 keywords) must NOT combine into a high score --
    # the combiner takes the max of the two signals, never adds them.
    confidence = classify_document_as_boq(
        name="delivery_schedule.pdf",
        page_text_combined="unit rate details attached separately",
    )
    assert confidence == BOQ_CONFIDENCE_STRUCTURAL_WEAK
    assert confidence < BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_boq_combined_no_signal_at_all():
    confidence = classify_document_as_boq(name="cover_letter.pdf", page_text_combined="dear sir/madam")
    assert confidence == BOQ_CONFIDENCE_NONE


# --- classify_document_as_main_tender (STEP 3, new) --------------------------

def test_main_tender_gem_structured_regex_match():
    text = "This bid is issued under GEM/2025/B/1234567 Bid Document terms."
    confidence = classify_document_as_main_tender(name="tender_doc.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED


def test_main_tender_gem_structured_via_bid_document_phrase():
    # classify_document_type also matches on the literal phrase "Bid Document"
    # even without the GEM/20xx/x/nnnn regex.
    text = "Please refer to the attached Bid Document for full terms."
    confidence = classify_document_as_main_tender(name="doc.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED


def test_main_tender_reference_id_pattern_tender_no():
    text = "Tender No: WCL/EE/MOR/2025-26/018 dated 01.04.2025"
    confidence = classify_document_as_main_tender(name="document.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_REFERENCE_ID


def test_main_tender_reference_id_pattern_nit_no():
    text = "NIT No - GAIL/PROJ/2025/00123 issued for open tender."
    confidence = classify_document_as_main_tender(name="document.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_REFERENCE_ID


def test_main_tender_invitation_for_bid_language():
    text = "This constitutes an Invitation for Bid under the applicable procurement rules."
    confidence = classify_document_as_main_tender(name="document.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD


def test_main_tender_notice_inviting_tender_language():
    text = "Notice Inviting Tender for supply of industrial equipment."
    confidence = classify_document_as_main_tender(name="document.pdf", page_text_combined=text)
    assert confidence == MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD


def test_main_tender_weak_filename_only_hint():
    confidence = classify_document_as_main_tender(name="NIT_Scan.pdf", page_text_combined="")
    assert confidence == MAIN_TENDER_CONFIDENCE_FILENAME_HINT
    # Deliberately weak -- below every content-based tier.
    assert confidence < MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD
    assert confidence < MAIN_TENDER_CONFIDENCE_REFERENCE_ID
    assert confidence < MAIN_TENDER_CONFIDENCE_GEM_STRUCTURED


def test_main_tender_no_signal_at_all():
    confidence = classify_document_as_main_tender(name="cover_letter.pdf", page_text_combined="Dear Sir/Madam,")
    assert confidence == MAIN_TENDER_CONFIDENCE_NONE


def test_main_tender_content_signal_beats_generic_filename():
    # A file with no NIT-ish filename hint but strong NIT content should
    # still classify confidently -- content, not the filename, drives this.
    text = "Notice Inviting Tender for civil works. Tender No: XYZ/2025/00987"
    confidence = classify_document_as_main_tender(name="scan_0001.pdf", page_text_combined=text)
    assert confidence >= MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD


def test_main_tender_and_atc_can_both_fire_on_the_same_text():
    """
    Documents this session's investigation finding: "invitation for bid" is
    shared between ATC_FULLTEXT_KEYWORDS (classify_self_as_atc) and
    MAIN_TENDER_TEXT_KEYWORDS (classify_document_as_main_tender) by design.
    A single real GeM PDF commonly carries both NIT and BDS/SCC (ATC-style)
    sections, so both classifiers legitimately firing on the same text is
    expected -- Step 4's needs-confirmation flow is what should resolve this
    ambiguity, not either classifier silently overriding the other.
    """
    text = "Invitation for Bid. Section-II Bid Data Sheet. Special Conditions of Contract."
    main_tender_confidence = classify_document_as_main_tender(name="doc.pdf", page_text_combined=text)
    atc_confidence = classify_self_as_atc("doc.pdf", text)
    assert main_tender_confidence == MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD
    assert atc_confidence == ATC_CONFIDENCE_SELF_TEXT_MATCH


# --- classify_document_category (STEP 4: combined + needs-confirmation) -----

def test_category_confident_main_tender():
    text = "NIT No - GAIL/PROJ/2025/00123 issued for open tender."
    result = classify_document_category(name="main_tender.pdf", page_text_combined=text)
    assert result.suggested_type == DOCUMENT_TYPE_MAIN_TENDER
    assert result.needs_confirmation is False
    assert result.reason == REASON_CONFIDENT
    assert result.confidence == MAIN_TENDER_CONFIDENCE_REFERENCE_ID
    assert result.scores[DOCUMENT_TYPE_ATC] == ATC_CONFIDENCE_NONE
    assert result.scores[DOCUMENT_TYPE_BOQ] == BOQ_CONFIDENCE_NONE


def test_category_confident_atc():
    result = classify_document_category(name="Buyer_Uploaded_ATC.pdf", page_text_combined="")
    assert result.suggested_type == DOCUMENT_TYPE_ATC
    assert result.needs_confirmation is False
    assert result.reason == REASON_CONFIDENT
    assert result.confidence == ATC_CONFIDENCE_HIGH_PRIORITY


def test_category_confident_boq():
    result = classify_document_category(name="Bill_of_Quantities.pdf", page_text_combined="")
    assert result.suggested_type == DOCUMENT_TYPE_BOQ
    assert result.needs_confirmation is False
    assert result.reason == REASON_CONFIDENT
    assert result.confidence == BOQ_CONFIDENCE_FILENAME_EXPLICIT


def test_category_low_confidence_all_zero_defaults_best_guess_to_other():
    """
    No category has any signal at all -- must still be surfaced as
    needs-confirmation (not silently finalized), with "other" as the
    best-guess label since there's genuinely nothing to point at.
    """
    result = classify_document_category(name="cover_letter.pdf", page_text_combined="Dear Sir/Madam,")
    assert result.suggested_type == DOCUMENT_TYPE_OTHER
    assert result.needs_confirmation is True
    assert result.reason == REASON_LOW_CONFIDENCE
    assert result.confidence == 0.0


def test_category_low_confidence_weak_signal_is_not_silently_finalized():
    """
    A weak signal (filename-only Main Tender hint, confidence 25) must still
    require confirmation -- the weak best guess is surfaced, not discarded,
    but it is NOT auto-tagged as final.
    """
    result = classify_document_category(name="NIT_Scan.pdf", page_text_combined="")
    assert result.suggested_type == DOCUMENT_TYPE_MAIN_TENDER
    assert result.needs_confirmation is True
    assert result.reason == REASON_LOW_CONFIDENCE
    assert result.confidence == MAIN_TENDER_CONFIDENCE_FILENAME_HINT


def test_category_ambiguous_when_two_categories_tie_above_threshold():
    """
    Regression for the documented ATC/Main-Tender "Invitation for Bid"
    overlap (Step 3): both categories clear the confidence threshold on
    their own, but they're tied, so this must be flagged ambiguous rather
    than silently picking one.
    """
    text = "Invitation for Bid. Section-II Bid Data Sheet. Special Conditions of Contract."
    result = classify_document_category(name="combined_doc.pdf", page_text_combined=text)
    assert result.needs_confirmation is True
    assert result.reason == REASON_AMBIGUOUS
    assert result.scores[DOCUMENT_TYPE_MAIN_TENDER] == MAIN_TENDER_CONFIDENCE_TEXT_KEYWORD
    assert result.scores[DOCUMENT_TYPE_ATC] == ATC_CONFIDENCE_SELF_TEXT_MATCH
    assert abs(result.scores[DOCUMENT_TYPE_MAIN_TENDER] - result.scores[DOCUMENT_TYPE_ATC]) < CLASSIFICATION_AMBIGUITY_GAP


def test_category_confident_when_gap_is_wide_enough():
    # Reference-ID tier (85) vs. nothing (0) -- comfortably past the ambiguity gap.
    text = "Tender No: WCL/EE/MOR/2025-26/018 dated 01.04.2025"
    result = classify_document_category(name="tender.pdf", page_text_combined=text)
    assert result.needs_confirmation is False
    assert result.reason == REASON_CONFIDENT
    assert result.suggested_type == DOCUMENT_TYPE_MAIN_TENDER
