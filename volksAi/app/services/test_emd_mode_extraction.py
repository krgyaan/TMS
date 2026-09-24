import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


def test_emd_mode_not_applicable_when_emd_not_required_or_zero():
    """
    Case 1: Document specifies EMD Required: No or EMD Amount: ₹0.00.
    EMD mode must be explicitly 'Not Applicable' (Case D), not '⚠️ MISSING',
    and map to None in TMS DTO.
    """
    text_emd_no = (
        "BID DETAILS\n"
        "EMD Required: No\n"
        "EMD Amount: 0.00\n"
        "Bid Splitting: Not Applied\n"
    )

    page_texts = [{"page": 1, "text": text_emd_no}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("emd_required_display") == "No"
    assert infosheet.get("emd_mode_display") == "Not Applicable"
    assert "emd_mode_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("emdModes") is None


def test_emd_mode_missing_when_emd_required_but_modes_not_in_section():
    """
    Case 2: Document requires EMD (e.g. ₹2,00,000), but the EMD section does not
    specify allowed instruments. General boilerplate mentions DD, NEFT, FDR, etc.
    Must return '⚠️ MISSING' instead of fabricating instruments from general text.
    """
    text_emd_required_without_mode = (
        "SECTION I: INVITATION FOR BIDS\n"
        "(E) BID SECURITY / EARNEST MONEY DEPOSIT (EMD)\n"
        "Amount: Rs. 2,00,000/- (Rupees Two Lakhs Only)\n"
        "The EMD shall remain valid for 90 days beyond bid validity.\n"
        "(F) SUBMISSION OF BIDS\n\n"
        "SECTION II: GENERAL CONDITIONS OF CONTRACT\n"
        "Payments will be processed via online banking, NEFT, RTGS or Demand Draft.\n"
        "Bank Guarantee may be submitted for performance security.\n"
    )

    page_texts = [{"page": 1, "text": text_emd_required_without_mode}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("emd_required_display") == "Yes"
    assert infosheet.get("emd_mode_display") == "⚠️ MISSING"
    assert "emd_mode_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("emdModes") is None


def test_emd_mode_extracted_from_emd_section():
    """
    Case 3: Document contains an explicit EMD clause specifying permitted modes.
    Must extract only the instruments explicitly specified in that section.
    """
    text_with_emd_modes = (
        "SECTION I: INVITATION FOR BIDS\n"
        "(E) BID SECURITY / EARNEST MONEY DEPOSIT (EMD)\n"
        "Amount: Rs. 1,50,000/-\n"
        "The Bid Security / EMD may be submitted in the form of Demand Draft or "
        "Bank Guarantee or Banker's Cheque.\n"
        "(F) SUBMISSION OF BIDS\n"
    )

    page_texts = [{"page": 1, "text": text_with_emd_modes}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("emd_required_display") == "Yes"
    mode_str = infosheet.get("emd_mode_display")
    assert "BT" in mode_str
    assert "DD" in mode_str
    assert "BG" in mode_str
    assert "SB" not in mode_str
    assert "FDR" not in mode_str
    assert "emd_mode_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("emdModes") is not None
    assert set(dto.get("emdModes")) == {"Bank Transfer", "Demand Draft", "Bank Guarantee"}


def test_emd_mode_does_not_sweep_all_5_instruments_from_boilerplate():
    """
    Case 4: Prevents the bug where all 5 instruments (BT/DD/SB/FDR/BG) were
    fabricated from whole-document keyword sweeps when EMD is present without modes.
    """
    text_with_all_instruments_in_gcc = (
        "SECTION I: INVITATION FOR BIDS\n"
        "(E) BID SECURITY / EARNEST MONEY DEPOSIT (EMD)\n"
        "Amount: Rs. 50,000/-\n"
        "(F) DUE DATE\n\n"
        "SECTION X: FINANCIAL DEFINITIONS & MISCELLANEOUS\n"
        "Instruments acceptable to the corporation include fixed deposit (FDR), "
        "demand draft, banker's cheque, insurance surety bond, and bank guarantee.\n"
    )

    page_texts = [{"page": 1, "text": text_with_all_instruments_in_gcc}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("emd_mode_display") == "⚠️ MISSING"
    assert "emd_mode_display" in infosheet.get("missing_fields", [])
    dto = map_to_tms_dto(infosheet)
    assert dto.get("emdModes") is None
