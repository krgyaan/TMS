"""
Fix I -- EMD instruments: Banker's Cheque -> DD (not Bank Transfer), and the EMD section
search must reach the clause that actually lists the instruments.

Real case: GAIL Kochi tender for GEM/2026/B/8024876 ("Tender1", 261 pages). The EMD mode
came back MISSING because the search used the FIRST "BID SECURITY" text it found: the
Tag (E) summary (which only says "Refer clause no. 16.0 of ITB & BDS"), and otherwise
the GeM "EMD Detail" row or the table-of-contents entry -- never clause 16.1 (DD /
Banker's Cheque / Insurance Surety Bond / FDR / Bank Guarantee) or 16.2 (online banking
IMPS/NEFT/RTGS). Separately, "banker's cheque" was mapped to BT, and the check used an
ASCII apostrophe while GAIL prints "Banker’s Cheque" with a curly one.

Fixtures are verbatim PyMuPDF text from the real documents, in document order. The last
test runs against the full real Tender1 PDF when it is present in api/uploads.
"""
from pathlib import Path

import fitz
import pytest

from app.services.tender_mapper import (
    _RE_EMD_SECTION,
    _is_toc_entry,
    build_infosheet_data,
    detect_emd_instruments,
    find_emd_instrument_block,
)
from app.services.tms_field_mapper import map_to_tms_dto

GEM_EMD_DETAIL_ROW = (  # GeM bid PDF p.1 (English side of the bilingual rows)
    "Bid Details\nEMD Detail\nAdvisory Bank\nState Bank of India\nEMD Amount\n80144\n"
    "ePBG Detail\nAdvisory Bank\nState Bank of India\n"
)
TENDER1_TOC = (
    "14. \nBID CURRENCIES \n15. \nBID VALIDITY \n16. \nEARNEST MONEY DEPOSITE (EMD) / BID SECURITY \n"
    "17. \nPRE-BID MEETING \n18. \nFORMAT AND SIGNING OF BID \n"
)
TENDER1_TAG_E = (
    "(E) \nBID SECURITY / \nEARNEST \nMONEY DEPOSIT \n(EMD) \n \nAPPLICABLE \n \nNOT APPLICABLE \n \n \n"
    "EMD/Bid Security Amount: Rs.  80,144/-.  \n \nRefer clause no. 16.0 of ITB & BDS for details \n"
    "(F) \nDATE, TIME  & \nVENUE OF PRE-\nBID MEETING \n"
)
TENDER1_CLAUSE_16 = (
    "16 \nEARNEST MONEY DEPOSIT (EMD):  \n \n"
    "TENDER/BID DOCUMENT FOR PROCUREMENT OF NI-CD BATTERY BANKS FOR DT AND IP ELOOR IN KKBMPL REGION\n"
    "Page 43 of 261\n\n \n"
    "16.1 \nBid must be accompanied with earnest money deposit (i.e Earnest Money Deposit (EMD) \n"
    "also known as Bid Security) in the form of ‘Demand Draft’ / ‘Banker’s Cheque’ /Insurance \n"
    "Surety Bond’(strictly as per form F-2C) / ‘Fixed Deposit Receipt’ [in favour of GAIL \n"
    "(India) Limited payable at place mentioned in BDS] or ‘Bank Guarantee (including e- bank \n"
    "guarantee)’ strictly as per the format given in form F-2B of the Tender Document. Bidder \n"
    "shall ensure that EMD submitted in the form of ‘Bank Guarantee’ should have a validity of \n"
    "at least ‘two [02] months’ beyond the validity of the Bid. EMD submitted in the form of \n"
    "‘Demand Draft’ or ‘Banker’s Cheque’ should be valid for three months..   \n"
    "Bid not accompanied with EMD, or EMD not in requisite format shall be liable for rejection. \n"
    "The EMD shall be submitted in Indian Rupees only.  \n"
    "16.2 The bidder can also submit the EMD through online banking transaction i.e. \n"
    "IMPS/NEFT/RTGS etc. For this purpose, the details of GAIL’s Bank Account are \n"
    "mentioned under BDS.\n"
    "17. \nPRE-BID MEETING \n"
)
KOCHI_TEXT = GEM_EMD_DETAIL_ROW + TENDER1_TOC + TENDER1_TAG_E + TENDER1_CLAUSE_16

REAL_TENDER1_PDF = (
    Path(__file__).resolve().parents[3] / "api" / "uploads" / "tendering" / "tender-documents"
    / "1790747530909_1789816376520_1789643024088_Tender1_f4d8b1ff-effa-.pdf"
)


# ── Banker's Cheque -> DD ────────────────────────────────────────────────────

@pytest.mark.parametrize("text", [
    "in the form of ‘Banker’s Cheque’",   # curly apostrophe, as printed by GAIL
    "in the form of Banker's Cheque",     # ASCII apostrophe
    "in the form of Bankers Cheque",
])
def test_bankers_cheque_maps_to_dd_not_bank_transfer(text):
    assert detect_emd_instruments(text) == ["DD"]


def test_genuine_online_transfer_is_still_bt():
    assert detect_emd_instruments("online banking transaction i.e. IMPS/NEFT/RTGS") == ["BT"]


def test_bankers_cheque_reaches_tms_as_dd():
    dto = map_to_tms_dto({"emd_mode_display": "/".join(detect_emd_instruments("‘Banker’s Cheque’"))})
    assert dto["emdModes"] == ["DD"]


# ── EMD section search ───────────────────────────────────────────────────────

def test_toc_entry_is_recognised_and_skipped():
    toc_matches = [m for m in _RE_EMD_SECTION.finditer(TENDER1_TOC)]
    assert toc_matches and all(_is_toc_entry(m, TENDER1_TOC) for m in toc_matches)
    assert find_emd_instrument_block(TENDER1_TOC) == ""


def test_search_reaches_clause_16_1_and_16_2_not_toc_or_tag_e_summary():
    block = find_emd_instrument_block(KOCHI_TEXT, tag_e_block=TENDER1_TAG_E)
    assert "Fixed Deposit Receipt" in block             # clause 16.1's instrument list
    assert "IMPS/NEFT/RTGS" in block                    # sibling sub-clause 16.2
    assert "PRE-BID MEETING" not in block               # stopped at clause 17
    assert "Refer clause no. 16.0" not in block         # not the Tag (E) summary


def test_kochi_emd_mode_end_to_end():
    info = build_infosheet_data([], page_texts=[{"page": 1, "text": KOCHI_TEXT}])
    assert info["emd_mode_display"] == "BT/DD/SB/FDR/BG"   # was '⚠️ MISSING'
    assert map_to_tms_dto(info)["emdModes"] == ["BANK_TRANSFER", "DD", "SB", "FDR", "BG"]


@pytest.mark.skipif(not REAL_TENDER1_PDF.exists(), reason="real Kochi Tender1 PDF not present in api/uploads")
def test_real_kochi_tender1_pdf():
    doc = fitz.open(str(REAL_TENDER1_PDF))
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    info = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert info["emd_mode_display"] == "BT/DD/SB/FDR/BG"
