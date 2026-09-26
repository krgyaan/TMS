import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


def test_delivery_time_pure_supply_not_inherited_from_supply():
    """
    Case 1: Pure-supply tender with supply delivery time specified.
    Must NOT inherit supply delivery time for installation.
    Installation delivery time must be 'Not Applicable' (Case D), not '⚠️ MISSING',
    and map to None in TMS DTO.
    """
    text_pure_supply = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Tender for Supply of Seamless Carbon Steel Pipes.\n\n"
        "SECTION III: DELIVERY SCHEDULE\n"
        "Delivery Period for supply of all materials shall be 60 Days from the date of PO/LOA.\n"
    )

    page_texts = [{"page": 1, "text": text_pure_supply}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("delivery_time_supply_display") == "60 Days"
    assert infosheet.get("delivery_time_installation_display") == "Not Applicable"
    assert infosheet.get("installation_inclusive_display") == "No"
    assert "delivery_time_installation_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("deliveryTimeSupply") == 60
    assert dto.get("deliveryTimeInstallationDays") is None
    assert dto.get("deliveryTimeInstallationInclusive") is False


def test_delivery_time_separately_stated_installation():
    """
    Case 2: Tender with separately-stated supply and installation delivery timelines.
    Both must be extracted accurately and distinctly.
    """
    text_separate = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Tender for Supply and Installation of Server Racks.\n\n"
        "SECTION III: DELIVERY SCHEDULE\n"
        "Supply Delivery Period: 90 Days from date of LOA.\n"
        "Installation Period: within 30 days of installation completion.\n"
    )

    page_texts = [{"page": 1, "text": text_separate}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("delivery_time_supply_display") == "90 Days"
    assert infosheet.get("delivery_time_installation_display") == "30 Days"
    assert infosheet.get("installation_inclusive_display") == "No"
    assert "delivery_time_installation_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("deliveryTimeSupply") == 90
    assert dto.get("deliveryTimeInstallationDays") == 30
    assert dto.get("deliveryTimeInstallationInclusive") is False


def test_delivery_time_sitc_inclusive_installation():
    """
    Case 3: SITC scope tender where installation is inclusive.
    Installation delivery time must be 'Inclusive (SITC Scope)' and inclusive flag 'Yes'.
    """
    text_sitc = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Scope of Work: Supply, Installation, Testing and Commissioning (SITC) of High Voltage Switchgear.\n\n"
        "SECTION III: DELIVERY SCHEDULE\n"
        "Total Delivery Period: 120 Days from LOA.\n"
    )

    page_texts = [{"page": 1, "text": text_sitc}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("delivery_time_supply_display") == "120 Days"
    assert infosheet.get("delivery_time_installation_display") == "Inclusive (SITC Scope)"
    assert infosheet.get("installation_inclusive_display") == "Yes"
    assert "delivery_time_installation_display" not in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("deliveryTimeSupply") == 120
    assert dto.get("deliveryTimeInstallationDays") is None
    assert dto.get("deliveryTimeInstallationInclusive") is True


def test_delivery_time_installation_in_scope_but_timeline_omitted():
    """
    Case 4: Tender has installation in scope, but no delivery timeline for installation is given.
    Must NOT inherit supply delivery time.
    Must report '⚠️ MISSING' and appear in missing_fields.
    """
    text_missing_install = (
        "SECTION I: INVITATION FOR BIDS\n"
        "Tender for Supply and Installation of Flow Meters.\n"
        "Scope: Installation shall be in the scope of vendor at site.\n\n"
        "SECTION III: DELIVERY SCHEDULE\n"
        "Delivery Period for supply: 45 Days from PO.\n"
    )

    page_texts = [{"page": 1, "text": text_missing_install}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    assert infosheet.get("delivery_time_supply_display") == "45 Days"
    assert infosheet.get("delivery_time_installation_display") == "⚠️ MISSING"
    assert infosheet.get("installation_inclusive_display") == "No"
    assert "delivery_time_installation_display" in infosheet.get("missing_fields", [])

    dto = map_to_tms_dto(infosheet)
    assert dto.get("deliveryTimeSupply") == 45
    assert dto.get("deliveryTimeInstallationDays") is None
    assert dto.get("deliveryTimeInstallationInclusive") is False


def test_schedule_delivery_days_no_hardcoded_90_default():
    """
    Case 5: Schedule evaluation table without specified delivery days.
    Must NOT fabricate a default of '90 days' for the schedule items.
    """
    text_schedules = (
        "Evaluation Schedules\n"
        "Schedule 1\n"
        "Centrifugal Pump Assembly\n"
        "5\n"
        "Schedule 2\n"
        "Spare Impeller Kit\n"
        "10\n"
    )

    page_texts = [{"page": 1, "text": text_schedules}]
    infosheet = build_infosheet_data([], page_texts=page_texts)

    sch1 = infosheet.get("schedule_1_details_display")
    assert "90 days" not in sch1
    assert "Delivery: NA" in sch1
