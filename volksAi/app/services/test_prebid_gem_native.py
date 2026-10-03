"""
Fix G -- Pre-Bid Meeting on GeM's native bid-PDF template.

Real case: GEM/2026/B/8024876 (GAIL Kochi Kerala). The GeM bid PDF's "Pre Bid Detail(s)"
table is extracted column-wise with bilingual labels, so both labels come first (one of
them broken across lines: "Pre-Bid\\nDate and Time") and the values follow. The existing
aliases ("Pre-Bid Date and Time", "Pre-Bid Venue") never matched, and the GAIL-paragraph
scanner only knows "PRE-BID MEETING/CONFERENCE", so nothing was extracted.

Also covered, all found on real text while fixing this:
  * Kochi's companion tender document defers the date to the GeM bid and prints the
    Teams credentials -- the two are combined; its "+91-484-2983210/11/12/13" phone is no
    longer read as the date "11/12/13";
  * a table-of-contents "17. PRE-BID MEETING\\n18. ..." no longer yields "18.";
  * Morena's "PRE-BID MEETING  Not Applicable" no longer yields a page-header date;
  * Abu Road's GeM bid (13-03-2026) and GAIL ATC (14.03.2026) disagree: the ATC date is
    kept and the GeM date shown next to it, not silently dropped.
Fixtures are verbatim extracted text (PyMuPDF), including the garbled Hindi labels.
"""
from app.services.tender_mapper import build_infosheet_data

GEM_KOCHI_PREBID = (
    "Undertaking of Competent Authority is mandatory to create Custom Bid for Services. Please\n3 / 7\n\n"
    "download standard format document and upload:1789639923.pdf\n"
    "Pre Bid Detail(s)\n"
    "मूUय िभfनता खंड द'तावेज़/Pre-Bid\n"
    "Date and Time\n"
    "4ी-\x01बड 'थान/Pre-Bid Venue\n"
    "24-09-2026 11:00:00\n"
    "Through VC, MS-Team Link for the same provided in GAIL's Tender document\n"
    "Custom Bid For Services - Lumpsum Charges For Supply, Installation & Commissioning\n"
    "Of Ni-Cd Battery Banks On Buyback Basis For DT And IP Eloor In KKBMPL Region, As\n"
)

KOCHI_TENDER_DOC_PREBID = (
    "TIME  & \nVENUE OF PRE-\nBID MEETING \nPre-Bid Date & Time shall be as per GeM bid document. \n \n"
    "Venue: Pre-bid meeting will be held through video conferencing. \n"
    "Necessary link for video conferencing is as under: \n \nMicrosoft Teams meeting  \nJoin: \n"
    "https://teams.microsoft.com/meet/442264756481795?p=RBnfLTJaZQrdldFu3g  \n"
    "Meeting ID: 442 264 756 481 795  \nPasscode: Go2RU7B4  \n(G) \nDUE DATE, TIME \nOF BID \nSUBMISSION \n"
    "As per GEM Bid Document. \n(H) \nCONTACT \nDETAILS \nOF \nTENDER \nDEALING \nOFFICER \n"
    "Name : Allan Tomy \nDesignation: Manager (C&P) \n"
    "Phone No. & Extn : +91-484-2983210/11/12/13 Ext.: 1383 \ne-mail : allan.tomy@gail.co.in \n"
)

ABU_ROAD_GEM_PREBID = (
    "Pre Bid Detail(s)\nमूXय िभjनता खंड द&तावेज़/Pre-Bid\nDate and Time\n5ी-\x01बड &थान/Pre-Bid Venue\n"
    "13-03-2026 11:00:00\nThrough VC via Microsoft Teams meeting.\nMeeting ID: 436 966 051 957 22 \n"
    "Passcode: o27yw6kA\nProspective Bidder(s) may join the meeting as scheduled above.\n"
)
ABU_ROAD_ATC_PREBID = (
    "(F) \nDATE, TIME & VENUE \nOF PRE-BID MEETING \nDate : 14.03.2026 \nTime : 11:00 AM \n"
    "Venue : Through VC via Microsoft Teams meeting. \nMeeting ID: 436 966 051 957 22  \nPasscode: o27yw6kA \n"
)
MORENA_ATC_PREBID_NA = (
    "(F) DATE, TIME & VENUE OF PRE-BID\nMEETING \n Not Applicable \n(G) CONTACT DETAILS OF TENDER \n"
    "DEALING OFFICER \nName : Dean B George \n\n"
    "TENDER NO.: GAIL/KL/C&P/P25258/DG/MECH/2025 DATE: 19.12.2025 \n"
)
TOC_PREBID = "16. \nEARNEST MONEY DEPOSITE (EMD) / BID SECURITY \n17. \nPRE-BID MEETING \n18. \nFORMAT AND SIGNING OF BID \n"


def _prebid(main, atc=None):
    info = build_infosheet_data([], page_texts=[{"page": 1, "text": main}], atc_full_text=atc)
    return info["pre_bid_meeting_display"]


def test_gem_native_prebid_rows_yield_date_time_and_vc_teams_reference():
    value = _prebid(GEM_KOCHI_PREBID)
    assert value not in (None, "N/A", "⚠️ MISSING")
    assert "24-09-2026" in value
    assert "11:00" in value
    assert "VC" in value and "MS-Team" in value
    assert "Pre-Bid Venue" not in value  # the label row is not taken as the venue


def test_gem_rows_combined_with_companion_tender_teams_credentials():
    value = _prebid(GEM_KOCHI_PREBID, KOCHI_TENDER_DOC_PREBID)
    assert value.startswith("24-09-2026 11:00:00")
    assert "Meeting ID: 442 264 756 481 795" in value
    assert "Passcode: Go2RU7B4" in value
    assert "11/12/13" not in value


def test_phone_number_fragment_is_not_read_as_prebid_date():
    """Tender document alone: date is 'as per GeM bid' -> no date, but never '11/12/13'."""
    value = _prebid(KOCHI_TENDER_DOC_PREBID)
    assert "11/12/13" not in value
    assert "Meeting ID: 442 264 756 481 795" in value


def test_conflicting_gem_and_atc_dates_are_both_shown_atc_first():
    value = _prebid(ABU_ROAD_GEM_PREBID, ABU_ROAD_ATC_PREBID)
    assert value.startswith("14.03.2026 11:00 AM")
    assert "GeM bid states: 13-03-2026 11:00:00" in value


def test_prebid_not_applicable_is_not_replaced_by_a_page_header_date():
    assert _prebid(MORENA_ATC_PREBID_NA) == "Not Applicable"


def test_table_of_contents_entry_is_not_a_prebid_value():
    assert "18." not in _prebid(TOC_PREBID)
