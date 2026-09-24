import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


def test_pbg_mode_missing_when_instruments_only_in_emd_or_boilerplate():
    """
    Case 1: Ground truth document mentions payment instruments (Surety Bond, Demand Draft,
    NEFT/RTGS) in EMD or general boilerplate, but does NOT contain a PBG clause specifying modes.
    Must return missing / None, NOT aggregate instruments from the rest of the document.
    """
    text_boilerplate_only = (
        "GAIL (INDIA) LIMITED - TENDER DOCUMENT\n"
        "SECTION I: INVITATION FOR BIDS\n"
        "Earnest Money Deposit (EMD) shall be accepted in the form of Demand Draft or "
        "Insurance Surety Bond or online transfer through NEFT/RTGS.\n\n"
        "SECTION II: GENERAL CONDITIONS\n"
        "Payments to contractor will be made via online banking.\n"
        "Tender fee: Nil.\n"
    )

    page_texts = [{"page": 1, "text": text_boilerplate_only}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("pbg_mode_display") == "⚠️ MISSING"
    assert "pbg_mode_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("pbgMode") is None


def test_pbg_mode_extracted_when_explicit_pbg_clause_present():
    """
    Case 2: Ground truth document contains an explicit PBG clause specifying
    allowed instruments (Bank Guarantee, Demand Draft, FDR).
    Must extract only the instruments explicitly permitted in that clause.
    """
    text_with_pbg_clause = (
        "SECTION IV: SPECIAL CONDITIONS OF CONTRACT\n"
        "CLAUSE 20: PERFORMANCE BANK GUARANTEE\n"
        "The successful bidder shall submit Performance Bank Guarantee (PBG) within 30 days.\n"
        "The PBG may be submitted in the form of Bank Guarantee or Demand Draft or Fixed Deposit Receipt (FDR).\n"
        "SECTION V: TECHNICAL SPECIFICATIONS\n"
    )

    page_texts = [{"page": 1, "text": text_with_pbg_clause}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    pbg_mode = infosheet.get("pbg_mode_display")
    assert "DD" in pbg_mode
    assert "FDR" in pbg_mode
    assert "Bank Guarantee" in pbg_mode
    assert "Insurance Surety Bond" not in pbg_mode
    assert "pbg_mode_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("pbgMode") is not None
    assert set(dto.get("pbgMode")) == {"DD", "FDR", "Bank Guarantee"}


def test_pbg_mode_missing_when_pbg_clause_exists_but_omits_modes():
    """
    Case 3: Document has a PBG clause stating percentage and duration,
    but does NOT specify any allowed mode/instrument. Even if other sections
    mention DD or NEFT, PBG mode must not be fabricated from whole-document sweep.
    """
    text_pbg_without_mode = (
        "SECTION I: INVITATION FOR BIDS\n"
        "EMD shall be submitted by Demand Draft.\n\n"
        "SECTION III: CONTRACT PERFORMANCE SECURITY\n"
        "The contractor shall provide Contract Performance Security of 3% of contract value "
        "valid up to 90 days beyond the completion date.\n"
        "SECTION IV: SCOPE OF WORK\n"
    )

    page_texts = [{"page": 1, "text": text_pbg_without_mode}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("pbg_mode_display") == "⚠️ MISSING"
    assert "pbg_mode_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("pbgMode") is None
