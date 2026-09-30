"""
Fix C -- the experience-years key must be the same on the mapper and LLM sides.

tender_mapper emits `experience_years_display`, which is what the CSV/XLSX
(csv_schema.py), the TMS DTO (extract.py TMS_TO_SOURCE_KEY_MAP["techEligibilityAge"],
tms_field_mapper.py) and info_sheet_generator.py read. The LLM side
(llm_field_resolver FIELD_PROMPT_MAP / category map, pdf_parent_ingest COMPLEX_BEC_KEYS
and the merge rule) used `eligibility_criterion_years_display`, which nothing emits:
Role 1 was asked for it on every tender and its answer was written to a key no
consumer reads. Both sides now use `experience_years_display`.

These tests run the real ingest_parent_tender_pdf() on a generated PDF whose text is
the verbatim GeM boilerplate that used to yield "etc." (Fix B), with LLMFieldResolver
replaced by an in-process stub -- no Anthropic call is made.
"""
import fitz
import pytest

from app.services import llm_field_resolver
from app.services.llm_field_resolver import FIELD_PROMPT_MAP
from app.services.pdf_parent_ingest import ingest_parent_tender_pdf

GEM_ETC_BOILERPLATE = (
    "Bid Number: GEM/2025/B/7021103\n"
    "Estimated Bid Value indicated above is being declared solely for the purpose of guidance on EMD amount and\n"
    "for determining the Eligibility Criteria related to Turn Over, Past Performance and Project / Past Experience etc.\n"
    "SECTION-II BID EVALUATION CRITERIA\n"
)
MORENA_YEARS_CLAUSE = (
    "The bidder must have successfully executed at least one work order during any of the\n"
    "preceding 7 (Seven) years (to be reckoned from final bid due date).\n"
)


class _StubResolver:
    """Stands in for LLMFieldResolver; records what Role 1 was asked for."""
    calls = []
    answers = {}

    def __init__(self, *args, **kwargs):
        self.enabled = True
        self.total_raw_processing_tokens = 0

    def resolve_missing_fields(self, text, keys, doc_type=None):
        _StubResolver.calls.append(list(keys))
        return {k: {"value": v} for k, v in _StubResolver.answers.items() if k in keys}

    def resolve_ambiguous_fields(self, text, candidates):
        return {}

    def get_usage_summary(self):
        return {}


@pytest.fixture
def stub_role1(monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    monkeypatch.setattr(llm_field_resolver, "LLMFieldResolver", _StubResolver)
    _StubResolver.calls = []
    _StubResolver.answers = {}
    return _StubResolver


def _pdf(tmp_path, text):
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), text, fontsize=10)
    path = tmp_path / "main.pdf"
    doc.save(str(path))
    doc.close()
    return path


def _atc(tmp_path):
    # Role 1 only runs with ATC text present (see "Skipping LLM -- no ATC text" branch).
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), "Buyer Added Bid Specific ATC\nSpecial terms.", fontsize=10)
    path = tmp_path / "atc.pdf"
    doc.save(str(path))
    doc.close()
    return path


def test_llm_map_uses_the_key_the_mapper_and_consumers_use():
    assert "experience_years_display" in FIELD_PROMPT_MAP
    assert "eligibility_criterion_years_display" not in FIELD_PROMPT_MAP


def test_stub_years_value_is_queued_for_role1_and_its_answer_is_merged(tmp_path, stub_role1):
    """Fix B rejects 'etc.' -> field is missing -> Role 1 is asked for it -> answer lands in the consumed key."""
    stub_role1.answers = {"experience_years_display": "7"}

    result = ingest_parent_tender_pdf(
        job_id="test-fixc-stub", pdf_path=_pdf(tmp_path, GEM_ETC_BOILERPLATE),
        original_filename="main.pdf", explicit_atc_paths=[_atc(tmp_path)],
    )

    assert stub_role1.calls, "Role 1 was never invoked"
    assert "experience_years_display" in stub_role1.calls[0]
    assert "eligibility_criterion_years_display" not in stub_role1.calls[0]
    assert result["experience_years_display"] == "7"
    assert result["_info_sheet_sources"]["experience_years_display"] == "llm"


def test_resolved_clean_integer_is_not_overridden_by_role1(tmp_path, stub_role1):
    """A clean integer already resolved by the mapper (Morena phrasing -> '7') is preserved."""
    stub_role1.answers = {"experience_years_display": "3"}

    result = ingest_parent_tender_pdf(
        job_id="test-fixc-resolved", pdf_path=_pdf(tmp_path, GEM_ETC_BOILERPLATE + MORENA_YEARS_CLAUSE),
        original_filename="main.pdf", explicit_atc_paths=[_atc(tmp_path)],
    )

    assert result["experience_years_display"] == "7"
    assert all("experience_years_display" not in call for call in stub_role1.calls)
