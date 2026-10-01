"""
Fix F -- client contacts: no invented names/phones, no one person in two slots.

Real case: GeM native bid PDF GEM/2026/B/8024876 (GAIL Kochi Kerala). Its only contact
information is the grievance block below (verbatim, English lines of the bilingual row):
two emails, no names, no phone numbers. Output showed a name ("Allan Tomy", synthesized
from the email local-part by tender_mapper) and, after the LLM pass, the same person in
Client 1 and Client 2 with a phone number.

Now:
  * tender_mapper never derives a name from an email and never hardcodes a name;
  * phones are cleaned and kept only if >= 6 digits that literally occur in the text;
  * names are kept only if they literally occur in the text;
  * a slot that repeats an earlier slot's person (same email or honorific-insensitive
    name) is cleared, not duplicated -- in the mapper AND for Role 1 LLM merges.
No Anthropic call is made (Role 1 is replaced by an in-process stub).
"""
import fitz
import pytest

from app.services import llm_field_resolver
from app.services.pdf_parent_ingest import ingest_parent_tender_pdf
from app.services.tender_mapper import (
    build_infosheet_data,
    clean_phone,
    contact_integrity_violations,
    is_same_contact,
    phone_appears_in_text,
)

# Verbatim from GEM/2026/B/8024876 (GeM native bid PDF, page 1), English side of the rows.
GEM_KOCHI_CONTACT_BLOCK = (
    "Bid Number: GEM/2026/B/8024876\n"
    "Ministry/State Name\nMinistry Of Petroleum And Natural Gas\n"
    "Department Name\nGail India Limited\n"
    "Organisation Name\nGail India Limited\n"
    "Office Name\nKochi Kerala\n"
    "Contact details of\nGrievance redressal\n"
    "HOD Email id :sharikumar@gail.co.in \n"
    "Buyer Email id: allan.tomy@gail.co.in\n"
    "Item Category\nCustom Bid for Services - Lumpsum Charge\n"
)

NULLS = ("⚠️ MISSING", "N/A", "NA", None)


def _contacts(info):
    return {k: info[k] for k in info if k.startswith("client_") and k.endswith("_display")}


# ── The real GeM pattern: two emails, no names, no phones ───────────────────

def test_gem_kochi_two_emails_no_names_no_phones_no_duplication():
    info = build_infosheet_data([], page_texts=[{"page": 1, "text": GEM_KOCHI_CONTACT_BLOCK}])
    c = _contacts(info)

    assert {c["client_email_1_display"], c["client_email_2_display"]} == {
        "allan.tomy@gail.co.in", "sharikumar@gail.co.in",
    }
    for key in ("client_name_1_display", "client_name_2_display",
                "client_phone_1_display", "client_phone_2_display"):
        assert c[key] in NULLS, f"{key} = {c[key]!r} (nothing in the source text supports it)"
    assert "allan" not in str(c["client_name_1_display"]).lower()  # not synthesized from the email
    assert not is_same_contact(c["client_name_1_display"], c["client_email_1_display"],
                               c["client_name_2_display"], c["client_email_2_display"])


def test_same_person_is_never_assigned_to_two_slots():
    """Tender Dealing Officer block + nodal-officer block naming the same person -> slot 2 cleared."""
    text = (
        "(H) CONTACT DETAILS OF TENDER DEALING OFFICER\n"
        "Name : Allan Tomy\nDesignation: Manager (C&P)\n"
        "Phone No. & Extn : +91-484-2983210 Ext.: 1383\ne-mail : allan.tomy@gail.co.in\n"
        "(I) DEALING GAIL'S OFFICE ADDRESS\n"
        "39.2 Name and contact details of nodal officer are as under:\n"
        "Mr. Allan Tomy, Manager (C&P)\nTel: 0484 2983210\nEmail: allan.tomy@gail.co.in\n"
        "40 Whether tendered item is non-split able: YES\n"
    )
    c = _contacts(build_infosheet_data([], page_texts=[{"page": 1, "text": text}]))
    assert c["client_email_1_display"] == "allan.tomy@gail.co.in"
    assert c["client_name_2_display"] in NULLS
    assert c["client_email_2_display"] in NULLS
    assert c["client_phone_2_display"] in NULLS


# ── Helpers ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("raw, expected", [
    ("0484 2983217 \n            E", "0484 2983217"),         # real Kochi Tender1 capture
    ("+91-484-2983210/11/12/13 Ext.", "+91-484-2983210/11/12/13"),
    ("Ext.", "NA"),
    ("Tel", "NA"),
    ("12345", "NA"),
    (None, "NA"),
])
def test_clean_phone(raw, expected):
    assert clean_phone(raw) == expected


def test_phone_must_literally_appear_in_text():
    text = "Tel: 0484 2983217\nEmail: sabu.mathews@gail.co.in"
    assert phone_appears_in_text("0484-2983217", text)       # separators ignored
    assert not phone_appears_in_text("+91 9876543210", text)  # invented


def test_same_contact_is_honorific_and_case_insensitive():
    assert is_same_contact("Mr. Allan Tomy", None, "Allan Tomy", None)
    assert is_same_contact(None, "Allan.Tomy@gail.co.in", "Shri X", "allan.tomy@gail.co.in")
    assert not is_same_contact(None, "allan.tomy@gail.co.in", None, "sharikumar@gail.co.in")
    assert not is_same_contact("NA", "NA", "NA", "NA")


def test_violations_flag_invented_name_and_phone_and_duplicate_slot():
    data = {
        "client_name_1_display": "Mr. Allan Tomy", "client_email_1_display": "allan.tomy@gail.co.in",
        "client_phone_1_display": "+91-9876543210",
        "client_name_2_display": "Allan Tomy", "client_email_2_display": "sharikumar@gail.co.in",
        "client_phone_2_display": "NA",
    }
    bad = contact_integrity_violations(data, GEM_KOCHI_CONTACT_BLOCK)
    assert {"client_name_1_display", "client_phone_1_display"} <= bad          # not in the text
    assert {"client_name_2_display", "client_email_2_display", "client_phone_2_display"} <= bad  # duplicate


# ── Role 1 LLM merge path (stubbed, no API call) ────────────────────────────

class _StubResolver:
    answers = {}

    def __init__(self, *a, **kw):
        self.enabled = True
        self.total_raw_processing_tokens = 0

    def resolve_missing_fields(self, text, keys, doc_type=None):
        return {k: {"value": v} for k, v in _StubResolver.answers.items() if k in keys}

    def resolve_ambiguous_fields(self, text, candidates):
        return {}

    def get_usage_summary(self):
        return {}


def _pdf(path, text):
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), text, fontsize=10)
    doc.save(str(path))
    doc.close()
    return path


def test_role1_cannot_invent_contact_or_duplicate_buyer_into_hod_slot(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    monkeypatch.setattr(llm_field_resolver, "LLMFieldResolver", _StubResolver)
    # What was observed: an invented name + phone, and the same person in both slots.
    _StubResolver.answers = {
        "client_name_1_display": "Mr. Allan Tomy",
        "client_phone_1_display": "+91-9876543210",
        "client_name_2_display": "Mr. Allan Tomy",
        "client_phone_2_display": "+91-9876543210",
    }

    result = ingest_parent_tender_pdf(
        job_id="test-fixf-role1",
        pdf_path=_pdf(tmp_path / "gem.pdf", GEM_KOCHI_CONTACT_BLOCK),
        original_filename="gem.pdf",
        explicit_atc_paths=[_pdf(tmp_path / "atc.pdf", "Buyer Added Bid Specific ATC\nGeneral terms apply.")],
    )

    for key in ("client_name_1_display", "client_phone_1_display",
                "client_name_2_display", "client_phone_2_display"):
        assert result[key] in NULLS, f"{key} = {result[key]!r}"
    assert {result["client_email_1_display"], result["client_email_2_display"]} == {
        "allan.tomy@gail.co.in", "sharikumar@gail.co.in",
    }
