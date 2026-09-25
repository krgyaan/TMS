import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


def test_physical_docs_genuinely_missing_not_defaulted_to_no():
    """
    Case 1: Tender mentions nothing about physical documents or submission modes.
    Must NOT fabricate a default of 'No' or 'N/A'.
    Must report '⚠️ MISSING' for both required and deadline, and appear in missing_fields.
    """
    text_unmentioned = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Tender for Supply of Mechanical Bearings.\n"
        "Bidders shall register and submit technical bids before the due date.\n"
    )

    page_texts = [{"page": 1, "text": text_unmentioned}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("physical_docs_required_display") == "⚠️ MISSING"
    assert infosheet.get("physical_docs_deadline_display") == "⚠️ MISSING"
    assert "physical_docs_required_display" in infosheet.get("missing_fields", [])
    assert "physical_docs_deadline_display" in infosheet.get("missing_fields", [])


def test_physical_docs_explicit_mandate_with_deadline():
    """
    Case 2: Tender explicitly mandates original physical document submission with a 10-day deadline.
    Must extract required='Yes' and deadline='Within 10 days of Bid Due Date'.
    """
    text_mandate = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Bids submitted on e-Portal shall also be submitted in Original (in physical form) "
        "within 10 (ten) days from the bid due date at GAIL office.\n"
    )

    page_texts = [{"page": 1, "text": text_mandate}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("physical_docs_required_display") == "Yes"
    assert infosheet.get("physical_docs_deadline_display") == "Within 10 days of Bid Due Date"
    assert "physical_docs_required_display" not in infosheet.get("missing_fields", [])
    assert "physical_docs_deadline_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("physicalDocsRequired") == "YES"


def test_physical_docs_explicit_mandate_missing_deadline_not_fabricated():
    """
    Case 3: Tender mandates physical submission, but omits the deadline timeline.
    Must NOT fabricate 'Within 7 days of Bid Due Date'.
    Deadline must report '⚠️ MISSING' and appear in missing_fields.
    """
    text_missing_deadline = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Bidders must submit original physical EMD instrument and power of attorney to the tender inviting authority.\n"
    )

    page_texts = [{"page": 1, "text": text_missing_deadline}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("physical_docs_required_display") == "Yes"
    assert infosheet.get("physical_docs_deadline_display") == "⚠️ MISSING"
    assert "physical_docs_required_display" not in infosheet.get("missing_fields", [])
    assert "physical_docs_deadline_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("physicalDocsRequired") == "YES"
    assert dto.get("physicalDocsDeadline") is None


def test_physical_docs_explicitly_not_required_case_d():
    """
    Case 4: Tender explicitly states that physical submission is not required / online only (Case D).
    Must report required='No', deadline='Not Applicable', and NOT appear in missing_fields.
    """
    text_exempt = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Submission of hard copies of documents is dispensed with. Entire bidding is online only, "
        "and physical submission of documents is not required.\n"
    )

    page_texts = [{"page": 1, "text": text_exempt}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("physical_docs_required_display") == "No"
    assert infosheet.get("physical_docs_deadline_display") == "Not Applicable"
    assert "physical_docs_required_display" not in infosheet.get("missing_fields", [])
    assert "physical_docs_deadline_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("physicalDocsRequired") == "NO"
    assert dto.get("physicalDocsDeadline") is None


def test_physical_docs_gem_disclaimer_not_mistaken_for_mandate():
    """
    Case 5: GeM boilerplate containing 'Mandating submission of documents in physical form as a pre-requisite'
    is a buyer prohibition disclaimer, NOT a mandate. It must not trigger required='Yes'.
    """
    text_gem_disclaimer = (
        "Buyer Added Bid Specific ATC / Terms:\n"
        "Clauses on the basis of which bid may be treated as Null & Void:\n"
        "6. Mandating submission of documents in physical form as a pre-requisite to qualify bidders.\n"
    )

    page_texts = [{"page": 1, "text": text_gem_disclaimer}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("physical_docs_required_display") != "Yes"
