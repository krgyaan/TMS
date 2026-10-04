import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto

KOCHI_GEM_BIDDING_TEXT = """
Bid Details / बिड विवरण
Bid End Date/Time / बोली समाप्ति दिनांक/समय: 08-10-2026 14:00:00
Bid Opening Date/Time / बोली खोलने की दिनांक/समय: 09-10-2026 14:00:00
Bid Offer Validity (From End Date) / बोली की वैधता (समाप्ति दिनांक से): 30 (Days)
Item Category: Custom Bid for Services - Lumpsum Charges For Supply, Installation & Commissioning of Flow Meters
EMD Amount: 80144
ePBG Percentage (%): 5.00
Duration of ePBG required (Months): 33
"""

KOCHI_ATC_TEXT = """
SECTION I: INVITATION FOR BIDS (IFB)
Item Category: Custom Bid for Services - Lumpsum Charges For Supply, Installation & Commissioning of Flow Meters
Bid Number: GEM/2026/B/8024876

Pre-Bid Details / Detail(s):
Pre-Bid Date and Time:
24-09-2026 11:00:00
Pre-Bid Venue:
Through Video Conferencing on MS Teams. Link will be shared with prospective bidders.

CONTACT DETAILS OF TENDER DEALING OFFICER:
1. Dealing Officer (Commercial):
Name: Shri Allan Tomy
Designation: Manager (C&P)
Email: allan.tomy@gail.co.in
Phone: 0484 2983210

2. Secondary Dealing Officer:
Name: Shri Sabu Mathews
Designation: DGM (C&P)
Email: sabu.mathews@gail.co.in
Phone: 0484 2983217

Grievance Redressal Mechanism:
HOD Email id: sharikumar@gail.co.in
Contact details of Grievance redressal HOD: Shri Shari Kumar, GM (P&C)

SECTION II: SPECIAL CONDITIONS OF CONTRACT (SCC)
CLAUSE 8: TECHNICAL EXPERIENCE CRITERIA
The bidder must have successfully executed similar work during preceding 7 (Seven) years prior to final bid due date.

CLAUSE 10: CONTRACT PERFORMANCE SECURITY (CPBG)
The successful bidder shall submit Contract Performance Security / PBG for 5% of Total Order Value.
CPBG may be submitted in the form of Bank Guarantee (BG), Banker's Cheque / Demand Draft (DD), Fixed Deposit Receipt (FDR), Insurance Surety Bond (SB) or Letter of Credit (LC).

CLAUSE 14: PRICE REDUCTION SCHEDULE (PRS)
Price Reduction Schedule (PRS) as per GAIL standard GCC/SCC shall apply for delay in completion.
PRS shall be applicable on the contract price for delays.

CLAUSE 18: PHYSICAL DOCUMENTS SUBMISSION
Bidder shall submit original EMD / Power of Attorney (POA) in physical form to GAIL office within 7 days of Bid Due Date.

CLAUSE 22: TERMS OF PAYMENT
Terms of payment for Supply:
(a) 70% along with 100% GST on receipt of materials at site against dispatch documents.
(b) 30% on successful completion of installation, testing & commissioning and lifting of buyback material.

Terms of payment for Installation & Commissioning:
(a) 100% of installation and commissioning charges upon successful completion, final testing and handover.
"""

def test_kochi_tender_ground_truth_regression():
    page_texts = [
        {"page": 1, "text": KOCHI_GEM_BIDDING_TEXT},
        {"page": 2, "text": KOCHI_ATC_TEXT},
    ]
    infosheet = build_infosheet_data([], page_texts=page_texts)
    dto = map_to_tms_dto(infosheet)

    # 1. Bid End Date/Time (08-10-2026 14:00:00) & Bid Opening Date (09-10-2026 14:00:00)
    assert infosheet.get("gem_bid_end_date_display") == "08-10-2026 14:00:00"
    assert infosheet.get("gem_bid_opening_date_display") == "09-10-2026 14:00:00"
    assert dto.get("gemBidEndDate") == "08-10-2026 14:00:00"
    assert dto.get("gemBidOpeningDate") == "09-10-2026 14:00:00"

    # 2. Payment Terms Structured Milestones (70/30/100)
    supply_pt = str(infosheet.get("payment_terms_supply_display"))
    assert "70%" in supply_pt
    inst_pt = str(infosheet.get("payment_terms_installation_display"))
    assert any(m in inst_pt for m in ("30%", "100%"))

    # 3. LD / PRS with null rates (not fabricated 0.5% or 5%)
    assert infosheet.get("ld_type_display") == "PRS"
    assert infosheet.get("ld_required") == "Yes"
    assert infosheet.get("ld_percentage_display") in ("NA", "Not Found", None, "⚠️ MISSING")
    assert infosheet.get("max_ld_percentage_display") in ("NA", "Not Found", None, "⚠️ MISSING")
    assert dto.get("ldType") == "PRS"
    assert dto.get("ldPercentagePerWeek") is None
    assert dto.get("maxLdPercentage") is None

    # 4. Installation Inclusive (SITC Scope)
    assert infosheet.get("installation_inclusive_display") == "Yes"
    assert infosheet.get("delivery_time_installation_display") == "Inclusive (SITC Scope)"
    assert dto.get("deliveryTimeInstallationInclusive") is True

    # 5. Experience Years (7 years)
    assert str(infosheet.get("experience_years_display")).startswith("7")
    assert dto.get("techEligibilityAge") == 7

    # 6. Physical Documents (Yes within 7 days of Bid Due Date)
    assert infosheet.get("physical_docs_required_display") == "Yes"
    assert "7 days" in str(infosheet.get("physical_docs_deadline_display")).lower()
    assert dto.get("physicalDocsRequired") == "YES"
    # 7 days from 08-10-2026 14:00:00 = 2026-10-15T14:00:00
    assert dto.get("physicalDocsDeadline") == "2026-10-15T14:00:00"

    # 7. Contacts: Client 1 and Client 2 are distinct, Client 2 is Sabu Mathews, Grievance is separate
    assert infosheet.get("client_name_1_display") == "Allan Tomy"
    assert infosheet.get("client_email_1_display") == "allan.tomy@gail.co.in"
    assert infosheet.get("client_name_2_display") == "Sabu Mathews"
    assert infosheet.get("client_email_2_display") == "sabu.mathews@gail.co.in"
    assert infosheet.get("grievance_email_display") == "sharikumar@gail.co.in"
    assert infosheet.get("client_email_2_display") != infosheet.get("grievance_email_display")
    clients = dto.get("clients") or []
    assert len(clients) >= 2
    assert clients[0].get("clientName") == "Allan Tomy"
    assert clients[1].get("clientName") == "Sabu Mathews"
    assert clients[1].get("clientEmail") != "sharikumar@gail.co.in"

    # 8. PBG Modes (DD / SB / FDR / BG / LC)
    pbg_m = str(infosheet.get("pbg_mode_display")).upper()
    assert all(inst in pbg_m for inst in ("DD", "FDR", "BG", "LC"))
    pbg_dto_modes = dto.get("pbgMode") or []
    assert set(["DD", "FDR", "PBG", "SB", "LC"]).issubset(set(pbg_dto_modes))

    # 9. Pre-bid Meeting (24-09-2026 11:00:00)
    assert "24-09-2026 11:00:00" in str(infosheet.get("pre_bid_meeting_display"))
    assert "24-09-2026 11:00:00" in str(dto.get("preBidMeeting"))
