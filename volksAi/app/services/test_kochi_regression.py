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
Payment Terms:
a.) 70% of payment against supply portion shall be released after supply of material at site within 30 days of receipt and acceptance of material at site through e-banking.
b.) Balance 30% payment against supply portion shall be released after completion of Commissioning job at site by service engineer and lifting of buyback items.
c.) 100% of payment against Installation & Commissioning charges shall be released after completion of Commissioning job at site.
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

    # 2. Payment Terms Structured Milestones (exact match, no any())
    assert infosheet.get("payment_terms_supply_display") == "supply portion 70% on receipt and acceptance within 30 days / 30% after commissioning and lifting of buyback items; installation and commissioning 100% on completion"
    assert infosheet.get("payment_terms_installation_display") == "100% on completion"
    assert dto.get("paymentTermsSupply") is None
    assert dto.get("paymentTermsInstallation") is None

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

    # 6. Physical Documents (Yes within 7 days of Bid Due Date, explicit IST)
    assert infosheet.get("physical_docs_required_display") == "Yes"
    assert "7 days" in str(infosheet.get("physical_docs_deadline_display")).lower()
    assert dto.get("physicalDocsRequired") == "YES"
    # 7 days from 08-10-2026 14:00:00 = 2026-10-15T14:00:00+05:30
    assert dto.get("physicalDocsDeadline") == "2026-10-15T14:00:00+05:30"

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

    # 10. DTO null handling: PRS-only LD reaches DTO as null (not 0)
    assert dto.get("ldPercentagePerWeek") is None
    assert dto.get("maxLdPercentage") is None

    # Unknown installation percentage reaches DTO as null (not 0)
    raw_unknown_inst = {"payment_terms_installation_display": "⚠️ MISSING"}
    dto_unknown_inst = map_to_tms_dto(raw_unknown_inst)
    assert dto_unknown_inst.get("paymentTermsInstallation") is None


def test_dto_not_applicable_never_parsed_to_zero():
    """Confirm the DTO sends null (not 0) when a value is missing or 'Not Applicable'."""
    raw_not_applicable = {
        "tender_value_display": "Not Applicable",
        "emd_amount_display": "Not Applicable",
        "avg_annual_turnover_value_display": "Not Applicable",
        "payment_terms_supply_display": "Not Applicable",
        "payment_terms_installation_display": "Not Applicable",
        "delivery_time_supply_display": "Not Applicable",
        "delivery_time_installation_days_display": "Not Applicable",
        "ld_percentage_display": "Not Applicable",
        "max_ld_percentage_display": "Not Applicable",
        "pbg_percentage_display": "Not Applicable",
        "sd_percentage_display": "Not Applicable",
        "experience_years_display": "Not Applicable",
    }
    dto = map_to_tms_dto(raw_not_applicable)
    numeric_fields = [
        "tenderValue", "emdAmount", "avgAnnualTurnoverValue",
        "paymentTermsSupply", "paymentTermsInstallation",
        "deliveryTimeSupply", "deliveryTimeInstallationDays",
        "ldPercentagePerWeek", "maxLdPercentage",
        "pbgPercentage", "sdPercentage", "techEligibilityAge"
    ]
    for field in numeric_fields:
        val = dto.get(field)
        assert val is None, f"Field '{field}' should be None, but got {val!r}"


def test_kochi_real_pdfs_regression():
    """
    Kochi regression run directly against the real 7-page GeM PDF and 261-page GAIL ATC PDF.
    Must execute and NOT be skipped.
    """
    import fitz
    from pathlib import Path

    tms_root = Path(__file__).resolve().parents[3]
    p1 = tms_root / "api/uploads/tendering/tender-documents/1790747505320_1789642933617_GeM-Bidding-9879403__1_.pdf"
    p2 = tms_root / "api/uploads/tendering/tender-documents/1790747530909_1789816376520_1789643024088_Tender1_f4d8b1ff-effa-.pdf"

    assert p1.exists(), f"Real GeM bidding PDF missing: {p1}"
    assert p2.exists(), f"Real GAIL ATC PDF missing: {p2}"

    pages = []
    doc1 = fitz.open(str(p1))
    for i in range(len(doc1)):
        pages.append({"page": i + 1, "text": doc1[i].get_text()})
    doc2 = fitz.open(str(p2))
    for i in range(len(doc2)):
        pages.append({"page": len(doc1) + i + 1, "text": doc2[i].get_text()})

    infosheet = build_infosheet_data([], page_texts=pages)
    dto = map_to_tms_dto(infosheet)

    # 1. Tender ID & Due Dates
    assert "8024876" in str(infosheet.get("tender_id_display"))
    assert infosheet.get("gem_bid_end_date_display") == "08-10-2026 14:00:00"
    assert infosheet.get("gem_bid_opening_date_display") == "09-10-2026 14:00:00"
    assert dto.get("gemBidEndDate") == "08-10-2026 14:00:00"
    assert dto.get("gemBidOpeningDate") == "09-10-2026 14:00:00"

    # 2. LD / PRS (rates null in DTO, ldType PRS)
    assert infosheet.get("ld_type_display") == "PRS"
    assert dto.get("ldType") == "PRS"
    assert dto.get("ldPercentagePerWeek") is None
    assert dto.get("maxLdPercentage") is None

    # 3. Scope / Installation Inclusive (SITC Scope)
    assert infosheet.get("installation_inclusive_display") == "Yes"
    assert infosheet.get("delivery_time_installation_display") == "Inclusive (SITC Scope)"
    assert dto.get("deliveryTimeInstallationInclusive") is True

    # 4. Physical Docs (Yes, within 7 days of Bid Due Date)
    assert infosheet.get("physical_docs_required_display") == "Yes"
    assert "7 days" in str(infosheet.get("physical_docs_deadline_display")).lower()
    assert dto.get("physicalDocsRequired") == "YES"
    assert dto.get("physicalDocsDeadline") == "2026-10-15T14:00:00+05:30"

    # 5. Contacts: Client 1 Allan Tomy, Client 2 Sabu Mathews, Grievance sharikumar
    assert infosheet.get("client_name_1_display") == "Allan Tomy"
    assert infosheet.get("client_email_1_display") == "allan.tomy@gail.co.in"
    assert infosheet.get("client_name_2_display") == "Sabu Mathews"
    assert infosheet.get("client_email_2_display") == "sabu.mathews@gail.co.in"
    assert infosheet.get("grievance_email_display") == "sharikumar@gail.co.in"
    clients = dto.get("clients") or []
    assert len(clients) >= 2
    assert clients[0].get("clientName") == "Allan Tomy"
    assert clients[1].get("clientName") == "Sabu Mathews"

    # 6. Pre-Bid Meeting (24-09-2026 11:00:00 via MS Teams)
    assert "24-09-2026 11:00:00" in str(infosheet.get("pre_bid_meeting_display"))
    assert "MS Teams" in str(infosheet.get("pre_bid_meeting_display"))
    assert "442 264 756 481 795" in str(infosheet.get("pre_bid_meeting_display"))

    # 7. Payment Terms: exact milestone text, both % boxes empty in DTO
    assert infosheet.get("payment_terms_supply_display") == "supply portion 70% on receipt and acceptance within 30 days / 30% after commissioning and lifting of buyback items; installation and commissioning 100% on completion"
    assert infosheet.get("payment_terms_installation_display") == "100% on completion"
    assert dto.get("paymentTermsSupply") is None
    assert dto.get("paymentTermsInstallation") is None

    # 8. Experience Years: 7 years
    assert str(infosheet.get("experience_years_display")).startswith("7")
    assert dto.get("techEligibilityAge") == 7

    # 9. Turnover: Not Applicable -> null in DTO (never 0)
    assert dto.get("avgAnnualTurnoverValue") is None


def test_80_20_100_payment_terms_regression():
    """
    User Requirement 1:
    Test 80/20/100 wording that produces 80/20/100 without buyback specificity in template.
    Leave % boxes empty (None) in DTO for structured multi-milestone splits.
    """
    text = """
    TERMS OF PAYMENT:
    a.) 80% along with 100% GST on receipt and acceptance within 30 days of material at site.
    b.) Balance 20% payment shall be released after commissioning and handover.
    c.) 100% of payment against Installation & Commissioning charges shall be released after completion of Commissioning job at site.
    """
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    dto = map_to_tms_dto(infosheet)

    expected = "supply portion 80% on receipt and acceptance within 30 days / 20% after commissioning and handover; installation and commissioning 100% on completion"
    assert infosheet.get("payment_terms_supply_display") == expected
    assert infosheet.get("payment_terms_installation_display") == "100% on completion"
    assert dto.get("paymentTermsSupply") is None
    assert dto.get("paymentTermsInstallation") is None


