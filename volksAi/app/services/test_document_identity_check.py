"""
Main tender vs ATC identity cross-check.

Fixture numbers are the real pair from tender 3629: the Noida main tender states
GEM/2025/B/7017046, while the ATC attached to it (ATcSPlit.pdf) states Morena's
GEM/2025/B/7021103 (plus a stale GEM/2024/B/4774825 in two bidder-letter
templates, and TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025 throughout).

No LLM calls: LLM_FALLBACK_ENABLED is forced off for the end-to-end cases.
"""
import fitz
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.pdf_parent_ingest import (
    build_document_identity_check,
    extract_document_identity,
    ingest_parent_tender_pdf,
)

NOIDA_GEM = "GEM/2025/B/7017046"
MORENA_GEM = "GEM/2025/B/7021103"


def _pages(*texts):
    return [{"page": i + 1, "text": t} for i, t in enumerate(texts)]


MORENA_MAIN = _pages(
    f"Bid Details  Bid Number: {MORENA_GEM}  Dated: 19-12-2025",
    f"Bid Number: {MORENA_GEM}  Buyer Added Bid Specific ATC",
)
MORENA_ATC = _pages(
    f"TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025  GeM Bid No.: {MORENA_GEM}",
    "TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025  SECTION-II BID EVALUATION CRITERIA",
    f"TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025  GeM Bid No.: {MORENA_GEM}",
    "To, M/s GAIL (INDIA) LIMITED, VIJAIPUR  TENDER NO: GEM/2024/B/4774825 DATED 19.12.2025",
)
NOIDA_MAIN = _pages(
    f"Bid Details  Bid Number: {NOIDA_GEM}",
    f"Bid Number: {NOIDA_GEM}  EMD Amount 100000",
    f"Bid Number: {NOIDA_GEM}  Buyer uploaded ATC document",
)


# ── extraction of a document's own number ───────────────────────────────────

def test_extracts_most_frequent_gem_number_and_ignores_stale_template_reference():
    ident = extract_document_identity(MORENA_ATC)
    assert ident["gem_bid_number"] == MORENA_GEM
    assert ident["gem_bid_numbers"][MORENA_GEM] == 2
    assert ident["gem_bid_numbers"]["GEM/2024/B/4774825"] == 1
    assert ident["tender_number"] == "GAIL/KL/C&P/P25258/DG/MECH/2025"


def test_tender_no_pattern_does_not_double_count_gem_numbers():
    ident = extract_document_identity(_pages("TENDER NO: GEM/2024/B/4774825"))
    assert ident["gem_bid_number"] == "GEM/2024/B/4774825"
    assert ident["tender_number"] is None


def test_document_without_numbers_yields_none():
    ident = extract_document_identity(_pages("SPECIAL CONDITIONS OF CONTRACT  Terms of payment 80%"))
    assert ident["gem_bid_number"] is None and ident["tender_number"] is None


# ── 2e (a) matching numbers -> match: true ──────────────────────────────────

def test_matching_numbers_give_match_true():
    check = build_document_identity_check(
        extract_document_identity(MORENA_MAIN), extract_document_identity(MORENA_ATC), has_atc=True
    )
    assert check["match"] is True
    assert check["status"] == "match"
    assert check["basis"] == "gem_bid_number"
    assert check["mainDocumentNumber"] == MORENA_GEM
    assert check["atcDocumentNumber"] == MORENA_GEM


# ── 2e (b) Noida main + Morena ATC -> match: false with both numbers ────────

def test_noida_main_with_morena_atc_gives_match_false_with_both_numbers():
    check = build_document_identity_check(
        extract_document_identity(NOIDA_MAIN), extract_document_identity(MORENA_ATC), has_atc=True
    )
    assert check["match"] is False
    assert check["status"] == "mismatch"
    assert check["mainDocumentNumber"] == NOIDA_GEM
    assert check["atcDocumentNumber"] == MORENA_GEM
    assert NOIDA_GEM in check["mainNumbersFound"]
    assert MORENA_GEM in check["atcNumbersFound"]


# ── 2e (c) ATC with no extractable number -> match: null ────────────────────

def test_atc_without_number_is_unverifiable_not_a_mismatch():
    atc = _pages("SPECIAL CONDITIONS OF CONTRACT", "Terms of Payment: 80% on delivery")
    check = build_document_identity_check(
        extract_document_identity(NOIDA_MAIN), extract_document_identity(atc), has_atc=True
    )
    assert check["match"] is None
    assert check["status"] == "unverifiable"
    assert check["mainDocumentNumber"] == NOIDA_GEM
    assert check["atcDocumentNumber"] is None


def test_gem_only_main_and_tender_no_only_atc_is_unverifiable_not_mismatch():
    """Different kinds of identifier cannot be compared; do not claim a mismatch."""
    atc = _pages("TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025")
    check = build_document_identity_check(
        extract_document_identity(NOIDA_MAIN), extract_document_identity(atc), has_atc=True
    )
    assert check["match"] is None


def test_tender_number_basis_used_when_no_gem_numbers():
    main = _pages("TENDER NO.: NTPC/PAT/2026/0042 Notice Inviting Tender")
    atc_same = _pages("TENDER NO.: NTPC/PAT/2026/0042 Special conditions")
    atc_other = _pages("TENDER NO.: BPCL/JHJ/2026/0999 Special conditions")
    same = build_document_identity_check(extract_document_identity(main), extract_document_identity(atc_same), has_atc=True)
    other = build_document_identity_check(extract_document_identity(main), extract_document_identity(atc_other), has_atc=True)
    assert same["match"] is True and same["basis"] == "tender_number"
    assert other["match"] is False and other["atcDocumentNumber"] == "BPCL/JHJ/2026/0999"


def test_no_atc_and_same_document_are_reported_not_matched():
    main_ident = extract_document_identity(NOIDA_MAIN)
    no_atc = build_document_identity_check(main_ident, None, has_atc=False)
    assert no_atc["match"] is None and no_atc["status"] == "no_atc"
    assert no_atc["mainDocumentNumber"] == NOIDA_GEM
    same = build_document_identity_check(main_ident, main_ident, has_atc=True, same_document=True)
    assert same["match"] is None and same["status"] == "same_document"


# ── wiring: ingest_parent_tender_pdf and /extract carry the check ──────────

def _pdf(tmp_path, name, pages_text):
    doc = fitz.open()
    for t in pages_text:
        page = doc.new_page()
        page.insert_text((72, 72), t, fontsize=10)
    path = tmp_path / name
    doc.save(str(path))
    doc.close()
    return path


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "false")


def test_ingest_reports_mismatch_without_blocking_extraction(tmp_path):
    main = _pdf(tmp_path, "noida_main.pdf", [p["text"] for p in NOIDA_MAIN])
    atc = _pdf(tmp_path, "morena_atc.pdf", [p["text"] for p in MORENA_ATC])
    result = ingest_parent_tender_pdf(
        job_id="identity-mismatch", pdf_path=main, original_filename="noida_main.pdf", explicit_atc_paths=[atc]
    )
    check = result["_document_identity_check"]
    assert check["match"] is False
    assert check["mainDocumentNumber"] == NOIDA_GEM
    assert check["atcDocumentNumber"] == MORENA_GEM
    # Extraction still ran to completion.
    assert "emd_amount_display" in result


def test_ingest_reports_match_for_correct_pair(tmp_path):
    main = _pdf(tmp_path, "morena_main.pdf", [p["text"] for p in MORENA_MAIN])
    atc = _pdf(tmp_path, "morena_atc.pdf", [p["text"] for p in MORENA_ATC])
    result = ingest_parent_tender_pdf(
        job_id="identity-match", pdf_path=main, original_filename="morena_main.pdf", explicit_atc_paths=[atc]
    )
    assert result["_document_identity_check"]["match"] is True


def test_ingest_without_atc_still_populates_check(tmp_path):
    main = _pdf(tmp_path, "noida_main.pdf", [f"Bid Details  Bid Number: {NOIDA_GEM}", f"Bid Number: {NOIDA_GEM}"])
    result = ingest_parent_tender_pdf(job_id="identity-no-atc", pdf_path=main, original_filename="noida_main.pdf")
    check = result["_document_identity_check"]
    assert check["status"] == "no_atc" and check["match"] is None
    assert check["mainDocumentNumber"] == NOIDA_GEM


def test_ingest_self_classified_atc_is_same_document_not_a_match(tmp_path):
    """A main PDF that mentions its buyer ATC gets treated as its own ATC; comparing it with itself proves nothing."""
    main = _pdf(tmp_path, "noida_main.pdf", [p["text"] for p in NOIDA_MAIN])
    result = ingest_parent_tender_pdf(job_id="identity-self", pdf_path=main, original_filename="noida_main.pdf")
    check = result["_document_identity_check"]
    assert check["status"] == "same_document"
    assert check["match"] is None
    assert check["atcDocumentNumber"] is None


def test_extract_endpoint_always_returns_document_identity_check():
    client = TestClient(app)
    mismatch = build_document_identity_check(
        extract_document_identity(NOIDA_MAIN), extract_document_identity(MORENA_ATC), has_atc=True
    )
    for ingest_result, expected_match in (
        ({"_document_identity_check": mismatch, "_has_atc": True}, False),
        ({"_has_atc": True}, None),  # older ingest output without the key: still populated, unverifiable
    ):
        with patch("app.routers.extract.ingest_parent_tender_pdf", return_value=ingest_result):
            response = client.post("/extract", files={"pdf_file": ("t.pdf", b"%PDF-1.4", "application/pdf")})
        assert response.status_code == 200
        body = response.json()
        assert "documentIdentityCheck" in body
        assert body["documentIdentityCheck"]["match"] is expected_match
