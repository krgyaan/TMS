"""
Tests for the new bidding-requirements capability:
  - build_page_tagged_text() (pdf_parent_ingest.py)
  - analyze_bidding_requirements() (bidding_requirements_resolver.py, Role 3)
  - the /analyze-bidding-requirements router endpoint

Anthropic calls are mocked throughout -- no real API calls or PDF parsing.
Does not exercise or modify /extract, ingest_parent_tender_pdf(), or
build_infosheet_data().
"""
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.pdf_parent_ingest import build_page_tagged_text
from app.services.bidding_requirements_resolver import analyze_bidding_requirements

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# 1. build_page_tagged_text()
# ─────────────────────────────────────────────────────────────────────────────

def test_build_page_tagged_text_main_and_atc():
    """Main and ATC pages are each labeled by document and page number, main first."""
    page_texts = [
        {"page": 1, "text": "Invitation for Bids."},
        {"page": 2, "text": "Bid Evaluation Criteria."},
    ]
    atc_page_texts = [
        {"page": 1, "text": "Amendment: Pre-Bid Meeting rescheduled."},
    ]
    result = build_page_tagged_text(page_texts, atc_page_texts)
    assert "[Main Page 1]: Invitation for Bids." in result
    assert "[Main Page 2]: Bid Evaluation Criteria." in result
    assert "[ATC Page 1]: Amendment: Pre-Bid Meeting rescheduled." in result
    # Main pages appear before ATC pages
    assert result.index("[Main Page 2]") < result.index("[ATC Page 1]")


def test_build_page_tagged_text_main_only_no_atc():
    """Works with only main-document pages when there is no ATC document."""
    page_texts = [{"page": 1, "text": "Supply of Valves and Actuators."}]
    result = build_page_tagged_text(page_texts, None)
    assert result == "[Main Page 1]: Supply of Valves and Actuators."
    assert "[ATC" not in result


def test_build_page_tagged_text_empty_input():
    """Empty/None input produces an empty string, not an error."""
    assert build_page_tagged_text([], []) == ""
    assert build_page_tagged_text([], None) == ""


def test_build_page_tagged_text_skips_blank_pages():
    """Pages with empty/whitespace-only text contribute no labeled block."""
    page_texts = [{"page": 1, "text": "   "}, {"page": 2, "text": "Real content."}]
    result = build_page_tagged_text(page_texts)
    assert "[Main Page 1]" not in result
    assert "[Main Page 2]: Real content." in result


def test_build_page_tagged_text_does_not_mutate_inputs():
    """The function is a read-only consumer -- inputs must be unchanged after the call."""
    page_texts = [{"page": 1, "text": "Original"}]
    atc_page_texts = [{"page": 1, "text": "ATC Original"}]
    page_texts_copy = [dict(p) for p in page_texts]
    atc_page_texts_copy = [dict(p) for p in atc_page_texts]

    build_page_tagged_text(page_texts, atc_page_texts)

    assert page_texts == page_texts_copy
    assert atc_page_texts == atc_page_texts_copy


# ─────────────────────────────────────────────────────────────────────────────
# 2. analyze_bidding_requirements() (Role 3, mocked Anthropic client)
# ─────────────────────────────────────────────────────────────────────────────

def _mock_anthropic_response(requirements):
    tool_block = SimpleNamespace(
        type="tool_use",
        name="report_bidding_requirements",
        input={"requirements": requirements},
    )
    usage = SimpleNamespace(
        input_tokens=500, output_tokens=200,
        cache_creation_input_tokens=0, cache_read_input_tokens=0,
    )
    return SimpleNamespace(content=[tool_block], usage=usage)


def test_analyze_bidding_requirements_empty_text_returns_no_api_call():
    """Empty page-tagged text short-circuits without calling the Anthropic API."""
    result = analyze_bidding_requirements("", library_documents=[])
    assert result == {"requirements": [], "usage": None}


def test_analyze_bidding_requirements_missing_api_key_raises():
    """A missing/placeholder API key raises RuntimeError (mirrors LLMFieldResolver)."""
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        analyze_bidding_requirements(
            "[Main Page 1]: Some tender text.",
            library_documents=[],
            api_key="placeholder",
        )


def test_analyze_bidding_requirements_parses_oem_and_standard_items():
    """OEM and standard-category requirements are parsed with their citations and matches."""
    mock_requirements = [
        {
            "documentName": "OEM Authorization Certificate",
            "category": "oem",
            "required": True,
            "source": {"document": "main", "page": 3, "snippet": "Bidder must submit OEM Authorization Certificate"},
            "matchedLibraryId": None,
            "confidence": "high",
            "reasoning": "Explicit BEC requirement for authorized dealers.",
        },
        {
            "documentName": "GST Registration Certificate",
            "category": "standard",
            "required": True,
            "source": {"document": "main", "page": 5, "snippet": "Valid GST registration to be enclosed"},
            "matchedLibraryId": "lib-42",
            "confidence": "high",
            "reasoning": "Matches library entry 'GST Certificate'.",
        },
    ]
    mock_response = _mock_anthropic_response(mock_requirements)

    with patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        result = analyze_bidding_requirements(
            "[Main Page 3]: Bidder must submit OEM Authorization Certificate.\n\n"
            "[Main Page 5]: Valid GST registration to be enclosed.",
            library_documents=[{"id": "lib-42", "document_name": "GST Certificate", "document_type": "Statutory"}],
            api_key="sk-ant-test-key",
        )

    assert len(result["requirements"]) == 2
    oem_item = result["requirements"][0]
    assert oem_item["category"] == "oem"
    assert oem_item["matchedLibraryId"] is None
    assert oem_item["source"]["document"] == "main"
    assert oem_item["source"]["page"] == 3

    standard_item = result["requirements"][1]
    assert standard_item["category"] == "standard"
    assert standard_item["matchedLibraryId"] == "lib-42"

    assert result["usage"]["input_tokens"] == 500
    assert result["usage"]["output_tokens"] == 200
    assert result["usage"]["estimated_cost_usd"] > 0


def test_analyze_bidding_requirements_forces_null_match_for_oem_even_if_model_errs():
    """Defensive guard: an OEM item is never allowed to carry a library match, even if the model returns one."""
    mock_requirements = [
        {
            "documentName": "Type Test Report",
            "category": "oem",
            "required": True,
            "source": {"document": "atc", "page": 2, "snippet": "Type Test Report from NABL lab required"},
            "matchedLibraryId": "lib-99",  # model incorrectly returned a match
            "confidence": "medium",
            "reasoning": "ATC amendment adds type-testing requirement.",
        },
    ]
    mock_response = _mock_anthropic_response(mock_requirements)

    with patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_response
        result = analyze_bidding_requirements(
            "[ATC Page 2]: Type Test Report from NABL lab required.",
            library_documents=[{"id": "lib-99", "document_name": "Unrelated Doc", "document_type": "Other"}],
            api_key="sk-ant-test-key",
        )

    assert result["requirements"][0]["matchedLibraryId"] is None


# ─────────────────────────────────────────────────────────────────────────────
# 3. /analyze-bidding-requirements router endpoint
# ─────────────────────────────────────────────────────────────────────────────

def test_analyze_bidding_requirements_endpoint_rejects_non_pdf():
    response = client.post(
        "/analyze-bidding-requirements",
        files={"pdf_file": ("notes.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


def test_analyze_bidding_requirements_endpoint_rejects_invalid_library_json():
    response = client.post(
        "/analyze-bidding-requirements",
        files={"pdf_file": ("tender.pdf", b"%PDF-1.4 mock content", "application/pdf")},
        data={"library_documents": "{not valid json"},
    )
    assert response.status_code == 400


def test_analyze_bidding_requirements_endpoint_happy_path_main_only():
    """Main-only PDF (no ATC) flows through page extraction, tagging, and the LLM call."""
    fake_page_texts = [{"page": 1, "text": "Bidder must submit OEM Authorization Certificate.", "blocks": [], "checkboxes": []}]

    mock_result = {
        "requirements": [
            {
                "documentName": "OEM Authorization Certificate",
                "category": "oem",
                "required": True,
                "source": {"document": "main", "page": 1, "snippet": "Bidder must submit OEM Authorization Certificate"},
                "matchedLibraryId": None,
                "confidence": "high",
                "reasoning": "Explicit requirement.",
            }
        ],
        "usage": {"input_tokens": 100, "output_tokens": 50, "cache_creation_tokens": 0, "cache_read_tokens": 0, "estimated_cost_usd": 0.001},
    }

    with patch("app.routers.bidding_requirements.extract_pdf_text_hybrid", return_value=fake_page_texts), \
         patch("app.routers.bidding_requirements.analyze_bidding_requirements", return_value=mock_result) as mock_analyze:
        response = client.post(
            "/analyze-bidding-requirements",
            files={"pdf_file": ("tender.pdf", b"%PDF-1.4 mock content", "application/pdf")},
            data={"library_documents": json.dumps([{"id": "1", "document_name": "GST Certificate"}])},
        )

    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert len(data["requirements"]) == 1
    assert data["requirements"][0]["category"] == "oem"
    assert data["llm_usage"]["input_tokens"] == 100

    # Confirm the page-tagged text (built from main pages only, no ATC) reached the resolver
    call_kwargs = mock_analyze.call_args.kwargs
    assert "[Main Page 1]: Bidder must submit OEM Authorization Certificate." in call_kwargs["page_tagged_text"]
    assert "[ATC" not in call_kwargs["page_tagged_text"]
    assert call_kwargs["library_documents"] == [{"id": "1", "document_name": "GST Certificate"}]


def test_analyze_bidding_requirements_endpoint_with_atc_file():
    """Main + ATC upload: both are parsed and labeled separately in the assembled text."""
    fake_main_pages = [{"page": 1, "text": "Main tender clause.", "blocks": [], "checkboxes": []}]
    fake_atc_pages = [{"page": 1, "text": "ATC amendment clause.", "blocks": [], "checkboxes": []}]

    mock_result = {"requirements": [], "usage": None}

    with patch(
        "app.routers.bidding_requirements.extract_pdf_text_hybrid",
        side_effect=[fake_main_pages, fake_atc_pages],
    ), patch(
        "app.routers.bidding_requirements.analyze_bidding_requirements",
        return_value=mock_result,
    ) as mock_analyze:
        response = client.post(
            "/analyze-bidding-requirements",
            files=[
                ("pdf_file", ("main.pdf", b"%PDF-1.4 mock main", "application/pdf")),
                ("atc_files", ("atc.pdf", b"%PDF-1.4 mock atc", "application/pdf")),
            ],
            data={"library_documents": "[]"},
        )

    assert response.status_code == 200
    call_kwargs = mock_analyze.call_args.kwargs
    assert "[Main Page 1]: Main tender clause." in call_kwargs["page_tagged_text"]
    assert "[ATC Page 1]: ATC amendment clause." in call_kwargs["page_tagged_text"]


def test_analyze_bidding_requirements_endpoint_translates_missing_api_key_to_503():
    """RuntimeError from the resolver (missing API key) surfaces as a 503, not a 500."""
    fake_page_texts = [{"page": 1, "text": "Some tender text.", "blocks": [], "checkboxes": []}]

    with patch("app.routers.bidding_requirements.extract_pdf_text_hybrid", return_value=fake_page_texts), \
         patch(
             "app.routers.bidding_requirements.analyze_bidding_requirements",
             side_effect=RuntimeError("FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder."),
         ):
        response = client.post(
            "/analyze-bidding-requirements",
            files={"pdf_file": ("tender.pdf", b"%PDF-1.4 mock content", "application/pdf")},
        )

    assert response.status_code == 503
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]
