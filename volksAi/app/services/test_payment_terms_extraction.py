import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto
import app.services.llm_field_resolver as resolver


def test_payment_terms_pure_supply_tender_installation_not_applicable():
    """
    Case 1: Pure-supply tender with 100% payment on supply and no installation scope.
    Installation payment terms must be 'Not Applicable' (Case D), not '⚠️ MISSING',
    and map to None in TMS DTO without any fabricated percentage.
    """
    text_pure_supply = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Tender for Supply of Seamless Steel Pipes to GAIL Vijaipur.\n\n"
        "SECTION IV: TERMS OF PAYMENT\n"
        "100% payment shall be released against receipt and acceptance of materials at site.\n"
    )

    page_texts = [{"page": 1, "text": text_pure_supply}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("payment_terms_supply_display") == "100%"
    assert infosheet.get("payment_terms_installation_display") == "Not Applicable"
    assert "payment_terms_installation_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("paymentTermsSupply") == 100
    assert dto.get("paymentTermsInstallation") is None


def test_payment_terms_split_tender_extracts_both():
    """
    Case 2: Genuine supply + installation split tender.
    Must extract both supply and installation percentages correctly.
    """
    text_split = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Scope of Work: Supply, installation and commissioning of UPS systems.\n\n"
        "SECTION IV: TERMS OF PAYMENT\n"
        "(a) 70% payment shall be released against supply of materials at site.\n"
        "(b) 30% payment shall be released after successful installation and commissioning.\n"
    )

    page_texts = [{"page": 1, "text": text_split}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("payment_terms_supply_display") == "70%"
    assert infosheet.get("payment_terms_installation_display") == "30%"
    assert "payment_terms_supply_display" not in infosheet.get("missing_fields", [])
    assert "payment_terms_installation_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("paymentTermsSupply") == 70
    assert dto.get("paymentTermsInstallation") == 30


def test_payment_terms_split_tender_missing_installation_not_fabricated():
    """
    Case 3: Tender has installation scope, but payment terms only specify supply
    milestone (e.g. 80%), leaving installation unspecified.
    Must return '⚠️ MISSING' instead of fabricating 20% to sum to 100%.
    """
    text_split_missing_inst = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Scope of Work: Supply, installation and commissioning of Gas Compressors.\n\n"
        "SECTION IV: TERMS OF PAYMENT\n"
        "80% payment shall be released against supply and delivery of materials at site.\n"
    )

    page_texts = [{"page": 1, "text": text_split_missing_inst}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("payment_terms_supply_display") == "80%"
    assert infosheet.get("payment_terms_installation_display") == "⚠️ MISSING"
    assert "payment_terms_installation_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("paymentTermsSupply") == 80
    assert dto.get("paymentTermsInstallation") is None


def test_llm_prompt_removes_sum_to_100_bias():
    """
    Case 4: Verifies that the LLM system prompt bias forcing supply and
    installation to sum close to 100% has been removed from llm_field_resolver.py.
    """
    with open(resolver.__file__, "r", encoding="utf-8") as f:
        content = f.read()

    # The prompt must NOT push the model to invent numbers to sum to 100
    assert "These two must sum close to 100" not in content
    assert "re-read the clause rather than reporting an inconsistent pair" not in content

    # The prompt MUST explicitly instruct that pure-supply tenders have installation = null / Not Applicable
    assert "Pure-supply tenders genuinely have no installation component" in content
    assert "NEVER invent, infer, or hallucinate an installation percentage" in content
