"""
Fix B -- "etc." must not be captured as the experience-years value.

Every GeM bid document (Morena, Noida, Vadodra -- verbatim below) carries:
  "...for determining the Eligibility Criteria related to Turn Over, Past Performance
   and Project / Past Experience etc."
extract_regex_safe("Past Experience") captured "etc." from that line, and because
resolve_field() returned the first non-empty candidate, the real years regex never ran.

Now is_valid_experience_years_candidate() rejects stub fragments and requires a digit
or a years/yrs word; resolve_field(..., validator=...) skips a rejected candidate and
tries the next synonym / pass, then the years regex.

The years clauses are verbatim (whitespace as extracted) from Vadodra's ATC
(GEM/2026/B/7786440) and Morena's GeM bid (GEM/2025/B/7021103, incl. the PDF layout
split "yea rs").
"""
import pytest

from app.services.tender_mapper import (
    build_infosheet_data,
    extract_regex_safe,
    is_valid_experience_years_candidate,
)

GEM_ETC_BOILERPLATE = (
    "3. Estimated Bid Value indicated above is being declared solely for the purpose of guidance on EMD amount and\n"
    "for determining the Eligibility Criteria related to Turn Over, Past Performance and Project / Past Experience etc.\n"
    "This has no relevance or bearing on the price to be quoted by the bidders and is also not going to have any\n"
    "impact on bid participation.\n"
)

VADODRA_ATC_YEARS = (
    "2 \nBidder \nshould \nhave \nsuccessfully \ncompleted/executed at least one (01) \n"
    "number order for Supply, Installation, \ntesting& commissioning of 12-Pulse DSP \nTechnology \nbased \n"
    "Rectifier \nbattery \nCharger of rating not less than 110V,50 A \nin a single Purchase order in India in any \n"
    "Govt. / Semi Govt. / PSU / MNC / Public \nLtd. Company / Pvt Ltd. Company in \n"
    "previous seven (07) years (reckoned from \nbid due date) \n"
)

MORENA_MAIN_YEARS = (
    "order for “Supply, Installation, Testing and\nCommissioning of air-co\nnditioners” during any of t\n"
    "he preceding 7 (Seven) yea\nrs (to be reckoned from ﬁn\nal bid due date) with: -\n"
)


def _years(main_text, atc_text=None):
    info = build_infosheet_data([], page_texts=[{"page": 1, "text": main_text}], atc_full_text=atc_text)
    return info["experience_years_display"]


# ── The gate itself ─────────────────────────────────────────────────────────

def test_regex_safe_still_sees_etc_on_the_real_boilerplate():
    """Documents the root cause: the label regex does pick up 'etc.' from this real line."""
    assert extract_regex_safe("Past Experience", GEM_ETC_BOILERPLATE) == "etc."


@pytest.mark.parametrize("stub", [
    "etc.", "etc", "Etc.", " etc. ", "and completion certificates etc.", "and completion certificates etc",
    "Past Performance etc.", "This has no relevance", "Criteria", "",  None,
])
def test_stub_and_non_numeric_candidates_are_rejected(stub):
    assert is_valid_experience_years_candidate(stub) is False


@pytest.mark.parametrize("good", [
    "7", "3 Year(s)", "seven (07) years", "05 Years", "Minimum 3 yrs", "3 years etc.",
])
def test_real_years_candidates_are_accepted(good):
    assert is_valid_experience_years_candidate(good) is True


# ── End-to-end through build_infosheet_data() ───────────────────────────────

def test_gem_boilerplate_alone_is_not_captured():
    """The exact Noida/Vadodra/Morena boilerplate must NOT produce 'etc.' as the years value."""
    value = _years(GEM_ETC_BOILERPLATE)
    assert "etc" not in value.lower()
    assert value == "⚠️ MISSING"


def test_vadodra_seven_07_years_captured_once_gate_no_longer_blocks():
    """GeM parent boilerplate + Vadodra ATC years clause -> 7 (previously 'etc.')."""
    assert _years(GEM_ETC_BOILERPLATE, VADODRA_ATC_YEARS) == "7"


def test_morena_preceding_7_seven_years_with_layout_split_captured():
    """'preceding 7 (Seven) yea\\nrs' (number first, word in brackets, split word) -> 7."""
    assert _years(GEM_ETC_BOILERPLATE + MORENA_MAIN_YEARS) == "7"


def test_valid_table_value_still_wins_over_regex():
    """A real GeM table value for a later synonym is still used once the stub is skipped."""
    text = GEM_ETC_BOILERPLATE + "Years of Past Experience Required: 3 Year(s)\n"
    assert _years(text) == "3 Year(s)"
