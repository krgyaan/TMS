import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


# ─────────────────────────────────────────────────────────────────────────────
# 1. Pre-Bid Meeting Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_pre_bid_meeting_extraction_with_teams_details():
    """Tender with explicit Pre-Bid meeting date, time, and MS Teams credentials."""
    text = (
        "SECTION I: INVITATION FOR BIDS\n"
        "PRE-BID MEETING:\n"
        "Pre-Bid Conference shall be held on 15.10.2026 at 11:00 HRS through video conferencing.\n"
        "Microsoft Teams meeting:\n"
        "Meeting ID: 293 847 102 991\n"
        "Passcode: xyZ123\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    pre_bid = infosheet.get("pre_bid_meeting_display")
    assert pre_bid is not None
    assert "15.10.2026 11:00 HRS" in pre_bid
    assert "MS Teams" in pre_bid
    assert "293 847 102 991" in pre_bid
    assert "xyZ123" in pre_bid

    dto = map_to_tms_dto(infosheet)
    assert dto.get("preBidMeeting") == pre_bid


def test_pre_bid_meeting_none_specified():
    """Tender with no pre-bid meeting mentioned."""
    text = "SECTION I: INVITATION FOR BIDS\nSupply of Valves and Actuators.\n"
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert infosheet.get("pre_bid_meeting_display") in ("N/A", "NA", None)

    dto = map_to_tms_dto(infosheet)
    assert dto.get("preBidMeeting") is None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Site Visit / Survey Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_site_visit_mandatory_with_certificate():
    """Tender mandating site inspection and site visit certificate prior to bidding."""
    text = (
        "SPECIAL CONDITIONS OF CONTRACT (SCC)\n"
        "Clause 14.0 Site Visit: Mandatory site visit is required prior to bidding. "
        "Bidders must visit site and obtain certificate from the Engineer-in-Charge before 10-10-2026. "
        "Bids submitted without Site Visit Certificate shall be rejected.\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    sv = infosheet.get("site_visit_display")
    assert sv is not None
    assert "Yes (Mandatory site inspection and certificate required" in sv
    assert "10-10-2026" in sv

    dto = map_to_tms_dto(infosheet)
    assert dto.get("siteVisit") == sv
    assert dto.get("siteVisitRequired") == "YES"


def test_site_visit_deemed_acknowledgment():
    """Tender with deemed site visit clause (no mandatory physical inspection scheduled)."""
    text = (
        "SECTION V: GENERAL CONDITIONS\n"
        "The bidder shall be deemed to have visited the site and satisfied himself as to local conditions.\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    sv = infosheet.get("site_visit_display")
    assert sv is not None
    assert "No / Self-Certification" in sv

    dto = map_to_tms_dto(infosheet)
    assert dto.get("siteVisit") == sv
    assert dto.get("siteVisitRequired") == "NO"


def test_site_visit_explicitly_not_required():
    """Tender where site visit is explicitly declared not required."""
    text = (
        "Clause 5: Site Visit is not required for this procurement of off-the-shelf catalog items.\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert infosheet.get("site_visit_display") == "No"

    dto = map_to_tms_dto(infosheet)
    assert dto.get("siteVisit") == "No"
    assert dto.get("siteVisitRequired") == "NO"


def test_site_visit_unmentioned():
    """Tender with no mention of site visit."""
    text = "SECTION I: INVITATION FOR BIDS\nProcurement of Stationery Supplies.\n"
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert infosheet.get("site_visit_display") == "Not specified"

    dto = map_to_tms_dto(infosheet)
    assert dto.get("siteVisit") is None
    assert dto.get("siteVisitRequired") is None


# ─────────────────────────────────────────────────────────────────────────────
# 3. Sample Submission / Testing Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_sample_submission_mandatory_with_quantity_and_deadline():
    """Tender mandating submission of physical samples with quantity and deadline."""
    text = (
        "TECHNICAL EVALUATION CRITERIA\n"
        "Submission of samples is mandatory. The bidder shall submit 2 nos of sample "
        "within 7 days from bid opening date to GAIL Quality Inspection Cell. "
        "Testing charges shall be borne by bidder at NABL accredited lab.\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    sample = infosheet.get("sample_submission_display")
    assert sample is not None
    assert sample.startswith("Yes")
    assert "2 nos" in sample
    assert "within 7 days" in sample
    assert "NABL" in sample

    dto = map_to_tms_dto(infosheet)
    assert dto.get("sampleSubmission") == sample
    assert dto.get("sampleSubmissionRequired") == "YES"


def test_sample_submission_explicitly_not_required():
    """Tender with explicit Sample Required: No."""
    text = (
        "SECTION II: BID DATA SHEET\n"
        "Sample Required: No\n"
        "Inspection: Factory Inspection by Buyer\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert infosheet.get("sample_submission_display") == "No"

    dto = map_to_tms_dto(infosheet)
    assert dto.get("sampleSubmission") == "No"
    assert dto.get("sampleSubmissionRequired") == "NO"


def test_sample_submission_unmentioned():
    """Tender with no mention of sample submission or testing."""
    text = "SECTION I: INVITATION FOR BIDS\nTender for IT Consultancy Services.\n"
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    assert infosheet.get("sample_submission_display") == "Not specified"

    dto = map_to_tms_dto(infosheet)
    assert dto.get("sampleSubmission") is None
    assert dto.get("sampleSubmissionRequired") is None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Make in India (MII) Unblocking & TMS DTO Mapping Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_mii_preference_unblocked_in_dto():
    """MII preference with price band and quantity reaches the TMS DTO."""
    text = (
        "MII Purchase Preference: Yes\n"
        "Purchase Preference to Class 1 Local Suppliers available upto price within L1+20%\n"
        "Percentage of Bid quantity/amount for Class 1 Local Suppliers Purchase preference: 50%\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    mii_disp = infosheet.get("mii_preference_display")
    assert mii_disp is not None
    assert "Yes" in mii_disp
    assert "L1+20%" in mii_disp
    assert "50%" in mii_disp

    dto = map_to_tms_dto(infosheet)
    assert dto.get("miiPreference") == mii_disp
    assert dto.get("miiRequired") == "YES"


def test_mii_preference_negative_in_dto():
    """MII preference declared as No with reason reaches TMS DTO."""
    text = (
        "MII Purchase Preference: No\n"
        "MII Non-Applicability Reason: Non-divisible specialized proprietary items\n"
    )
    infosheet = build_infosheet_data([], page_texts=[{"page": 1, "text": text}])
    mii_disp = infosheet.get("mii_preference_display")
    assert mii_disp is not None
    assert "No" in mii_disp

    dto = map_to_tms_dto(infosheet)
    assert dto.get("miiPreference") == mii_disp
    assert dto.get("miiRequired") == "NO"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Seller Required Documents (doc_1..doc_9) Unblocking Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_seller_required_documents_aggregated_in_dto():
    """Seller required documents doc_1..doc_9 are collected into requiredDocuments list."""
    raw_data = {
        "doc_1_display": "PAN and GST Registration Certificate",
        "doc_2_display": "MSME / Udyam Registration Certificate",
        "doc_3_display": "Experience Criteria Past Performance Orders",
        "doc_4_display": "NA",
        "doc_5_display": None,
    }
    dto = map_to_tms_dto(raw_data)
    assert dto.get("requiredDocuments") == [
        "PAN and GST Registration Certificate",
        "MSME / Udyam Registration Certificate",
        "Experience Criteria Past Performance Orders",
    ]
    assert dto.get("doc1") == "PAN and GST Registration Certificate"
    assert dto.get("doc2") == "MSME / Udyam Registration Certificate"
    assert dto.get("doc3") == "Experience Criteria Past Performance Orders"
    assert dto.get("doc4") is None
    assert dto.get("doc5") is None


def test_extract_api_field_object_formatting_for_new_fields():
    """Verify that extract.py's TMS_TO_SOURCE_KEY_MAP correctly formats field objects for new fields."""
    from app.routers.extract import TMS_TO_SOURCE_KEY_MAP, _format_field_object

    # Check key mappings exist
    assert TMS_TO_SOURCE_KEY_MAP["preBidMeeting"] == "pre_bid_meeting_display"
    assert TMS_TO_SOURCE_KEY_MAP["siteVisit"] == "site_visit_display"
    assert TMS_TO_SOURCE_KEY_MAP["siteVisitRequired"] == "site_visit_display"
    assert TMS_TO_SOURCE_KEY_MAP["sampleSubmission"] == "sample_submission_display"
    assert TMS_TO_SOURCE_KEY_MAP["sampleSubmissionRequired"] == "sample_submission_display"
    assert TMS_TO_SOURCE_KEY_MAP["miiPreference"] == "mii_preference_display"
    assert TMS_TO_SOURCE_KEY_MAP["miiRequired"] == "mii_preference_display"
    assert TMS_TO_SOURCE_KEY_MAP["requiredDocuments"] == "doc_1_display"

    from app.services.tender_mapper import FIELD_STATUS_NOT_APPLICABLE

    field_statuses = {
        "site_visit_display": "ok",
        "sample_submission_display": FIELD_STATUS_NOT_APPLICABLE,
    }
    field_sources = {
        "site_visit_display": "regex",
    }

    # Format siteVisit
    obj_sv = _format_field_object(
        tms_key="siteVisit",
        dto_value="Yes (Mandatory site inspection)",
        source_field_name="site_visit_display",
        field_statuses=field_statuses,
        field_sources=field_sources,
    )
    assert obj_sv["value"] == "Yes (Mandatory site inspection)"
    assert obj_sv["confidence"] == "high"
    assert obj_sv["source"] == "regex"

    # Format sampleSubmission when not applicable
    obj_sample = _format_field_object(
        tms_key="sampleSubmission",
        dto_value=None,
        source_field_name="sample_submission_display",
        field_statuses=field_statuses,
        field_sources=field_sources,
    )
    assert obj_sample["value"] is None
    assert obj_sample["confidence"] == "not_applicable"

