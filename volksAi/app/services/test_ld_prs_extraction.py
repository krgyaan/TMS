import pytest
from app.services.tender_mapper import build_infosheet_data, resolve_atc_anchor_fields
from app.services.tms_field_mapper import map_to_tms_dto


def test_ld_prs_missing_when_no_percentage_clause():
    """
    Case 1: Ground truth document mentions 'PRS' or 'Price Reduction Schedule'
    in a table of contents or clause header, but does NOT contain any weekly rate
    or maximum penalty percentage. Must return missing / None, NOT 0.5% or 10%/5%.
    """
    text_without_percentages = (
        "GAIL (INDIA) LIMITED\n"
        "TABLE OF CONTENTS\n"
        "(f) Delivery Schedule\n"
        "(g) Price Reduction Schedule (PRS)\n"
        "(h) Contract Performance Security / Security Deposit\n\n"
        "1.0 SCOPE OF WORK\n"
        "The contractor shall supply batteries to Vadodara site within 90 days.\n"
    )
    
    # 1. Test ATC resolver
    atc_res = resolve_atc_anchor_fields(text_without_percentages)
    assert "ld_percentage_per_week" not in atc_res
    assert "max_ld_percentage" not in atc_res
    
    # 2. Test build_infosheet_data
    page_texts = [{"page": 1, "text": text_without_percentages}]
    infosheet = build_infosheet_data([], page_texts=page_texts)
    
    assert infosheet.get("ld_percentage_display") == "⚠️ MISSING"
    assert infosheet.get("max_ld_percentage_display") == "⚠️ MISSING"
    assert "ld_percentage_display" in infosheet.get("missing_fields", [])
    assert "max_ld_percentage_display" in infosheet.get("missing_fields", [])
    
    # 3. Test TMS DTO mapping
    dto = map_to_tms_dto(infosheet)
    assert dto.get("ldPercentagePerWeek") is None
    assert dto.get("maxLdPercentage") is None


def test_ld_prs_extracted_when_explicit_clause_present():
    """
    Case 2: Ground truth document contains an explicit PRS clause with
    weekly percentage rate and ceiling cap. Must correctly extract real values.
    """
    text_with_prs = (
        "PRICE REDUCTION SCHEDULE (PRS) FOR DELAYED DELIVERY\n"
        "In case of delay in delivery of materials, price reduction at the rate of "
        "0.5% per week of delay or part thereof subject to maximum "
        "of 10% of total order value will be applicable.\n"
    )
    
    # 1. Test ATC resolver
    atc_res = resolve_atc_anchor_fields(text_with_prs)
    assert atc_res.get("ld_percentage_per_week") == 0.5
    assert atc_res.get("max_ld_percentage") == 10.0
    
    # 2. Test build_infosheet_data
    page_texts = [{"page": 1, "text": text_with_prs}]
    infosheet = build_infosheet_data([], page_texts=page_texts)
    
    assert infosheet.get("ld_percentage_display") == "0.5% per week"
    assert infosheet.get("max_ld_percentage_display") == "10%"
    assert "ld_percentage_display" not in infosheet.get("missing_fields", [])
    assert "max_ld_percentage_display" not in infosheet.get("missing_fields", [])
    
    # 3. Test TMS DTO mapping
    dto = map_to_tms_dto(infosheet)
    assert dto.get("ldPercentagePerWeek") == 0.5
    assert dto.get("maxLdPercentage") == 10.0
