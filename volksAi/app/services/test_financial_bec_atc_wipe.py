"""
Fix A -- the GeM blanket financial-eligibility wipe must consider the ATC.

build_infosheet_data() wipes every financial field (turnover / working capital /
net worth / solvency -> "Not Applicable" / "₹0.00") for a GeM tender with no
financial BEC. The detector used to be one narrow regex (a 100-char window after
exactly "Annual (Average) Turnover" etc.): it missed real ATC clauses whose amount
sits further away, and it DID match GAIL's bank-guarantee boilerplate ("Bank ...
having net worth more than Rs. 100 Crores"), so the decision was driven by the wrong text.

Now main and ATC text are each checked with has_financial_bec_content(), and the
wipe only runs when neither shows a bidder financial BEC.

The GeM parent lines and every negative (boilerplate) sentence below are verbatim
(whitespace-normalized) from the real Morena GeM bid and its ATC (ATcSPlit.pdf) or
other real GAIL ATCs in the gold-standard set. No real tender in the corpus carries
a financial BEC with an amount (all declare it NOT APPLICABLE), so the positive ATC
turnover clause is synthetic, written in GAIL's clause style.
"""
import pytest

from app.services.tender_mapper import build_infosheet_data, has_financial_bec_content

# Real Morena GeM parent overview lines ("Turnover: No" style) -- no financial BEC.
MORENA_GEM_PARENT = (
    "Bid Details Bid Number: GEM/2025/B/7021103 Dated: 19-12-2025\n"
    "MSE Relaxation for Years of\nExperience and Turnover\nNo\n"
    "Startup Relaxation for Years of\nExperience and Turnover\nNo\n"
    "Document required\nfrom seller\nExperience Criteria,Bidder Turnover,Certificate (Requested\n"
    "in ATC),OEM Authorization Certificate,Additional Doc 1\n(Requested in ATC)\n"
    "*In case any bidder is seeking exemption from Experience /\nTurnover Criteria, the supporting "
    "documents to prove his\neligibility for exemption must be uploaded for evaluation by\nthe buyer\n"
)

# Real GAIL ATC boilerplate that pairs financial keywords with amounts but is NOT a bidder BEC.
BANK_GUARANTEE_PROFORMA = (
    "We, the ____________________________________ Bank at _____________________________having our "
    "Head Office ________________________________________________________ (Local Address) and having "
    "net worth more than Rs. 100,00,00,000.00 [Rupees One Hundred Crores] or its equivalent in foreign currency"
)
COMMERCIAL_BANK_NET_WORTH = (
    "However, in case of 'Bank Guarantee' from Banks other than the Nationalized Indian Banks, the Bank "
    "must be commercial Bank having net worth in \nexcess of Rs. 100 Crores [Rupees One Hundred Crores]"
)
GEM_SELLER_EXEMPTION = "(v) Sellers/ Service Provider having annual turnover of INR 500 Crore or more."
PAN_RULE = (
    "mentioning of PAN no. is mandatory for transactions related to procurement of goods / services "
    "exceeding Rs. 2 Lacs per transaction or as amended from time to time."
)
MII_THRESHOLD = (
    "The bidder seeking Relaxation from Turnover shall upload the supporting documents to prove his "
    "eligibility for Relaxation. 3. Preference to Make In India products (For bids < 200 Crore)"
)
EXCHANGE_RATE_NOTE = (
    "(b) BEC (Financial Criteria): (i) For Average Annual Turnover: The average of Bill Selling "
    "(foreign exchange) Rate of State Bank of India as prevailing on the First date and Last date"
)

ATC_WITH_ONLY_BOILERPLATE = "\n\n".join([
    "TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025 GeM Bid No.: GEM/2025/B/7021103",
    BANK_GUARANTEE_PROFORMA, COMMERCIAL_BANK_NET_WORTH, GEM_SELLER_EXEMPTION, PAN_RULE,
])

# Synthetic GAIL-style ATC turnover clause (the unit split across a line break, as PDF
# extraction produces for Morena's real "INR 2.9\nLacs" order-value line).
ATC_WITH_REAL_TURNOVER = (
    "TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025 GeM Bid No.: GEM/2025/B/7021103\n"
    "2.0 BEC-FINANCIAL CRITERIA\n"
    "2.1 ANNUAL TURNOVER:\n"
    "The Average Annual Turnover of the bidder during the preceding 03 (three) financial years,\n"
    "as per the audited financial statements, should be at least Rs. 8.70\nLacs.\n\n"
    + COMMERCIAL_BANK_NET_WORTH
)

FINANCIAL_KEYS = (
    "avg_annual_turnover_type_display",
    "working_capital_type_display",
    "net_worth_type_display",
    "solvency_certificate_type_display",
)


def _infosheet(atc_text=None):
    return build_infosheet_data(
        [], page_texts=[{"page": 1, "text": MORENA_GEM_PARENT}], atc_full_text=atc_text, has_atc=bool(atc_text),
    )


# ── Detector unit tests ─────────────────────────────────────────────────────

@pytest.mark.parametrize("boilerplate", [
    BANK_GUARANTEE_PROFORMA, COMMERCIAL_BANK_NET_WORTH, GEM_SELLER_EXEMPTION,
    PAN_RULE, MII_THRESHOLD, EXCHANGE_RATE_NOTE, MORENA_GEM_PARENT,
])
def test_real_boilerplate_is_not_a_financial_bec(boilerplate):
    assert has_financial_bec_content(boilerplate) is False


@pytest.mark.parametrize("clause", [
    ATC_WITH_REAL_TURNOVER,
    "Minimum Average Annual Turnover of the bidder (For 3 Years)\n5 Lakh (s)",
    "2.2 NET WORTH: Net worth of the bidder should be positive and not less than Rs. 25 Lakhs",
    "Working Capital: The bidder should have working capital of minimum 10% of the estimated tender value",
    "Solvency Certificate: Bidder shall submit a Solvency Certificate of minimum Rs. 10 Lakhs issued by any scheduled bank",
])
def test_real_financial_clauses_are_detected(clause):
    assert has_financial_bec_content(clause) is True


def test_empty_text_has_no_financial_bec():
    assert has_financial_bec_content("") is False
    assert has_financial_bec_content(None) is False


# ── Wipe behavior in build_infosheet_data() ─────────────────────────────────

def test_parent_turnover_no_but_atc_has_real_turnover_clause_is_not_wiped():
    """Parent GeM overview shows no financial BEC; the ATC has one -> must NOT wipe."""
    info = _infosheet(ATC_WITH_REAL_TURNOVER)
    assert info["avg_annual_turnover_type_display"] != "Not Applicable"
    assert info["avg_annual_turnover_value_display"] != "₹0.00"
    assert "8.70" in str(info["avg_annual_turnover_value_display"]) or "8,70" in str(info["avg_annual_turnover_value_display"])


def test_parent_and_atc_both_without_financial_bec_is_wiped():
    """Neither document has a bidder financial BEC (ATC holds only boilerplate amounts) -> wipe is correct.

    Before Fix A this case was NOT wiped: the old regex matched the bank-guarantee
    'net worth ... Rs. 100 Crores' boilerplate and treated it as a financial BEC.
    """
    info = _infosheet(ATC_WITH_ONLY_BOILERPLATE)
    for key in FINANCIAL_KEYS:
        assert info[key] == "Not Applicable", key
    assert info["avg_annual_turnover_value_display"] == "₹0.00"


def test_gem_parent_without_atc_and_without_financial_bec_is_wiped():
    info = _infosheet(None)
    for key in FINANCIAL_KEYS:
        assert info[key] == "Not Applicable", key
