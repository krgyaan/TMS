"""
Citation honesty: a field's `sources` must either point at a verified page that
supports the field's final value, or say explicitly that its location is not
verified. It must never fabricate page 1, and never keep a stale Layer-1
snapshot after the value was overwritten (regex BEC merge, Role 1 / Role 2 LLM).

ingest_parent_tender_pdf is mocked throughout -- no PDF parsing, no LLM calls.
"""
import json
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.routers.extract import (
    UNLOCATED_NO_PAGE,
    UNLOCATED_NO_SOURCE_RECORD,
    UNLOCATED_VALUE_CHANGED,
    _format_field_object,
)
from app.services.field_extractor import _verified_source_page
from app.services.pdf_parent_ingest import _collect_field_snapshots, _find_atc_anchor_citation

client = TestClient(app)


def _extract(mock_infosheet_data):
    with patch("app.routers.extract.ingest_parent_tender_pdf", return_value=mock_infosheet_data):
        response = client.post(
            "/extract",
            files={"pdf_file": ("tender.pdf", b"%PDF-1.4 mock", "application/pdf")},
        )
    assert response.status_code == 200
    return response.json()


def _assert_no_fabricated_page(sources):
    for slot in ("main_tender", "atc", "unlocated"):
        item = sources.get(slot)
        if item is not None and not item.get("located"):
            assert item.get("page") is None, f"{slot} carries a page without being located: {item}"


# ── (a) snapshot exists, final value differs -> unlocated, not stale ──────────

def test_llm_overwrite_after_snapshot_yields_unlocated_citation_not_stale_one():
    """Noida/tender 3629 shape: Layer 1 captured 'Not Applicable' on page 5; Role 1 LLM later wrote 'Rs. 61.00 Lac'."""
    data = _extract({
        "order_value_1_display": "Rs. 61.00 Lac",
        "_info_sheet_statuses": {"order_value_1_display": "OK_FALLBACK"},
        "_info_sheet_sources": {"order_value_1_display": "llm"},
        "_dual_sources": {
            "order_value_1": {
                "self_classified_atc": False,
                "has_conflict": False,
                "main_tender": {"value": "Not Applicable", "raw_value": "Not Applicable", "page": 5,
                                "snippet": "BEC-Financial Criteria: NOT APPLICABLE"},
                "atc": None,
            },
        },
        "_self_classified_atc": False,
        "_has_atc": True,
    })
    field = data["fields"]["orderValue1"]
    assert field["source"] == "llm"
    sources = field["sources"]
    assert sources["main_tender"] is None, "stale page-5 snapshot must not be cited for the LLM value"
    assert sources["atc"] is None
    assert sources["located"] is False
    unloc = sources["unlocated"]
    assert unloc["located"] is False
    assert unloc["page"] is None and unloc["snippet"] is None
    assert unloc["unlocated_reason"] == UNLOCATED_VALUE_CHANGED
    assert unloc["document"] is None  # LLM value: no document attribution
    assert unloc["value"] == field["value"]


def test_regex_overwrite_with_different_number_yields_unlocated_citation():
    """Snapshot said 2.9 Lacs on page 7, but the final value was replaced by a different figure."""
    data = _extract({
        "order_value_1_display": "Rs. 5.31 Lakhs",
        "_info_sheet_statuses": {"order_value_1_display": "OK"},
        "_info_sheet_sources": {"order_value_1_display": "main_tender"},
        "_dual_sources": {
            "order_value_1": {
                "main_tender": {"value": "INR 2.9 Lacs", "raw_value": "INR 2.9 Lacs", "page": 7,
                                "snippet": "Work order value of INR 2.9 Lacs"},
                "atc": None,
            },
        },
        "_has_atc": False,
    })
    sources = data["fields"]["orderValue1"]["sources"]
    assert sources["main_tender"] is None
    assert sources["unlocated"]["unlocated_reason"] == UNLOCATED_VALUE_CHANGED
    assert sources["unlocated"]["document"] == "main_tender"
    _assert_no_fabricated_page(sources)


def test_role2_override_of_conflicting_values_invalidates_both_snapshots():
    """Main said 90, ATC said 120, Role 2 overrode to 150: neither page supports 150."""
    obj = _format_field_object(
        tms_key="deliveryTimeSupply",
        dto_value=150,
        source_field_name="delivery_time_supply_display",
        field_statuses={"delivery_time_supply_display": "OK_FALLBACK"},
        field_sources={"delivery_time_supply_display": "llm_override"},
        dual_sources={
            "delivery_time_supply": {
                "main_tender": {"value": "90 Days", "page": 4, "snippet": "Delivery: 90 days"},
                "atc": {"value": "120 Days", "page": 11, "snippet": "Delivery period 120 days"},
            }
        },
        is_self_classified_atc=False,
        has_atc=True,
    )
    s = obj["sources"]
    assert s["main_tender"] is None and s["atc"] is None
    assert s["has_conflict"] is False
    assert s["unlocated"]["unlocated_reason"] == UNLOCATED_VALUE_CHANGED


# ── (b) genuine, correctly matched citation still renders normally ───────────

def test_genuine_matching_citation_is_kept_and_located():
    data = _extract({
        "tender_value_display": "1000000.0",
        "_info_sheet_statuses": {"tender_value_display": "OK"},
        "_info_sheet_sources": {"tender_value_display": "main_tender"},
        "_dual_sources": {
            "tenderValue": {
                "main_tender": {"value": 1000000.0, "raw_value": "Rs. 10,00,000", "page": 2,
                                "snippet": "Estimated Tender Value: Rs. 10,00,000"},
                "atc": None,
            },
        },
        "_has_atc": False,
    })
    sources = data["fields"]["tenderValue"]["sources"]
    assert sources["located"] is True
    assert sources["unlocated"] is None
    assert sources["main_tender"]["page"] == 2
    assert sources["main_tender"]["located"] is True
    assert "10,00,000" in sources["main_tender"]["snippet"]


def test_genuine_conflict_is_kept_when_final_value_matches_one_side():
    """ATC supersedes main: the main-tender record is a real disagreeing citation, not stale."""
    data = _extract({
        "emd_amount_display": "50000.0",
        "_info_sheet_statuses": {"emd_amount_display": "OK"},
        "_info_sheet_sources": {"emd_amount_display": "atc"},
        "_dual_sources": {
            "emdAmount": {
                "main_tender": {"value": 100000.0, "page": 3, "snippet": "EMD Amount: Rs. 1,00,000"},
                "atc": {"value": 50000.0, "page": 9, "snippet": "Revised EMD: Rs. 50,000"},
            },
        },
        "_has_atc": True,
    })
    sources = data["fields"]["emdAmount"]["sources"]
    assert sources["has_conflict"] is True
    assert sources["main_tender"]["page"] == 3 and sources["main_tender"]["located"] is True
    assert sources["atc"]["page"] == 9 and sources["atc"]["located"] is True
    assert sources["unlocated"] is None


def test_matching_text_without_page_is_kept_as_unlocated_with_snippet():
    obj = _format_field_object(
        tms_key="bidValidityDays",
        dto_value=90,
        source_field_name="bid_validity_days_display",
        field_statuses={"bid_validity_days_display": "OK"},
        field_sources={"bid_validity_days_display": "main_tender"},
        dual_sources={"bid_validity_days": {"main_tender": {"value": "90", "page": None,
                                                            "snippet": "Bid Offer Validity 90 (Days)"}}},
    )
    main = obj["sources"]["main_tender"]
    assert main["located"] is False
    assert main["page"] is None
    assert main["unlocated_reason"] == UNLOCATED_NO_PAGE
    assert main["snippet"] == "Bid Offer Validity 90 (Days)"
    assert obj["sources"]["located"] is False


# ── (c) no snapshot at all -> unlocated, never fabricated page 1 ─────────────

def test_no_snapshot_main_only_tender_is_unlocated_not_page_one():
    data = _extract({
        "bid_validity_days_display": "90",
        "_info_sheet_statuses": {"bid_validity_days_display": "OK"},
        "_info_sheet_sources": {"bid_validity_days_display": "main_tender"},
        "_dual_sources": {},
        "_has_atc": False,
    })
    sources = data["fields"]["bidValidityDays"]["sources"]
    assert sources["main_tender"] is None and sources["atc"] is None
    assert sources["unlocated"]["unlocated_reason"] == UNLOCATED_NO_SOURCE_RECORD
    assert sources["unlocated"]["page"] is None
    assert sources["unlocated"]["document"] == "main_tender"
    # Nothing in any field's sources may carry an unverified page number.
    for f in data["fields"].values():
        if f.get("sources"):
            _assert_no_fabricated_page(f["sources"])
    assert '"page": 1' not in json.dumps(data)


def test_no_snapshot_llm_value_with_atc_is_unlocated_with_no_document():
    obj = _format_field_object(
        tms_key="avgAnnualTurnoverValue",
        dto_value=5000000000.0,
        source_field_name="avg_annual_turnover_value_display",
        field_statuses={"avg_annual_turnover_value_display": "OK_FALLBACK"},
        field_sources={"avg_annual_turnover_value_display": "llm"},
        dual_sources={},
        has_atc=True,
    )
    unloc = obj["sources"]["unlocated"]
    assert unloc["page"] is None and unloc["document"] is None
    assert unloc["unlocated_reason"] == UNLOCATED_NO_SOURCE_RECORD


def test_no_snapshot_self_classified_atc_is_unlocated_not_page_one():
    obj = _format_field_object(
        tms_key="emdAmount",
        dto_value=75000.0,
        source_field_name="emd_amount_display",
        field_statuses={"emd_amount_display": "OK"},
        field_sources={"emd_amount_display": "atc"},
        dual_sources={},
        is_self_classified_atc=True,
        has_atc=True,
    )
    s = obj["sources"]
    assert s["atc"] is None and s["main_tender"] is None
    assert s["unlocated"]["document"] == "atc"
    assert s["unlocated"]["page"] is None


def test_missing_field_gets_no_citation_at_all():
    obj = _format_field_object(
        tms_key="bidValidityDays",
        dto_value=None,
        source_field_name="bid_validity_days_display",
        field_statuses={"bid_validity_days_display": "MISSING"},
        field_sources={},
        dual_sources={},
    )
    s = obj["sources"]
    assert s["main_tender"] is None and s["atc"] is None and s["unlocated"] is None


# ── Upstream: Layer-1 page capture no longer defaults to page 1 ──────────────

def test_verified_source_page_prefers_source_blocks():
    f = SimpleNamespace(source_page=1, source_blocks=[SimpleNamespace(page_number=7)])
    assert _verified_source_page(f) == 7


def test_verified_source_page_treats_bare_placeholder_one_as_unknown():
    f = SimpleNamespace(source_page=1, source_blocks=[])
    assert _verified_source_page(f) is None


def test_verified_source_page_keeps_computed_page():
    f = SimpleNamespace(source_page=12, source_blocks=[])
    assert _verified_source_page(f) == 12


def test_snapshot_without_source_page_records_none():
    snap = _collect_field_snapshots([{"fields": [{"label": "EMD Amount", "value": "50000"}]}])
    assert snap["EMD Amount"]["page"] is None


def test_atc_anchor_not_found_returns_no_page():
    pages = [{"page": 1, "text": "Unrelated cover page text"}, {"page": 2, "text": "More unrelated text"}]
    assert _find_atc_anchor_citation("reverse_auction", pages) == (None, "")
    assert _find_atc_anchor_citation("reverse_auction", []) == (None, "")


def test_atc_anchor_found_returns_real_page():
    pages = [{"page": 1, "text": "Cover"}, {"page": 4, "text": "Reverse Auction shall be applicable"}]
    page, snippet = _find_atc_anchor_citation("reverse_auction", pages)
    assert page == 4 and "Reverse Auction" in snippet
