"""
Fix E -- custom eligibility criteria must come from the technical eligibility clause,
not the adjacent Make-in-India clause.

What actually produced the wrong value on real Noida (and Vadodra) text: the late
fallback in build_infosheet_data() tried a Make-in-India regex FIRST --
  "Minimum 50% and 20% Local Content required for qualifying as Class 1 and Class 2
   Local Supplier respectively"
-- a GeM item-table header / MII clause, so it beat the technical clause every time.
Two clause-boundary problems sat next to it:
  * the order-value capture "[\\d\\.\\,\\s]+" also swallowed a following "\\n1.2 " header;
  * the "Clause 1.2" fallback only stopped at 1.3 / 2.0-2.3 / section markers, so it
    could run on through e.g. a "1.4" clause.

Real Noida main text has no numbered 1.1/1.2 BEC clauses (and its ATC is not in the
corpus), so the clause block below is synthetic but built from real sentences:
1.1 is verbatim from the Visakhapatnam GAIL ATC, 1.2 verbatim from the Noida GeM bid.
"""
from app.services.tender_mapper import build_infosheet_data

CLAUSE_1_1_TECHNICAL = (
    "1.1 The bidder must have executed at least \none single purchase order of value not \n"
    "less than Rs. 12.46 Lacs for “Supply & \nInstallation of battery chargers” in the preceding 07 years period "
    "to be reckoned from the bid due date.\n"
)
CLAUSE_1_2_MAKE_IN_INDIA = (
    "1.2 Preference to Make In India products (For bids < 200 Crore):Preference shall be given to Class 1 local supplier\n"
    "as defined in public procurement (Preference to Make in India), Order 2017 as amended from time to time.\n"
    "(Minimum 50% and 20% Local\nContent required for qualifying as Class 1 and Class 2 Local Supplier respectively)\n"
)
NOIDA_GEM_ITEM_HEADER = (
    "(Hमशः 1ेणी 1 और 1ेणी 2 के /थानीय आपूित%कता% के mप म3 अह%ता ?ाn करने के िलए आवPयक/Minimum 50% and 20% Local\n"
    "Content required for qualifying as Class 1 and Class 2 Local Supplier respectively)\n"
    "Technical Specifications\n"
)

MII_MARKERS = ("local content", "make in india", "class 1", "local supplier")


def _custom(text):
    return build_infosheet_data([], page_texts=[{"page": 1, "text": text}])["custom_eligibility_criteria_display"]


def test_only_clause_1_1_technical_text_is_captured_not_1_2_make_in_india():
    value = _custom("SECTION-II BID EVALUATION CRITERIA\n" + CLAUSE_1_1_TECHNICAL + CLAUSE_1_2_MAKE_IN_INDIA)
    assert value == "Minimum Qualifying Order Value: Rs. 12.46 Lacs"
    assert not any(m in value.lower() for m in MII_MARKERS)


def test_order_of_clauses_does_not_matter():
    value = _custom(CLAUSE_1_2_MAKE_IN_INDIA + CLAUSE_1_1_TECHNICAL)
    assert value == "Minimum Qualifying Order Value: Rs. 12.46 Lacs"


def test_real_noida_local_content_header_alone_is_not_captured():
    value = _custom(NOIDA_GEM_ITEM_HEADER)
    assert not any(m in value.lower() for m in MII_MARKERS)


def test_order_value_capture_stops_before_next_numbered_clause_header():
    """No unit -> the old '[\\d\\.\\,\\s]+' ran on into '\\n1.2 '; now it stops at the line end."""
    text = (
        "1.1 The bidder must have executed at least one purchase order of value not less than Rs. 500000\n"
        + CLAUSE_1_2_MAKE_IN_INDIA
    )
    assert _custom(text) == "Minimum Qualifying Order Value: Rs. 500000"


def test_clause_1_2_fallback_stops_at_next_numbered_sub_clause():
    """The Part-wise value table in clause 1.2 must not absorb lines of a later '1.4' clause."""
    text = (
        "1.2 MINIMUM ORDER VALUE\n"
        "Part 1: Rs. 10 Lakhs\n"
        "Part 2: Rs. 5 Lakhs\n"
        "1.4 Part-5 of the tender documents shall be read with the GCC.\n"
    )
    value = _custom(text)
    assert value == "Part 1: Rs. 10 Lakhs; Part 2: Rs. 5 Lakhs"
    assert "1.4" not in value


def test_clause_1_2_fallback_rejects_make_in_india_clause():
    text = "1.2 Make in India: Part 1 bidders must meet 50% local content\nPart 2 bidders 20%\n"
    value = _custom(text)
    assert not any(m in value.lower() for m in MII_MARKERS)
