"""
Unit tests for VolksAI performance & resilience optimizations (Phases 0-3):
- Concurrency guard (HTTP 503 + Retry-After when saturated)
- Request-level deadline (partial=True + skipped_stages when budget exceeded)
- Async job lifecycle (POST /extract/jobs -> 202, GET /extract/jobs/{job_id} -> 200/404)
- X-Request-ID header propagation & error payload inclusion
- PDF extraction cache key stability & hit behavior
- PaddleOCR 3.x parameter initialization (use_textline_orientation=True, no use_gpu)
- Role 1 static system prompt cache block separation & HTTP 413 non-retryable handling
"""

import asyncio
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ocr.ocr_engine import OcrEngine
from app.routers import extract as extract_router
from app.services.llm_field_resolver import LLMFieldResolver
from app.services.pdf_text_extractor import (
    _PDF_MEMORY_CACHE,
    _get_cached_pdf_extraction,
    _store_cached_pdf_extraction,
    compute_pdf_cache_key,
)


def _minimal_fake_infosheet(partial: bool = False, skipped_stages=None):
    data = {
        "_info_sheet_statuses": {},
        "_info_sheet_sources": {},
        "_dual_sources": {},
        "_self_classified_atc": False,
        "_has_atc": False,
        "_ambiguous_field_conflicts": {},
        "_llm_usage": {"calls": 0, "estimated_cost_usd": 0.0},
        "_llm_status": "ok",
        "_failed_categories": [],
        "_last_error": None,
    }
    if partial:
        data["_partial"] = True
        data["_skipped_stages"] = skipped_stages or ["llm_fallback"]
    return data


def test_pdf_cache_key_stability_and_roundtrip(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("VOLKSAI_PDF_CACHE_DIR", str(tmp_path / "cache"))
    pdf_a = tmp_path / "a.pdf"
    pdf_b = tmp_path / "b.pdf"
    content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    pdf_a.write_bytes(content)
    pdf_b.write_bytes(content)

    key_a1 = compute_pdf_cache_key(pdf_a, max_pages=0, smart_sampling=False, zoom=2.0)
    key_a2 = compute_pdf_cache_key(pdf_a, max_pages=0, smart_sampling=False, zoom=2.0)
    key_b = compute_pdf_cache_key(pdf_b, max_pages=0, smart_sampling=False, zoom=2.0)
    key_sampled = compute_pdf_cache_key(pdf_a, max_pages=160, smart_sampling=True, zoom=2.0)

    # Identical bytes + options produce the exact same SHA-256 key regardless of filename
    assert key_a1 == key_a2 == key_b
    # Different sampling parameters produce a distinct key
    assert key_a1 != key_sampled

    _PDF_MEMORY_CACHE.clear()
    payload = [{"page": 1, "text": "cached text"}]
    _store_cached_pdf_extraction(key_a1, payload)

    cached = _get_cached_pdf_extraction(key_a1)
    assert cached is not None
    assert cached[0]["text"] == "cached text"
    # Mutating returned copy must not corrupt internal cache
    cached[0]["text"] = "mutated"
    assert _get_cached_pdf_extraction(key_a1)[0]["text"] == "cached text"


def test_paddleocr_3x_init_uses_textline_orientation_without_use_gpu(monkeypatch):
    monkeypatch.setenv("PADDLE_OCR_ENABLED", "true")
    recorded_kwargs = []

    class FakePaddleOCR:
        def __init__(self, **kwargs):
            recorded_kwargs.append(kwargs)

    prev_instance = OcrEngine._paddle_instance
    prev_attempted = OcrEngine._paddle_attempted
    try:
        OcrEngine._paddle_instance = None
        OcrEngine._paddle_attempted = False
        with patch.dict("sys.modules", {"paddleocr": SimpleNamespace(PaddleOCR=FakePaddleOCR)}):
            OcrEngine._init_paddle()
            assert OcrEngine._paddle_instance is not None
            assert len(recorded_kwargs) == 1
            assert "use_gpu" not in recorded_kwargs[0]
            assert "show_log" not in recorded_kwargs[0]
            assert recorded_kwargs[0].get("use_textline_orientation") is True
    finally:
        OcrEngine._paddle_instance = prev_instance
        OcrEngine._paddle_attempted = prev_attempted


def test_concurrency_guard_returns_503_with_retry_after(monkeypatch):
    monkeypatch.setenv("VOLKSAI_MAX_CONCURRENT_EXTRACTIONS", "1")
    monkeypatch.setenv("VOLKSAI_QUEUE_WAIT_SEC", "0.05")
    monkeypatch.setenv("VOLKSAI_RETRY_AFTER_SEC", "15")

    saturated_sem = asyncio.Semaphore(0)
    with patch.object(extract_router, "_get_extract_semaphore", return_value=saturated_sem):
        client = TestClient(app)
        resp = client.post(
            "/extract",
            headers={"X-Request-ID": "req_saturation_test"},
            files={"pdf_file": ("sample.pdf", b"%PDF-1.4 dummy", "application/pdf")},
        )
        assert resp.status_code == 503
        assert resp.headers.get("Retry-After") == "15"
        assert resp.headers.get("X-Request-ID") == "req_saturation_test"
        body = resp.json()
        assert body.get("request_id") == "req_saturation_test"
        assert "capacity" in body.get("detail", "").lower()


def test_request_deadline_returns_partial_result(monkeypatch):
    monkeypatch.setenv("VOLKSAI_EXTRACT_DEADLINE_SEC", "0.01")
    extract_router._EXTRACT_SEMAPHORE = None

    def _fake_ingest_expired(**kwargs):
        return _minimal_fake_infosheet(partial=True, skipped_stages=["atc_extraction", "llm_fallback"])

    with patch.object(extract_router, "ingest_parent_tender_pdf", side_effect=_fake_ingest_expired):
        client = TestClient(app)
        resp = client.post(
            "/extract",
            headers={"X-Request-ID": "req_deadline_test"},
            files={"pdf_file": ("tender.pdf", b"%PDF-1.4 dummy", "application/pdf")},
        )
        assert resp.status_code == 200
        assert resp.headers.get("X-Request-ID") == "req_deadline_test"
        data = resp.json()
        assert data.get("partial") is True
        assert "llm_fallback" in data.get("skipped_stages", [])
        assert "fields" in data


def test_async_extract_job_lifecycle():
    extract_router._EXTRACTION_JOBS.clear()
    extract_router._EXTRACT_SEMAPHORE = None

    def _fake_ingest(**kwargs):
        time.sleep(0.02)
        return _minimal_fake_infosheet(partial=False)

    with patch("app.main.verify_anthropic_api_key"), patch.object(
        extract_router, "ingest_parent_tender_pdf", side_effect=_fake_ingest
    ):
        with TestClient(app) as client:
            create_resp = client.post(
                "/extract/jobs",
                headers={"X-Request-ID": "req_async_job_1"},
                files={"pdf_file": ("tender.pdf", b"%PDF-1.4 dummy", "application/pdf")},
            )
            assert create_resp.status_code == 202
            assert create_resp.headers.get("X-Request-ID") == "req_async_job_1"
            job_meta = create_resp.json()
            job_id = job_meta["job_id"]
            assert job_id.startswith("job_")
            assert job_meta["status"] in ("queued", "running", "complete")

            # Poll until complete
            final_body = None
            for _ in range(30):
                poll_resp = client.get(f"/extract/jobs/{job_id}")
                assert poll_resp.status_code == 200
                final_body = poll_resp.json()
                if final_body["status"] in ("complete", "failed"):
                    break
                time.sleep(0.02)

            assert final_body is not None
            assert final_body["status"] == "complete"
            assert final_body["progress"] == 1.0
            assert final_body["result"] is not None
            assert "fields" in final_body["result"]
            assert final_body["error"] is None

            # Unknown job_id returns 404 with request_id
            missing_resp = client.get("/extract/jobs/job_does_not_exist", headers={"X-Request-ID": "req_404_check"})
            assert missing_resp.status_code == 404
            assert missing_resp.json().get("request_id") == "req_404_check"


def test_413_error_is_classified_as_non_retryable():
    resolver = LLMFieldResolver(api_key="sk-ant-test-dummy-key")

    class FakePayloadTooLargeError(Exception):
        status_code = 413

    assert resolver._is_non_retryable_error(FakePayloadTooLargeError("Request too large")) is True


def test_role1_system_blocks_keep_static_cached_prefix_separate():
    resolver = LLMFieldResolver(api_key="sk-ant-test-dummy-key")
    captured_calls = []

    def _fake_create(**kwargs):
        captured_calls.append(kwargs)
        return SimpleNamespace(
            stop_reason="tool_use",
            content=[
                SimpleNamespace(
                    type="tool_use",
                    id="toolu_1",
                    name="report_extracted_tender_fields",
                    input={"emd_amount": {"value": "50000", "source_quote": "EMD Rs 50000", "confidence": "high"}},
                )
            ],
            usage=SimpleNamespace(
                input_tokens=100,
                output_tokens=20,
                cache_creation_input_tokens=80,
                cache_read_input_tokens=0,
            ),
        )

    resolver.client = SimpleNamespace(messages=SimpleNamespace(create=_fake_create))
    with patch(
        "app.services.llm_field_resolver._build_few_shot_section",
        return_value="--- FEW-SHOT EXAMPLES ---\nExample 1",
    ), patch(
        "app.services.llm_field_resolver.extract_scoped_context",
        return_value="SECTION-I BID EVALUATION CRITERIA EMD Rs 50000",
    ):
        resolver.resolve_missing_fields(
            atc_full_text="SECTION-I BID EVALUATION CRITERIA EMD Rs 50000",
            missing_fields=["emd_amount_display"],
        )
    assert len(captured_calls) == 1
    sys_blocks = captured_calls[0]["system"]
    # Static instruction is block 0 with cache_control; dynamic few-shot is block 1 without mutating block 0
    assert sys_blocks[0].get("cache_control") == {"type": "ephemeral"}
    assert "FEW-SHOT EXAMPLES" not in sys_blocks[0]["text"]
    assert len(sys_blocks) == 2
    assert "FEW-SHOT EXAMPLES" in sys_blocks[1]["text"]


