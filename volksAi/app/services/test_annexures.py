"""
Tests for the Role 4 annexure capability:
  - build_annexure_docx() (annexure_docx_builder.py) -- deterministic, no LLM
  - identify_annexures() / validate_annexures() (annexure_resolver.py)
  - the /identify-annexures and /annexure-files router endpoints

Anthropic calls are mocked throughout -- no live API calls. The synthetic tender
text below reproduces real GAIL phrasing (Format F-2A Declaration for Bid Security
and an Annexure-I Guaranteed Technical Particulars table, both from real GAIL ATC
documents in the gold-standard set).
"""
import io
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.main import app
from app.services.annexure_docx_builder import BLANK, build_annexure_docx, requires_bidder_letterhead
from app.services.annexure_resolver import (
    SYSTEM_PROMPT,
    TOOL_NAME,
    identify_annexures,
    validate_annexures,
)

client = TestClient(app)


# Synthetic page-tagged main+ATC text using real GAIL tender phrasing.
TENDER_TEXT = (
    "[Main Page 3]: (E) BID SECURITY: Bidders are required to submit Declaration for Bid "
    "Security in bid as per proforma at Form F-2A.\n\n"
    "[Main Page 68]: FORMAT F-2A DECLARATION FOR BID SECURITY To, M/s GAIL (INDIA) LIMITED "
    "___________________ SUB: TENDER NO: Dear Sir After examining / reviewing provisions of "
    "above referred tender documents (including all corrigendum/ Addenda), we M/s____________ "
    "(Name of Bidder) have submitted our offer/ bid no. ..................... "
    "Place: [Signature of Authorized Signatory of Bidder] Date: Name: Designation:\n\n"
    "[ATC Page 8]: Annexure-I Guarantee Technical Particulars of Battery Charger( To be filled "
    "by Bidder) Sr. No. Description Requirement Vendor's Submission Remarks 1.1 Battery charger "
    "type & rating 110V DC, 100A FCBC 1.2 Control Type DSP-based digital control"
)

F2A_ANNEXURE = {
    "annexureName": "Format F-2A: Declaration for Bid Security",
    "source": {"document": "main", "page": 68, "snippet": "FORMAT F-2A DECLARATION FOR BID SECURITY"},
    "blocks": [
        {"type": "heading", "text": "FORMAT F-2A DECLARATION FOR BID SECURITY"},
        {"type": "paragraph", "text": "To, M/s GAIL (INDIA) LIMITED"},
        {"type": "blank_field", "label": "Tender No"},
        {"type": "paragraph", "text": "we M/s______ (Name of Bidder) have submitted our offer/ bid no. ______"},
        {"type": "blank_field", "label": "Place"},
        {"type": "blank_field", "label": "Date"},
        {"type": "signature_line", "label": "Signature of Authorized Signatory of Bidder"},
        {"type": "blank_field", "label": "Name"},
        {"type": "blank_field", "label": "Designation"},
    ],
}

GTP_ANNEXURE = {
    "annexureName": "Annexure-I: Guaranteed Technical Particulars of Battery Charger",
    "source": {"document": "atc", "page": 8, "snippet": "Annexure-I Guarantee Technical Particulars of Battery Charger"},
    "blocks": [
        {"type": "heading", "text": "Annexure-I Guarantee Technical Particulars of Battery Charger (To be filled by Bidder)"},
        {
            "type": "table",
            "headers": ["Sr. No.", "Description", "Requirement", "Vendor's Submission", "Remarks"],
            "rows": [
                ["1.1", "Battery charger type & rating", "110V DC, 100A FCBC", "", ""],
                ["1.2", "Control Type", "DSP-based digital control", "", ""],
            ],
        },
    ],
}


def _mock_response(annexures, stop_reason="tool_use"):
    tool_block = SimpleNamespace(type="tool_use", name=TOOL_NAME, input={"annexures": annexures})
    usage = SimpleNamespace(
        input_tokens=800, output_tokens=600,
        cache_creation_input_tokens=0, cache_read_input_tokens=0,
    )
    return SimpleNamespace(content=[tool_block], usage=usage, stop_reason=stop_reason)


def _paragraph_texts(doc):
    return [p.text for p in doc.paragraphs]


# ─────────────────────────────────────────────────────────────────────────────
# (a) build_annexure_docx() -- hand-built blocks, no LLM
# ─────────────────────────────────────────────────────────────────────────────

ALL_BLOCK_TYPES_ANNEXURE = {
    "annexureName": "Annexure-III: Manufacturer's Authorization Form",
    "blocks": [
        {"type": "heading", "text": "ANNEXURE-III MANUFACTURER'S AUTHORIZATION FORM"},
        {"type": "paragraph", "text": "We, the undersigned manufacturer, hereby authorize the bidder."},
        {"type": "blank_field", "label": "Name of Authorized Signatory"},
        {"type": "blank_field", "label": "Tender No.:"},
        {
            "type": "table",
            "headers": ["Sr. No.", "Item", "Make/Model"],
            "rows": [["1", "Ni-Cd Battery Bank", ""], ["2", "Battery Charger"]],  # 2nd row ragged
        },
        {"type": "signature_line", "label": "Signature & Seal of Bidder"},
    ],
}


def test_build_annexure_docx_all_block_types_roundtrip(tmp_path):
    """All 5 block types render and read back with python-docx with matching content."""
    out = build_annexure_docx(ALL_BLOCK_TYPES_ANNEXURE, tmp_path / "nested" / "maf.docx")

    assert out.exists() and out.stat().st_size > 0
    doc = Document(str(out))  # opens => valid .docx

    paras = doc.paragraphs
    texts = _paragraph_texts(doc)

    # heading -> Word Heading 1
    assert paras[0].text == "ANNEXURE-III MANUFACTURER'S AUTHORIZATION FORM"
    assert paras[0].style.name == "Heading 1"
    # paragraph
    assert "We, the undersigned manufacturer, hereby authorize the bidder." in texts
    # blank_field -> label + underscored blank (no doubled colon when label ends with ':')
    assert f"Name of Authorized Signatory: {BLANK}" in texts
    assert f"Tender No.: {BLANK}" in texts
    # signature_line -> underscore blank, label on the line below
    sig = [p for p in paras if "Signature & Seal of Bidder" in p.text]
    assert len(sig) == 1
    assert sig[0].text == f"{BLANK}\nSignature & Seal of Bidder"

    # table -> real Word table, header row + body rows, ragged row padded
    assert len(doc.tables) == 1
    grid = [[c.text for c in row.cells] for row in doc.tables[0].rows]
    assert grid == [
        ["Sr. No.", "Item", "Make/Model"],
        ["1", "Ni-Cd Battery Bank", ""],
        ["2", "Battery Charger", ""],
    ]
    assert all(r.bold for r in doc.tables[0].rows[0].cells[0].paragraphs[0].runs)

    # annexureName is stored as the title property, not duplicated in the body
    assert doc.core_properties.title == "Annexure-III: Manufacturer's Authorization Form"


def test_build_annexure_docx_is_deterministic(tmp_path):
    """Same blocks -> same document content."""
    a = Document(str(build_annexure_docx(ALL_BLOCK_TYPES_ANNEXURE, tmp_path / "a.docx")))
    b = Document(str(build_annexure_docx(ALL_BLOCK_TYPES_ANNEXURE, tmp_path / "b.docx")))
    assert _paragraph_texts(a) == _paragraph_texts(b)


def test_build_annexure_docx_strips_xml_invalid_control_chars(tmp_path):
    """Stray control chars from PDF extraction must not crash python-docx."""
    annexure = {"annexureName": "X", "blocks": [{"type": "paragraph", "text": "Bid\x0b No\x00. 123"}]}
    doc = Document(str(build_annexure_docx(annexure, tmp_path / "x.docx")))
    assert "Bid No. 123" in _paragraph_texts(doc)


def test_build_annexure_docx_skips_unknown_blocks(tmp_path):
    annexure = {"annexureName": "X", "blocks": [{"type": "image", "src": "a.png"}, "junk", {"type": "paragraph", "text": "kept"}]}
    doc = Document(str(build_annexure_docx(annexure, tmp_path / "x.docx")))
    assert [t for t in _paragraph_texts(doc) if t] == ["kept"]


# ─────────────────────────────────────────────────────────────────────────────
# (b) identify_annexures() with a mocked Claude response (no live call)
# ─────────────────────────────────────────────────────────────────────────────

def test_identify_annexures_empty_text_returns_no_api_call():
    with patch("anthropic.Anthropic") as MockAnthropic:
        result = identify_annexures("")
    MockAnthropic.assert_not_called()
    assert result == {"annexures": [], "rejected": [], "truncated": False, "usage": None}


def test_identify_annexures_missing_api_key_raises():
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        identify_annexures(TENDER_TEXT, api_key="placeholder")


def test_identify_annexures_parses_real_tender_phrasing():
    """Mocked Sonnet response for real GAIL phrasing is parsed with citations and blocks intact."""
    with patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = _mock_response([F2A_ANNEXURE, GTP_ANNEXURE])
        result = identify_annexures(TENDER_TEXT, api_key="sk-ant-test-key")

    # The request carried the page-tagged text and forced the Role 4 tool
    kwargs = MockAnthropic.return_value.messages.create.call_args.kwargs
    assert "[Main Page 68]: FORMAT F-2A DECLARATION FOR BID SECURITY" in kwargs["messages"][0]["content"]
    assert kwargs["tool_choice"] == {"type": "tool", "name": TOOL_NAME}
    assert kwargs["system"][0]["text"] == SYSTEM_PROMPT

    assert result["rejected"] == []
    assert result["truncated"] is False
    names = [a["annexureName"] for a in result["annexures"]]
    assert names == [F2A_ANNEXURE["annexureName"], GTP_ANNEXURE["annexureName"]]

    f2a = result["annexures"][0]
    assert f2a["source"] == {"document": "main", "page": 68, "snippet": "FORMAT F-2A DECLARATION FOR BID SECURITY"}
    assert [b["type"] for b in f2a["blocks"]].count("blank_field") == 5
    assert {"type": "signature_line", "label": "Signature of Authorized Signatory of Bidder"} in f2a["blocks"]

    gtp = result["annexures"][1]
    assert gtp["source"]["document"] == "atc"
    assert gtp["blocks"][1]["type"] == "table"
    assert gtp["blocks"][1]["headers"][3] == "Vendor's Submission"

    assert result["usage"]["input_tokens"] == 800
    assert result["usage"]["estimated_cost_usd"] > 0


def test_identify_annexures_prompt_encodes_faithfulness_rules():
    """The prompt must tell the model not to invent fields and to describe unlabeled blanks."""
    assert "Do not invent fields" in SYSTEM_PROMPT
    assert "describe what the blank is for" in SYSTEM_PROMPT
    for btype in ("heading", "paragraph", "blank_field", "table", "signature_line"):
        assert btype in SYSTEM_PROMPT


def test_identify_annexures_flags_truncation():
    with patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = _mock_response([F2A_ANNEXURE], stop_reason="max_tokens")
        result = identify_annexures(TENDER_TEXT, api_key="sk-ant-test-key")
    assert result["truncated"] is True


# ─────────────────────────────────────────────────────────────────────────────
# (c) Citation guard: citation-less / fabricated citations are rejected, not accepted
# ─────────────────────────────────────────────────────────────────────────────

def _with_source(source):
    a = {k: v for k, v in F2A_ANNEXURE.items() if k != "source"}
    if source is not ...:
        a["source"] = source
    return a


@pytest.mark.parametrize("bad, reason_fragment", [
    (_with_source(...), "missing source citation"),
    (_with_source(None), "missing source citation"),
    (_with_source({"document": "main", "snippet": "FORMAT F-2A"}), "source.page"),
    (_with_source({"document": "main", "page": None, "snippet": "FORMAT F-2A"}), "source.page"),
    (_with_source({"document": "main", "page": 0, "snippet": "FORMAT F-2A"}), "source.page"),
    (_with_source({"document": "main", "page": True, "snippet": "FORMAT F-2A"}), "source.page"),
    (_with_source({"document": "main", "page": 68, "snippet": "  "}), "source.snippet"),
    (_with_source({"document": "boq", "page": 68, "snippet": "FORMAT F-2A"}), "source.document"),
    # page 99 was never in the input text -> fabricated citation
    (_with_source({"document": "main", "page": 99, "snippet": "FORMAT F-2A"}), "does not exist"),
    # page 8 exists only in the ATC, not the main document
    (_with_source({"document": "main", "page": 8, "snippet": "Annexure-I"}), "does not exist"),
])
def test_citationless_or_fabricated_annexure_is_rejected(bad, reason_fragment):
    with patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = _mock_response([bad, GTP_ANNEXURE])
        result = identify_annexures(TENDER_TEXT, api_key="sk-ant-test-key")

    # The good annexure survives; the bad one is flagged, not silently accepted or dropped.
    assert [a["annexureName"] for a in result["annexures"]] == [GTP_ANNEXURE["annexureName"]]
    assert len(result["rejected"]) == 1
    assert result["rejected"][0]["annexureName"] == F2A_ANNEXURE["annexureName"]
    assert reason_fragment in result["rejected"][0]["reason"]


def test_annexure_with_no_valid_blocks_is_rejected():
    bad = {**F2A_ANNEXURE, "blocks": [{"type": "heading"}, {"type": "image"}, "junk"]}
    accepted, rejected = validate_annexures([bad], TENDER_TEXT)
    assert accepted == []
    assert rejected[0]["reason"] == "no valid structural blocks"


def test_malformed_blocks_dropped_and_counted():
    mixed = {**F2A_ANNEXURE, "blocks": F2A_ANNEXURE["blocks"] + [{"type": "blank_field"}, {"type": "video"}]}
    accepted, rejected = validate_annexures([mixed], TENDER_TEXT)
    assert rejected == []
    assert accepted[0]["blocks"] == F2A_ANNEXURE["blocks"]
    assert accepted[0]["droppedBlocks"] == 2


def test_non_list_model_output_yields_nothing():
    assert validate_annexures(None, TENDER_TEXT) == ([], [])
    assert validate_annexures({"annexureName": "x"}, TENDER_TEXT) == ([], [])




# ── Bidder letterhead: applied only when the form itself asks for it ────────────

def _form(name, *texts):
    return {"annexureName": name, "blocks": [{"type": "heading", "text": name}] + [{"type": "paragraph", "text": t} for t in texts]}


# Real phrasing from tender 3633 (GAIL) plus common variants.
@pytest.mark.parametrize("annexure", [
    _form("Form-IA to Section II: Undertaking on Letterhead (Land Border Country Declaration)", "We certify that ..."),
    _form("Form-I-B to Section II", "UNDERTAKING ON LETTERHEAD (Applicable in case of Transfer of Technology cases only)"),
    _form("Format F-2A", "To be submitted on the letter head of the Bidder."),
    _form("Covering Letter", "Printed on bidder's letter-head with seal."),
    _form("Annexure-V", "On company letterhead"),
])
def test_requires_bidder_letterhead_when_form_asks_for_it(annexure):
    assert requires_bidder_letterhead(annexure) is True


@pytest.mark.parametrize("annexure", [
    _form("Appendix-A1 to Section-II: Format of Agreement", "ON INDIAN STAMP PAPER OF REQUISITE VALUE DULY NOTARIZED."),
    _form("Appendix-A3: Proforma of Bank Guarantee", "(ON NON-JUDICIAL STAMP PAPER OF APPROPRIATE VALUE)"),
    _form("Appendix-A2: Guarantee by the Foreign Based Supporting Company/Guarantor", "THIS DEED OF GUARANTEE ..."),
    _form("Manufacturer's Authorization Form", "To be issued on the manufacturer's letterhead."),
    _form("Bank Guarantee", "On bank letterhead"),
    _form("Turnover Certificate", "On letterhead of the Chartered Accountant"),
    _form("OEM Undertaking", "on the letterhead of the OEM"),
    # Real wording, tender 3629 ATC p.47 (Annexure-IA).
    _form("Annexure-IA: Third Party Deposit Confirmation Letter",
          "a confirmation letter in original on letter head from the issuing bank to GAIL"),
    _form("Dealer Certificate", "on letterhead issued by the manufacturer"),
    _form("Plain declaration", "We declare that ..."),
])
def test_no_bidder_letterhead_for_stamp_paper_third_party_or_unmarked_forms(annexure):
    assert requires_bidder_letterhead(annexure) is False


def test_letterhead_detected_in_table_and_blank_field_text():
    annexure = {"annexureName": "Form X", "blocks": [
        {"type": "table", "headers": ["Note"], "rows": [["Submit on our letterhead"]]},
    ]}
    assert requires_bidder_letterhead(annexure) is True
    annexure = {"annexureName": "Form Y", "blocks": [{"type": "blank_field", "label": "Signature (on letter head)"}]}
    assert requires_bidder_letterhead(annexure) is True


def _header_footer_pictures(doc):
    sec = doc.sections[0]
    return (len(sec.header._element.xpath(".//pic:pic")), len(sec.footer._element.xpath(".//pic:pic")))


def test_build_annexure_docx_letterhead_flag(tmp_path):
    plain = Document(str(build_annexure_docx(F2A_ANNEXURE, tmp_path / "plain.docx")))
    lh = Document(str(build_annexure_docx(F2A_ANNEXURE, tmp_path / "lh.docx", letterhead=True)))
    assert _header_footer_pictures(plain) == (0, 0)
    assert _header_footer_pictures(lh) == (1, 1)
    # Same body either way: the letterhead only adds the bands and A4 margins; blanks stay blank.
    assert [p.text for p in lh.paragraphs] == [p.text for p in plain.paragraphs]
    assert lh.sections[0].top_margin.pt == 128.0
    # Both are A4 (python-docx defaults to US Letter, 612 x 792 pt).
    for d in (plain, lh):
        assert (round(d.sections[0].page_width.pt), round(d.sections[0].page_height.pt)) == (595, 842)


def test_generate_endpoint_applies_letterhead_only_when_required_without_claude():
    letterhead_form = _form("Form-IA: Undertaking on Letterhead", "We M/s______ (Name of Bidder) certify ...")
    stamp_form = _form("Appendix-A1: Agreement", "ON INDIAN STAMP PAPER OF REQUISITE VALUE")
    with patch("anthropic.Anthropic") as MockAnthropic:
        r1 = client.post("/generate-annexure-docx", json=letterhead_form)
        r2 = client.post("/generate-annexure-docx", json=stamp_form)
    MockAnthropic.assert_not_called()
    assert r1.status_code == 200 and r2.status_code == 200
    d1, d2 = Document(io.BytesIO(r1.content)), Document(io.BytesIO(r2.content))
    assert _header_footer_pictures(d1) == (1, 1)
    assert _header_footer_pictures(d2) == (0, 0)
    # Blanks are left for the bidder to fill in by hand.
    assert any("M/s______" in p.text for p in d1.paragraphs)
