"""
Unit tests for TMS Field Mapper (map_to_tms_dto)
Tests pure conversion from Python-native infosheet extraction fields
into TMS DTO-compliant output matching TMS Zod schemas.
"""

import pytest

from app.services.tms_field_mapper import map_to_tms_dto


def test_map_to_tms_dto_clean_full_value():
    """
    Test Case 1: Clean, full-value input where all fields are populated
    with standard extracted values. Verifies all DTO keys and data types.
    """
    raw_input = {
        "processing_fee_amount_display": "₹ 1,500.00",
        "processing_fee_mode_display": "Online Transfer / DD",
        "tender_fee_amount_display": "₹ 5,000.00",
        "tender_fee_mode_display": "Demand Draft / Bank Guarantee",
        "emd_amount_display": "₹ 1,14,163.00",
        "emd_required_display": "Yes",
        "emd_mode_display": "BT/DD/SB/FDR/BG",
        "tender_value_display": "₹ 57,08,150.00",
        "bid_validity_days_display": "90 Days",
        "commercial_evaluation_display": "Overall GST Inclusive",
        "reverse_auction_applicable_display": "Yes",
        "maf_required_display": "Yes - Project Specific",
        "delivery_time_supply_display": "90 Days",
        "delivery_time_installation_display": "180 Days",
        "installation_inclusive_display": "No",
        "payment_terms_supply_display": "70%",
        "payment_terms_installation_display": "30%",
        "pbg_required_display": "Yes",
        "pbg_mode_display": "Bank Guarantee / Insurance Surety Bond",
        "pbg_percentage_display": "5%",
        "pbg_duration_display": "33 Months",
        "sd_mode_display": "Bank Guarantee / DD",
        "sd_percentage_display": "10%",
        "sd_duration_display": "12 Months",
        "ld_percentage_display": "0.5% per week",
        "max_ld_percentage_display": "5.0%",
        "physical_docs_required_display": "Yes",
        "physical_docs_deadline_display": "Within 7 days of Bid Due Date",
        "bid_due_date_time": "10-08-2026 14:00:00",
        "order_value_1_display": "₹ 32,00,000.00",
        "order_value_2_display": "₹ 20,00,000.00",
        "order_value_3_display": "₹ 10,00,000.00",
        "avg_annual_turnover_type_display": "Amount",
        "avg_annual_turnover_value_display": "₹ 61,00,000.00",
        "working_capital_type_display": "Amount",
        "working_capital_value_display": "₹ 12,00,000.00",
        "net_worth_type_display": "Positive",
        "net_worth_value_display": "₹ 5,00,000.00",
        "solvency_certificate_type_display": "Amount",
        "solvency_certificate_value_display": "₹ 50,00,000.00",
        "custom_eligibility_criteria_display": "Bidder should have supplied SITC of battery chargers.",
        "experience_years_display": "7 Years",
        "po_selected_documents_display": "PO_101, PO_102, PO_103",
        "commercial_eligibility_documents_display": "GST_Cert, PAN_Card, Audited_BS",
        "client_name_1_display": "Sh. Ramesh Kumar",
        "client_email_1_display": "ramesh.kumar@gail.co.in",
        "client_phone_1_display": "+91 9876543210",
        "client_name_2_display": "Sh. Suresh Patel",
        "client_email_2_display": "suresh.patel@gail.co.in",
        "client_phone_2_display": "011-26182955",
        "courier_address_display": "GAIL India Ltd, Jubilee Tower, Noida Sector-1",
        # Excluded keys that should NOT appear in DTO
        "consignee_address_display": "Site A, Sector 62",
        "doc_1": "doc1.pdf",
        "schedule_1": "sched1",
        "readiness_1": "ready",
    }

    dto = map_to_tms_dto(raw_input)

    # 1. Financial & Fees
    assert dto["processingFeeAmount"] == 1500.0
    assert dto["processingFeeModes"] == ["Online Transfer", "DD"]
    assert dto["tenderFeeAmount"] == 5000.0
    assert dto["tenderFeeModes"] == ["Demand Draft", "Bank Guarantee"]
    assert dto["emdAmount"] == 114163.0
    assert dto["emdRequired"] == "YES"
    assert dto["tenderValue"] == 5708150.0

    # 2. Terms & Evaluation
    assert dto["bidValidityDays"] == 90
    assert dto["commercialEvaluation"] == "OVERALL_GST_INCLUSIVE"
    assert dto["reverseAuctionApplicable"] == "YES"
    assert dto["mafRequired"] == "YES_PROJECT_SPECIFIC"

    # 3. Delivery Time
    assert dto["deliveryTimeSupply"] == 90
    assert dto["deliveryTimeInstallationDays"] == 180
    assert dto["deliveryTimeInstallationInclusive"] is False

    # 4. Payment & Guarantees
    assert dto["paymentTermsSupply"] == 70
    assert dto["paymentTermsInstallation"] == 30
    assert dto["pbgRequired"] == "YES"
    assert dto["pbgPercentage"] == 5.0
    assert dto["pbgDurationMonths"] == 33
    assert dto["sdPercentage"] == 10.0
    assert dto["sdDurationMonths"] == 12
    assert dto["ldPercentagePerWeek"] == 0.5
    assert dto["maxLdPercentage"] == 5.0

    # 5. Physical Docs & Deadline offset
    assert dto["physicalDocsRequired"] == "YES"
    assert dto["physicalDocsDeadline"] == "2026-08-17T14:00:00"

    # 6. BEC Financial
    assert dto["orderValue1"] == 3200000.0
    assert dto["orderValue2"] == 2000000.0
    assert dto["orderValue3"] == 1000000.0
    assert dto["avgAnnualTurnoverType"] == "AMOUNT"
    assert dto["avgAnnualTurnoverValue"] == 6100000.0
    assert dto["workingCapitalType"] == "AMOUNT"
    assert dto["workingCapitalValue"] == 1200000.0
    assert dto["netWorthType"] == "POSITIVE"
    assert dto["netWorthValue"] == 500000.0
    assert dto["solvencyCertificateType"] == "AMOUNT"
    assert dto["solvencyCertificateValue"] == 5000000.0
    assert dto["techEligibilityAge"] == 7
    assert dto["customEligibilityCriteria"] == "Bidder should have supplied SITC of battery chargers."

    # 7. Document Lists
    assert dto["technicalWorkOrders"] == ["PO_101", "PO_102", "PO_103"]
    assert dto["commercialDocuments"] == ["GST_Cert", "PAN_Card", "Audited_BS"]

    # 8. Clients
    assert len(dto["clients"]) == 2
    assert dto["clients"][0] == {
        "clientName": "Sh. Ramesh Kumar",
        "clientEmail": "ramesh.kumar@gail.co.in",
        "clientMobile": "+91 9876543210",
    }
    assert dto["clients"][1] == {
        "clientName": "Sh. Suresh Patel",
        "clientEmail": "suresh.patel@gail.co.in",
        "clientMobile": "011-26182955",
    }

    # 9. Excluded Keys Verification
    assert "consignee_address_display" not in dto
    assert "doc_1" not in dto
    assert "schedule_1" not in dto
    assert "readiness_1" not in dto


def test_map_to_tms_dto_missing_na_fields():
    """
    Test Case 2: Missing, NA, Not Found, and placeholder inputs.
    Verifies graceful fallback to None, empty lists, or appropriate defaults.
    """
    raw_input = {
        "processing_fee_amount_display": "⚠️ MISSING",
        "processing_fee_mode_display": "NA",
        "tender_fee_amount_display": "Not Found",
        "tender_fee_mode_display": "N/A",
        "emd_amount_display": None,
        "emd_required_display": "NA",
        "emd_mode_display": "NA",
        "tender_value_display": "⚠️ MISSING",
        "bid_validity_days_display": "NA",
        "commercial_evaluation_display": "MISSING",
        "reverse_auction_applicable_display": "NA",
        "maf_required_display": "No",
        "delivery_time_supply_display": "NA",
        "delivery_time_installation_display": "N/A",
        "payment_terms_supply_display": "job.",  # unparseable text
        "payment_terms_installation_display": "NA",
        "pbg_required_display": "No",
        "pbg_mode_display": "NA",
        "pbg_percentage_display": "N/A",
        "sd_duration_display": "N/A",
        "physical_docs_required_display": "No",
        "physical_docs_deadline_display": "⚠️ MISSING",
        "avg_annual_turnover_type_display": "Not Applicable",
        "avg_annual_turnover_value_display": "₹0.00",
        "working_capital_type_display": "Not Applicable",
        "working_capital_value_display": "₹0.00",
        "net_worth_type_display": "Not Applicable",
        "net_worth_value_display": "₹0.00",
        "solvency_certificate_type_display": "Not Applicable",
        "solvency_certificate_value_display": "₹0.00",
        "experience_years_display": "etc.",  # unparseable string
        "client_name_1_display": "Only Primary Officer",
        "client_email_1_display": "not-a-valid-email",  # invalid email should become None
        "client_phone_1_display": "NA",
        "client_name_2_display": "NA",  # empty slot should be skipped
        "client_email_2_display": "test@gail.co.in",
        "client_name_3_display": None,
    }

    dto = map_to_tms_dto(raw_input)

    assert dto["processingFeeAmount"] is None
    assert dto["processingFeeModes"] is None
    assert dto["tenderFeeAmount"] is None
    assert dto["tenderFeeModes"] is None
    assert dto["emdAmount"] is None
    assert dto["emdRequired"] is None
    assert dto["emdModes"] is None
    assert dto["tenderValue"] is None
    assert dto["bidValidityDays"] is None
    assert dto["commercialEvaluation"] is None
    assert dto["reverseAuctionApplicable"] == "NO"
    assert dto["mafRequired"] == "NO"
    assert map_to_tms_dto({"maf_required_display": "NA"})["mafRequired"] is None
    assert map_to_tms_dto({})["mafRequired"] is None
    assert dto["deliveryTimeSupply"] is None
    assert dto["paymentTermsSupply"] is None
    assert dto["paymentTermsInstallation"] is None
    assert dto["pbgRequired"] == "NO"
    assert dto["pbgPercentage"] is None
    assert dto["physicalDocsRequired"] == "NO"
    assert dto["physicalDocsDeadline"] is None

    # BEC types for 'Not Applicable'
    assert dto["avgAnnualTurnoverType"] == "NOT_APPLICABLE"
    assert dto["workingCapitalType"] == "NOT_APPLICABLE"
    assert dto["netWorthType"] == "NOT_APPLICABLE"
    assert dto["solvencyCertificateType"] == "NOT_APPLICABLE"
    assert dto["techEligibilityAge"] is None

    # Clients: slot 1 preserved with None email/phone; slots 2 & 3 skipped
    assert len(dto["clients"]) == 1
    assert dto["clients"][0] == {
        "clientName": "Only Primary Officer",
        "clientEmail": None,
        "clientMobile": None,
    }


def test_map_to_tms_dto_currency_with_commas_and_multipliers():
    """
    Test Case 3: Currency strings with symbols (₹, Rs.), commas, and Lakh/Crore multipliers.
    """
    raw_input = {
        "emd_amount_display": "₹1,14,163",
        "tender_value_display": "₹ 2,45,67,890.50",
        "order_value_1_display": "Rs. 61.00 Lakh",
        "order_value_2_display": "₹ 1.25 Crore",
        "avg_annual_turnover_value_display": "Rs. 32.00 Lac",
        "working_capital_value_display": "1,500.25",
        "net_worth_value_display": "₹0.00",
    }

    dto = map_to_tms_dto(raw_input)

    assert dto["emdAmount"] == 114163.0
    assert dto["tenderValue"] == 24567890.5
    assert dto["orderValue1"] == 6100000.0  # 61.00 * 100,000
    assert dto["orderValue2"] == 12500000.0 # 1.25 * 10,000,000
    assert dto["avgAnnualTurnoverValue"] == 3200000.0 # 32.00 * 100,000
    # Strict TE review policy: missing type field is NOT auto-inferred to AMOUNT
    assert dto["avgAnnualTurnoverType"] is None
    assert dto["workingCapitalValue"] == 1500.25
    assert dto["netWorthValue"] == 0.0

    # Ensure ₹0.00 / 0.0 for tender_value_display evaluates strictly to None
    dto_zero_tv = map_to_tms_dto({"tender_value_display": "₹0.00"})
    assert dto_zero_tv["tenderValue"] is None
    dto_zero_num = map_to_tms_dto({"tender_value_display": "0.00"})
    assert dto_zero_num["tenderValue"] is None


def test_map_to_tms_dto_percentage_strings():
    """
    Test Case 4: Percentage strings with %, decimal values, and integer clamping (0-100).
    """
    raw_input = {
        "payment_terms_supply_display": "80%",
        "payment_terms_installation_display": "20 %",
        "pbg_percentage_display": "5%",
        "sd_percentage_display": "10.5%",
        "ld_percentage_display": "0.5% per week",
        "max_ld_percentage_display": "5.0%",
    }

    dto = map_to_tms_dto(raw_input)

    assert dto["paymentTermsSupply"] == 80
    assert isinstance(dto["paymentTermsSupply"], int)
    assert dto["paymentTermsInstallation"] == 20
    assert isinstance(dto["paymentTermsInstallation"], int)

    assert dto["pbgPercentage"] == 5.0
    assert dto["sdPercentage"] == 10.5
    assert dto["ldPercentagePerWeek"] == 0.5
    assert dto["maxLdPercentage"] == 5.0


def test_map_to_tms_dto_enum_normalization():
    """
    Test Case 5: Enum value normalization across multiple fields:
    - EMD Modes (BG, DD, BT, SB, FDR abbreviations)
    - Commercial Evaluation free-text mappings
    - MAF requirement variations
    - Delivery time installation with 'Inclusive' clause
    - Turn over / Criteria types
    """
    # 1. EMD modes normalization
    raw_input_1 = {
        "emd_mode_display": "BT/DD/SB/FDR/BG",
        "commercial_evaluation_display": "Item wise",
        "maf_required_display": "Yes - Project Specific",
        "delivery_time_installation_display": "Inclusive (SITC Scope)",
        "avg_annual_turnover_type_display": "Exempt",
        "net_worth_type_display": "Positive",
    }

    dto_1 = map_to_tms_dto(raw_input_1)

    assert dto_1["emdModes"] == [
        "Bank Transfer",
        "Demand Draft",
        "Surety Bond",
        "Fixed Deposit",
        "Bank Guarantee",
    ]
    assert dto_1["commercialEvaluation"] == "ITEM_WISE_GST_INCLUSIVE"
    assert dto_1["mafRequired"] == "YES_PROJECT_SPECIFIC"
    assert dto_1["deliveryTimeInstallationDays"] is None
    assert dto_1["deliveryTimeInstallationInclusive"] is True
    assert dto_1["avgAnnualTurnoverType"] == "NOT_APPLICABLE"
    assert dto_1["netWorthType"] == "POSITIVE"

    # 2. Other enum variations
    raw_input_2 = {
        "commercial_evaluation_display": "Item wise Pre-GST evaluation",
        "maf_required_display": "Yes",
        "reverse_auction_applicable_display": "No",
        "avg_annual_turnover_type_display": "Amount",
        "working_capital_type_display": "Amount",
    }

    dto_2 = map_to_tms_dto(raw_input_2)

    assert dto_2["commercialEvaluation"] == "ITEM_WISE_PRE_GST"
    assert dto_2["mafRequired"] == "YES_GENERAL"
    assert dto_2["reverseAuctionApplicable"] == "NO"
    assert dto_2["avgAnnualTurnoverType"] == "AMOUNT"
    assert dto_2["workingCapitalType"] == "AMOUNT"
