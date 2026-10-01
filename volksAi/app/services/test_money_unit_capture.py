"""
Fix D -- money values must keep their Lac/Lakh/Crore unit.

Two ways the unit was lost:
  1. Line/cell-bounded label captures (extract_regex_safe) stop at the end of the line or
     a 2+ space table gap, so "Rs. 61.00\\nLac" was captured as "Rs. 61.00" -- a
     100,000x understatement once parsed.
  2. The explicit BEC regexes used "Lac|Lakhs|Cr|Crore" (no singular "Lakh"; "Crore" hit
     "Cr" first) and the order-value regexes accepted only "Lakhs?", so "Lacs"/"Crore"
     values were not captured at all.

Morena's and Visakhapatnam's order-value clauses below are verbatim (as extracted,
line breaks included) from their real GAIL documents; before this fix both resolved to
"Not Applicable". "Rs. 61.00 Lac" is the figure named in the bug report (it is the value
Role 1 once echoed from its prompt example -- see test_role1_prompt_examples.py), used
here only as label-capture input.
"""
import pytest

from app.services.normalizer import parse_money
from app.services.tender_mapper import build_infosheet_data, complete_money_unit, extract_regex_safe

MORENA_OV_CLAUSE = (
    "S. No \nBEC-Criteria \nRequired Document(s) \n1.2 The bidder must have successfully \n"
    "executed at least one work order for \n“Supply, Installation, Testing and \nCommissioning of air-conditioners” \n"
    "during any of the preceding 7 (Seven) \nyears (to be reckoned from final bid \ndue date) with: - \n \n"
    "a. Minimum quantity of 04 nos. \n(Four) of split ACs. \n \nOR \n \nb. Minimum \nPurchase \n"
    "order/Work order value of INR \n2.9 Lacs for Split AC. \n"
)
VIZAG_OV_CLAUSE = (
    "The bidder must have executed at least \none single purchase order of value not \n"
    "less than Rs. 12.46 Lacs for “Supply & \nInstallation of battery chargers” in the preceding 07 years period\n"
)


def _info(text, sections=None):
    return build_infosheet_data(sections or [], page_texts=[{"page": 1, "text": text}])


# ── 1. Label captures keep the unit (incl. split across a line break) ───────

@pytest.mark.parametrize("text, expected", [
    ("Working Capital Value: Rs. 61.00 Lac\n", "Rs. 61.00 Lac"),
    ("Working Capital Value: Rs. 61.00\nLac\n", "Rs. 61.00 Lac"),            # unit on next line
    ("Working Capital Value: Rs. 61.00\nLacs for the tender\n", "Rs. 61.00 Lacs"),
    ("Working Capital Value  Rs. 61.00   Lakhs\n", "Rs. 61.00 Lakhs"),        # table-cell gap
    ("Working Capital Value: Rs. 2.5\nCrore\n", "Rs. 2.5 Crore"),
    ("Working Capital Value: Rs. 2.5\nCrores\n", "Rs. 2.5 Crores"),
])
def test_label_capture_keeps_unit(text, expected):
    assert extract_regex_safe("Working Capital Value", text) == expected


def test_label_capture_without_unit_is_unchanged():
    assert extract_regex_safe("Working Capital Value", "Working Capital Value: Rs. 61,00,000\nNext line") == "Rs. 61,00,000"


def test_truncated_value_is_not_100000x_understated():
    captured = extract_regex_safe("Working Capital Value", "Working Capital Value: Rs. 61.00\nLac\n")
    assert parse_money(captured) == pytest.approx(6_100_000.0)


# ── 2. complete_money_unit repairs a truncated Layer-1 / section value ──────

def test_complete_money_unit_repairs_value_whose_unit_is_on_the_next_line():
    assert complete_money_unit("Rs. 61.00", "Turnover: Rs. 61.00\nLacs per annum") == "Rs. 61.00 Lacs"


@pytest.mark.parametrize("value", ["Rs. 61.00 Lac", "Not Applicable", "NA", None, "Rs. 61.00"])
def test_complete_money_unit_leaves_other_values_alone(value):
    # "Rs. 61.00" is left alone here because it is not followed by a unit in this text.
    assert complete_money_unit(value, "Net Worth: Rs. 61.00 positive") == value


def test_section_value_truncated_by_layer1_gets_its_unit_back():
    text = "2.3 WORKING CAPITAL\nWorking Capital Value: Rs. 61.00\nLac\n"
    sections = [{"title": "Financial", "fields": [{"label": "Working Capital Value", "value": "Rs. 61.00"}]}]
    assert _info(text, sections)["working_capital_value_display"] == "Rs. 61.00 Lac"


@pytest.mark.parametrize("field_label, key", [
    ("Net Worth Value", "net_worth_value_display"),
    ("Solvency Certificate Value", "solvency_certificate_value_display"),
    ("Working Capital Value", "working_capital_value_display"),
])
def test_financial_fields_keep_unit_end_to_end(field_label, key):
    assert _info(f"{field_label}: Rs. 61.00\nLac\n")[key] == "Rs. 61.00 Lac"


# ── 3. Explicit BEC regexes: Lacs / Lakh / Crore variants ───────────────────

def test_turnover_crore_not_cut_to_cr_and_parsed_correctly():
    text = (
        "2.1 ANNUAL TURNOVER: The Average Annual Turnover of the bidder during the preceding 03 (three) "
        "financial years should be at least Rs. 1.5\nCrore.\n"
    )
    assert _info(text)["avg_annual_turnover_value_display"] == "₹1,50,00,000"


def test_turnover_singular_lakh_now_captured():
    text = "Average Annual Turnover of the bidder should be at least Rs. 61 Lakh.\n"
    assert _info(text)["avg_annual_turnover_value_display"] == "₹61,00,000"


def test_order_value_lacs_via_first_work_order_anchor():
    # Old pattern accepted only "Lakhs?" here, so "Lacs" was not captured at all.
    assert _info("Schedule 1 Minimum order value 12.5 Lacs\n")["order_value_1_display"] == "₹1,250,000.00"


# ── 4. Real split-line order values (Morena, Visakhapatnam) ─────────────────

def test_morena_order_value_with_lacs_split_by_line_break():
    """Verbatim Morena: 'order/Work order value of INR \\n2.9 Lacs' -> ₹2.9 lakh (was 'Not Applicable')."""
    assert _info(MORENA_OV_CLAUSE)["order_value_1_display"] == "₹290,000.00"


def test_morena_order_value_when_unit_itself_is_on_the_next_line():
    """Morena GeM-parent layout breaks after the number instead: 'INR 2.9\\nLacs'."""
    text = "b.      Minimum Purchase order/\nWork order value of INR 2.9\nLacs for Split AC.\n"
    assert _info(text)["order_value_1_display"] == "₹290,000.00"


def test_visakhapatnam_order_of_value_not_less_than_lacs():
    assert _info(VIZAG_OV_CLAUSE)["order_value_1_display"] == "₹1,246,000.00"
