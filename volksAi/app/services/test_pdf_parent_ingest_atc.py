"""
Regression test for the "atc_files/boq_file accepted-but-silently-dropped"
bug: extract.py's /extract endpoint declared only `pdf_file` + `user_id` as
accepted parameters, so the ATC/BOQ multipart fields the NestJS worker sent
were never bound to anything and vanished -- ingest_parent_tender_pdf() ran
on the main PDF alone on every single extraction.

This test proves more than "no error was raised" -- it proves the ATC
file's CONTENT actually changes a real, deterministically-resolved field
in the returned info sheet data. It deliberately avoids the Anthropic LLM
fallback layer (LLM_FALLBACK_ENABLED=false) so it stays fast, free, and
fully deterministic: the signal used here (`maf_required_display`) is
resolved by a plain regex/keyword check in tender_mapper.py, not an LLM
call, so a real change in behavior proves the ATC text reached the
pipeline rather than merely being accepted by the function signature.
"""

import os
import fitz
import pytest

from app.services.pdf_parent_ingest import ingest_parent_tender_pdf

# Force-disable the LLM fallback layer for this test: the signal we assert on
# (maf_required_display) is resolved deterministically before Layer 2 ever
# runs, and disabling it keeps this test free of any Anthropic API dependency.
os.environ["LLM_FALLBACK_ENABLED"] = "false"

MAIN_PDF_TEXT = (
    "NIT No: TEST/2026/001\n"
    "Notice Inviting Tender for supply of industrial equipment.\n"
    "Tender Fee: Rs. 5000. EMD Amount: Rs. 50000.\n"
    "Bid Submission Deadline: 30.09.2026.\n"
)

# Deliberately contains NO OEM/manufacturer-authorization language -- this
# phrase only exists in the ATC-only content below.
ATC_ONLY_TEXT = (
    "SPECIAL CONDITIONS OF CONTRACT\n"
    "The bidder must submit a valid OEM Authorization Certificate along with the bid.\n"
    "Terms of Payment: 80% of supply value on delivery, balance 20% on installation.\n"
)


def _build_pdf(tmp_path, filename: str, text: str):
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=11)
    pdf_path = tmp_path / filename
    doc.save(str(pdf_path))
    doc.close()
    return pdf_path


@pytest.fixture
def main_pdf(tmp_path):
    return _build_pdf(tmp_path, "main_tender.pdf", MAIN_PDF_TEXT)


@pytest.fixture
def atc_pdf(tmp_path):
    return _build_pdf(tmp_path, "atc_document.pdf", ATC_ONLY_TEXT)


def _is_maf_resolved_true(value) -> bool:
    """
    maf_required_display resolves to the raw Layer-1 boolean `True` when the
    "MAF Required" field is picked up directly from sections (rather than
    going through the "Yes" / "Yes — <qualifier>" dynamic-BEC-check string
    path) -- both are valid positive resolutions. This normalizes either
    shape so the test asserts on "did it resolve positively", not on which
    of the two valid code paths produced that positive resolution.
    """
    return str(value).strip().lower() in ("true", "yes") or str(value).strip().lower().startswith("yes")


def test_atc_content_is_dropped_without_the_fix(main_pdf):
    """
    Baseline: with no explicit_atc_paths (the pre-fix behavior when the API
    endpoint didn't forward them at all), the OEM/MAF signal that only lives
    in the ATC text is absent, so maf_required_display must NOT resolve
    positively (it stays at its missing/placeholder value).
    """
    result = ingest_parent_tender_pdf(
        job_id="test-job-baseline",
        pdf_path=main_pdf,
        original_filename="main_tender.pdf",
    )
    assert not _is_maf_resolved_true(result.get("maf_required_display"))


def test_atc_content_actually_contributes_when_explicitly_provided(main_pdf, atc_pdf):
    """
    The actual regression guard: passing explicit_atc_paths must make the
    ATC file's own content participate in extraction -- not just be accepted
    without error. maf_required_display is resolved via a deterministic
    regex/keyword check (tender_mapper.py) against the combined main+ATC
    text, so a positive resolution here proves the ATC text was actually
    read and merged, not merely that the call didn't raise.
    """
    result = ingest_parent_tender_pdf(
        job_id="test-job-with-atc",
        pdf_path=main_pdf,
        original_filename="main_tender.pdf",
        explicit_atc_paths=[atc_pdf],
    )
    assert _is_maf_resolved_true(result.get("maf_required_display")), (
        f"Expected ATC content to resolve maf_required_display positively, got: {result.get('maf_required_display')!r}"
    )


def test_multiple_explicit_atc_files_all_contribute(main_pdf, atc_pdf, tmp_path):
    """
    A second explicit ATC file (beyond the first) must also have its text
    merged in, not just the first one in the list. Uses a second,
    independent deterministic signal (reverse_auction_applicable_display)
    so this doesn't just re-check the first file's own signal.
    """
    second_atc_text = "Additional ATC Annexure.\nReverse Auction Applicable: Yes\n"
    second_atc_pdf = _build_pdf(tmp_path, "atc_annexure_2.pdf", second_atc_text)

    result = ingest_parent_tender_pdf(
        job_id="test-job-multi-atc",
        pdf_path=main_pdf,
        original_filename="main_tender.pdf",
        explicit_atc_paths=[atc_pdf, second_atc_pdf],
    )
    # First ATC file's signal still resolves correctly...
    assert _is_maf_resolved_true(result.get("maf_required_display"))
    # ...and the second explicit ATC file's own distinct signal also resolves,
    # proving its text was merged in too, not just the first file in the list.
    assert result.get("reverse_auction_applicable_display") == "Yes"


def test_boq_file_is_no_longer_silently_dropped(main_pdf, tmp_path):
    """
    An explicit BOQ file (no ATC at all) must also have its content merged
    in -- this is the independent code path added outside the `if atc_path`
    block, since a tender can have a BOQ with no ATC.

    Note: unlike the ATC path, BOQ text is only merged into the generic
    combined-text pool (all_pages), not run through resolve_atc_anchor_fields()
    -- there is no BOQ-specific field-precedence system yet (see the comment
    in pdf_parent_ingest.py). So this uses phrasing that matches the
    `bec_maf_pattern` regex directly against the combined full_text
    (tender_mapper.py), which is exactly the path BOQ content now reaches.
    """
    boq_text = "BILL OF QUANTITIES\nThe bidder must be a Manufacturer of the offered goods.\n"
    boq_pdf = _build_pdf(tmp_path, "boq.pdf", boq_text)

    result = ingest_parent_tender_pdf(
        job_id="test-job-boq-only",
        pdf_path=main_pdf,
        original_filename="main_tender.pdf",
        explicit_boq_path=boq_pdf,
    )
    assert _is_maf_resolved_true(result.get("maf_required_display"))
