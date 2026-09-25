import pytest
from app.services.tender_mapper import build_infosheet_data, resolve_atc_anchor_fields
from app.services.tms_field_mapper import map_to_tms_dto


def test_sd_not_fabricated_on_clause38_boilerplate():
    """
    Case 1: Document contains standard GCC Clause 38 text mentioning 3% or 10%
    for Contract Performance Security / Security Deposit, but lacks any checkbox
    or tender-specific mandate. Must NOT fabricate sd_required=True or sd_percentage.
    """
    gcc_boilerplate = (
        "GAIL (INDIA) LIMITED\n"
        "GENERAL CONDITIONS OF CONTRACT (GCC-GOODS)\n"
        "Clause 38.0 Contract Performance Security / Security Deposit\n"
        "The contractor shall furnish Contract Performance Security / Security Deposit "
        "of 3% of Total Order Value within 30 days.\n"
        "Clause 39.0 Sub-contracting\n"
    )

    # 1. Test ATC resolver
    atc = resolve_atc_anchor_fields(gcc_boilerplate)
    assert atc.get("sd_required") is None
    assert atc.get("sd_percentage") is None

    # 2. Test build_infosheet_data
    page_texts = [{"page": 1, "text": gcc_boilerplate}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("sd_percentage_display") == "⚠️ MISSING"
    assert "sd_percentage_display" in infosheet.get("missing_fields", [])

    # 3. Test TMS DTO mapping
    dto = map_to_tms_dto(infosheet)
    assert dto.get("sdPercentage") is None


def test_sd_extracted_when_explicitly_mandated():
    """
    Case 2: Document contains an explicit mandate requiring Security Deposit with a percentage.
    Must correctly extract sd_required=True and the percentage.
    """
    explicit_sd_text = (
        "SECTION IV: SPECIAL CONDITIONS OF CONTRACT\n"
        "CLAUSE 15: SECURITY DEPOSIT\n"
        "The successful bidder shall furnish Security Deposit of 5% of contract value within 30 days.\n"
    )

    atc = resolve_atc_anchor_fields(explicit_sd_text)
    assert atc.get("sd_required") is True
    assert atc.get("sd_percentage") == 5.0

    page_texts = [{"page": 1, "text": explicit_sd_text}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("sd_required_display") == "Yes"
    dto = map_to_tms_dto(infosheet)
    assert dto.get("sdPercentage") == 5.0


def test_sd_not_applicable_when_explicitly_stated():
    """
    Case 3: Document explicitly specifies that Security Deposit is NOT APPLICABLE.
    Must set sd_required=False and mark SD fields as Not Applicable, not missing.
    """
    text_na = (
        "SECTION III: BID DATA SHEET (BDS)\n"
        "Contract Performance Security / Security Deposit: NOT APPLICABLE\n"
        "Tender Fee: Nil\n"
    )

    atc = resolve_atc_anchor_fields(text_na)
    assert atc.get("sd_required") is False
    assert atc.get("sd_percentage") is None

    page_texts = [{"page": 1, "text": text_na}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("sd_required_display") == "No"
    assert infosheet.get("sd_percentage_display") == "Not Applicable"
    assert "sd_percentage_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("sdPercentage") is None


def test_sd_decoupled_from_pbg():
    """
    Case 4: Document specifies ePBG Required: No, but does not mention Security Deposit.
    SD must NOT be automatically assumed as 'No' / 'Not Applicable' merely because PBG is 'No'.
    It must report as missing.
    """
    text_pbg_no = (
        "BID DETAILS\n"
        "ePBG Detail: Required: No\n"
        "Bid Splitting: Not Applied\n"
    )

    page_texts = [{"page": 1, "text": text_pbg_no}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("pbg_required_display") == "No"
    assert infosheet.get("pbg_percentage_display") == "Not Applicable"
    # SD must be independent:
    assert infosheet.get("sd_percentage_display") == "⚠️ MISSING"
    assert "sd_percentage_display" in infosheet.get("missing_fields", [])
