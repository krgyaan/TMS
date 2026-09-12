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


def test_extract_endpoint_accepts_and_forwards_atc_and_boq_files():
    """
    Regression guard for the accepted-but-silently-dropped bug: /extract
    previously declared only `pdf_file` + `user_id` as parameters, so the
    atc_files/boq_file multipart fields the NestJS worker sends were never
    bound to anything and vanished -- ingest_parent_tender_pdf() always ran
    with no ATC/BOQ content. This asserts the endpoint actually accepts
    them (HTTP 200, no silent drop) AND forwards non-empty paths into
    ingest_parent_tender_pdf() as explicit_atc_paths / explicit_boq_path.

    (The deeper guarantee -- that the forwarded files' CONTENT actually
    changes the extraction result -- is covered without mocking in
    app/services/test_pdf_parent_ingest_atc.py; this test only proves the
    HTTP/API layer no longer drops the files before they get that far.)
    """
    captured = {}

    def _fake_ingest(**kwargs):
        # Snapshot existence + content HERE, while the endpoint's
        # TemporaryDirectory is still alive -- it's cleaned up as soon as
        # this call returns, before the HTTP response reaches the test.
        atc_paths = kwargs.get("explicit_atc_paths") or []
        boq_path = kwargs.get("explicit_boq_path")
        captured["atc_count"] = len(atc_paths)
        captured["atc_exist"] = [p.exists() for p in atc_paths]
        captured["atc_contents"] = [p.read_bytes() for p in atc_paths]
        captured["boq_present"] = boq_path is not None
        captured["boq_exists"] = boq_path.exists() if boq_path else None
        captured["boq_content"] = boq_path.read_bytes() if boq_path else None
        return {"missing_fields": []}

    with patch("app.routers.extract.ingest_parent_tender_pdf", side_effect=_fake_ingest):
        response = client.post(
            "/extract",
            files=[
                ("pdf_file", ("main_tender.pdf", b"%PDF-1.4 mock main content", "application/pdf")),
                ("atc_files", ("atc_1.pdf", b"%PDF-1.4 mock atc content 1", "application/pdf")),
                ("atc_files", ("atc_2.pdf", b"%PDF-1.4 mock atc content 2", "application/pdf")),
                ("boq_file", ("boq.pdf", b"%PDF-1.4 mock boq content", "application/pdf")),
            ],
        )

    assert response.status_code == 200

    assert captured["atc_count"] == 2
    assert all(captured["atc_exist"])
    assert captured["atc_contents"] == [b"%PDF-1.4 mock atc content 1", b"%PDF-1.4 mock atc content 2"]

    assert captured["boq_present"] is True
    assert captured["boq_exists"] is True
    assert captured["boq_content"] == b"%PDF-1.4 mock boq content"


def test_extract_endpoint_works_without_atc_or_boq_files():
    """ATC/BOQ files must remain optional -- a plain main-PDF-only request
    (no atc_files, no boq_file) still succeeds, with empty/None forwarded."""
    captured_kwargs = {}

    def _fake_ingest(**kwargs):
        captured_kwargs.update(kwargs)
        return {"missing_fields": []}

    with patch("app.routers.extract.ingest_parent_tender_pdf", side_effect=_fake_ingest):
        response = client.post(
            "/extract",
            files={"pdf_file": ("main_tender.pdf", b"%PDF-1.4 mock main content", "application/pdf")},
        )

    assert response.status_code == 200
    assert captured_kwargs.get("explicit_atc_paths") == []
    assert captured_kwargs.get("explicit_boq_path") is None
