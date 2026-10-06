import pytest
from app.services.tender_mapper import build_infosheet_data
from app.services.tms_field_mapper import map_to_tms_dto


@pytest.fixture(autouse=True)
def _ensure_llm_fallback_enabled(monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    yield
    monkeypatch.undo()


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


def test_llm_delivery_time_ambiguity_rule_prompt_text():
    """
    FIX 1: Verify the rewritten Role 2 delivery time ambiguity prompt rules in llm_field_resolver.py.
    The prompt must NEVER instruct the model to attach qualifying prose to numbers,
    and must instruct to return null if no distinct figure is literally stated.
    """
    from app.services import llm_field_resolver as resolver
    with open(resolver.__file__, "r", encoding="utf-8") as f:
        content = f.read()

    # Old buggy qualification prose instructions must be completely removed
    assert "DO NOT collapse the value to a bare 'Not Specified' or null" not in content
    assert "return the total period accompanied by a clear qualification" not in content
    assert "total completion) — no distinct supply-only figure found in scoped clauses" not in content
    assert "total completion) — installation included in total period" not in content

    # New prompt rule must be present
    assert "If no distinct supply-only or installation-only figure is literally stated" in content
    assert "choose action='override' with resolved_value=null for that field" in content
    assert "Only return 'Inclusive (SITC Scope)' for delivery_time_installation_display when the document" in content
    assert "explicitly states installation is included in the supply period" in content
    assert "NEVER return a number with attached qualifying prose" in content


def test_role2_delivery_time_overall_completion_period_yields_no_installation():
    """
    FIX 1: A scoped clause with only an overall completion period must NOT
    yield an installation delivery value.
    """
    from unittest.mock import MagicMock
    from app.services.llm_field_resolver import LLMFieldResolver

    mock_block = MagicMock()
    mock_block.type = "tool_use"
    mock_block.name = "resolve_ambiguous_fields"
    # Claude decides to override to null because only an overall completion period exists
    mock_block.input = {
        "decisions": [
            {
                "field_name": "delivery_time_installation_display",
                "action": "override",
                "resolved_value": None,
                "reasoning": "Only overall contract completion period stated; no distinct installation timeline."
            }
        ]
    }
    mock_response = MagicMock()
    mock_response.content = [mock_block]
    mock_response.usage.input_tokens = 150
    mock_response.usage.output_tokens = 40

    resolver = LLMFieldResolver(api_key="test-key")
    resolver.client.messages.create = MagicMock(return_value=mock_response)

    candidates = {
        "delivery_time_installation_display": "180 Days",
    }
    scoped_text = "Overall completion period: 180 Days from LOA."
    res = resolver.resolve_ambiguous_fields(scoped_text, candidates)

    inst_res = res.get("delivery_time_installation_display", {})
    assert inst_res.get("action") == "override"
    assert inst_res.get("resolved_value") is None
    # Confirm no attached qualifying prose masquerades as an extracted value
    assert "total completion" not in str(inst_res.get("resolved_value"))

    # When mapped to TMS DTO, installation days must be None
    dto = map_to_tms_dto({"delivery_time_installation_display": inst_res.get("resolved_value")})
    assert dto.get("deliveryTimeInstallationDays") is None
    assert dto.get("deliveryTimeInstallationInclusive") is False


def test_role2_delivery_time_separately_stated_installation_extracted():
    """
    FIX 1: A scoped clause with a separately stated installation period
    must extract the distinct installation value.
    """
    from unittest.mock import MagicMock
    from app.services.llm_field_resolver import LLMFieldResolver

    mock_block = MagicMock()
    mock_block.type = "tool_use"
    mock_block.name = "resolve_ambiguous_fields"
    mock_block.input = {
        "decisions": [
            {
                "field_name": "delivery_time_installation_display",
                "action": "override",
                "resolved_value": "45 Days",
                "reasoning": "Separately stated installation period of 45 days isolated."
            }
        ]
    }
    mock_response = MagicMock()
    mock_response.content = [mock_block]
    mock_response.usage.input_tokens = 150
    mock_response.usage.output_tokens = 40

    resolver = LLMFieldResolver(api_key="test-key")
    resolver.client.messages.create = MagicMock(return_value=mock_response)

    candidates = {
        "delivery_time_installation_display": "90 Days",
    }
    scoped_text = "Supply period: 90 Days. Installation period: 45 Days."
    res = resolver.resolve_ambiguous_fields(scoped_text, candidates)

    inst_res = res.get("delivery_time_installation_display", {})
    assert inst_res.get("resolved_value") == "45 Days"

    dto = map_to_tms_dto({"delivery_time_installation_display": inst_res.get("resolved_value")})
    assert dto.get("deliveryTimeInstallationDays") == 45
    assert dto.get("deliveryTimeInstallationInclusive") is False

