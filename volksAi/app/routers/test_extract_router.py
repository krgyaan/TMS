import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_extract_endpoint_response_shape():
    """
    Validates that /extract returns the exact TMS response envelope:
    {
      "extraction_version": "1.0.0",
      "fields": { ... },
      "missing_fields": [ ... ],
      "processing_time_ms": int
    }
    """
    mock_infosheet_data = {
        "tender_value_display": None,
        "emd_amount_display": "100000.0",
        "emd_required_display": "Yes",
        "maf_required_display": "⚠️ MISSING",
        "pbg_required_display": "No",
        "pbg_percentage_display": "N/A",
        "processing_fee_amount_display": "₹0.00",
        "processing_fee_mode_display": "Not Applicable",
        "tender_fee_amount_display": "₹0.00",
        "tender_fee_mode_display": "Not Applicable",
        "avg_annual_turnover_type_display": "Not Applicable",
        "avg_annual_turnover_value_display": "₹0.00",
        "working_capital_type_display": "Not Applicable",
        "working_capital_value_display": "₹0.00",
        "net_worth_type_display": "Not Applicable",
        "net_worth_value_display": "₹0.00",
        "solvency_certificate_type_display": "Not Applicable",
        "solvency_certificate_value_display": "₹0.00",
        "_info_sheet_statuses": {
            "tender_value_display": "MISSING",
            "emd_amount_display": "OK",
            "emd_required_display": "OK",
            "maf_required_display": "MISSING",
            "pbg_required_display": "OK",
            "pbg_percentage_display": "NOT_APPLICABLE",
            "processing_fee_mode_display": "NOT_APPLICABLE",
            "tender_fee_mode_display": "NOT_APPLICABLE",
            "avg_annual_turnover_type_display": "NOT_APPLICABLE",
            "avg_annual_turnover_value_display": "NOT_APPLICABLE",
            "working_capital_type_display": "NOT_APPLICABLE",
            "working_capital_value_display": "NOT_APPLICABLE",
            "net_worth_type_display": "NOT_APPLICABLE",
            "net_worth_value_display": "NOT_APPLICABLE",
            "solvency_certificate_type_display": "NOT_APPLICABLE",
            "solvency_certificate_value_display": "NOT_APPLICABLE",
        },
        "_info_sheet_sources": {
            "emd_amount_display": "regex",
            "emd_required_display": "regex",
            "pbg_required_display": "regex",
        },
        "missing_fields": ["tender_value_display", "maf_required_display"],
    }

    with patch("app.routers.extract.ingest_parent_tender_pdf", return_value=mock_infosheet_data):
        response = client.post(
            "/extract",
            files={"pdf_file": ("test_tender.pdf", b"%PDF-1.4 mock content", "application/pdf")},
        )

    assert response.status_code == 200
    data = response.json()

    # 1. Envelope root keys
    assert data["extraction_version"] == "1.0.0"
    assert "fields" in data
    assert "missing_fields" in data
    assert "processing_time_ms" in data
    assert isinstance(data["processing_time_ms"], int)
    assert data["processing_time_ms"] >= 0

    # 2. Fields structure uses TMS camelCase keys
    fields = data["fields"]
    assert "emdAmount" in fields
    assert fields["emdAmount"]["value"] == 100000.0
    assert fields["emdAmount"]["confidence"] == "high"
    assert fields["emdAmount"]["source"] == "regex"

    assert "tenderValue" in fields
    assert fields["tenderValue"]["value"] is None
    assert fields["tenderValue"]["confidence"] == "missing"

    assert "pbgPercentage" in fields
    assert fields["pbgPercentage"]["value"] is None
    assert fields["pbgPercentage"]["confidence"] == "not_applicable"

    # Fee and financial criteria not_applicable fields pair with null
    assert fields["processingFeeAmount"]["value"] is None
    assert fields["processingFeeAmount"]["confidence"] == "not_applicable"
    assert fields["processingFeeModes"]["value"] is None
    assert fields["processingFeeModes"]["confidence"] == "not_applicable"

    assert fields["tenderFeeAmount"]["value"] is None
    assert fields["tenderFeeAmount"]["confidence"] == "not_applicable"
    assert fields["tenderFeeModes"]["value"] is None
    assert fields["tenderFeeModes"]["confidence"] == "not_applicable"

    assert fields["avgAnnualTurnoverValue"]["value"] is None
    assert fields["avgAnnualTurnoverValue"]["confidence"] == "not_applicable"

    assert fields["workingCapitalValue"]["value"] is None
    assert fields["workingCapitalValue"]["confidence"] == "not_applicable"

    assert fields["netWorthValue"]["value"] is None
    assert fields["netWorthValue"]["confidence"] == "not_applicable"

    assert fields["solvencyCertificateValue"]["value"] is None
    assert fields["solvencyCertificateValue"]["confidence"] == "not_applicable"

    # 3. Missing fields contains TMS camelCase names of missing fields
    missing = data["missing_fields"]
    assert "tenderValue" in missing
    assert "mafRequired" in missing
    # NOT_APPLICABLE fields should not be considered missing
    assert "pbgPercentage" not in missing
    assert "avgAnnualTurnoverValue" not in missing
    assert "processingFeeAmount" not in missing
