import time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import httpx
import pytest
import anthropic

from app.services.llm_field_resolver import LLMFieldResolver


def _create_mock_401_error():
    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    resp = httpx.Response(401, request=req)
    return anthropic.AuthenticationError(
        message="401 unauthorized: invalid x-api-key",
        response=resp,
        body={"error": {"type": "authentication_error", "message": "invalid x-api-key"}},
    )


def _create_mock_429_error():
    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    resp = httpx.Response(429, request=req)
    return anthropic.RateLimitError(
        message="429 rate_limit_error: Number of request tokens has exceeded your daily rate limit",
        response=resp,
        body={"error": {"type": "rate_limit_error", "message": "rate limit exceeded"}},
    )


def test_mocked_401_stops_immediately_and_skips_remaining_categories(monkeypatch):
    """
    On a non-retryable 401 error:
    - The LLMFieldResolver must stop immediately (call count = 1).
    - It must NOT attempt any retry.
    - It must NOT attempt subsequent categories.
    - llm_status must be set to 'llm_unavailable'.
    - failed_categories must contain the failed category and all remaining scheduled categories.
    - Role 2 ambiguity resolution must immediately abort without making any LLM calls.
    """
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key")

    mock_client = MagicMock()
    mock_client.messages.create.side_effect = _create_mock_401_error()
    resolver.client = mock_client

    # Provide missing fields that span multiple distinct categories:
    # 'pbg_percentage_display' -> 'pbg_sd'
    # 'payment_terms_supply_display' -> 'payment_terms'
    # 'ld_percentage_display' -> 'prs_ld'
    missing_fields = [
        "pbg_percentage_display",
        "payment_terms_supply_display",
        "ld_percentage_display",
    ]

    sample_text = (
        "Performance Bank Guarantee: 5% of order value.\n"
        "Payment Terms: 100% against delivery.\n"
        "Liquidated Damages: 0.5% per week up to 10%.\n"
    )

    with patch("app.services.llm_field_resolver._save_memory"):
        results = resolver.resolve_missing_fields(sample_text, missing_fields)

    # 1. Exactly 1 API call made (stopped immediately on first category, no retry, no remaining categories)
    assert mock_client.messages.create.call_count == 1

    # 2. Status set to 'llm_unavailable'
    assert resolver.llm_status == "llm_unavailable"
    assert results.get("_llm_status") == "llm_unavailable"

    # 3. All scheduled categories are marked failed/skipped
    assert len(resolver.failed_categories) >= 2
    assert "pbg_sd" in resolver.failed_categories
    assert "payment_terms" in resolver.failed_categories
    assert "prs_ld" in resolver.failed_categories
    assert results.get("_failed_categories") == resolver.failed_categories

    # 4. Role 2 ambiguity resolution must also abort without any LLM calls
    ambiguity_results = resolver.resolve_ambiguous_fields(
        full_text=sample_text,
        candidates={"net_worth_type_display": "Positive"},
    )
    assert ambiguity_results == {}
    # Still exactly 1 call (Role 2 made 0 calls)
    assert mock_client.messages.create.call_count == 1


def test_mocked_429_retries_with_backoff_and_records_skipped_on_exhaustion(monkeypatch):
    """
    On a retryable 429 error that does not recover:
    - The LLMFieldResolver must retry up to max_retries (3 calls total for the category).
    - It must sleep with exponential backoff between attempts (0.5s, 1.0s).
    - On exhaustion, it gives up, sets llm_status to 'llm_unavailable',
      and records the category and all subsequent categories as failed.
    """
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key")

    mock_client = MagicMock()
    mock_client.messages.create.side_effect = _create_mock_429_error()
    resolver.client = mock_client

    sleep_calls = []
    monkeypatch.setattr(time, "sleep", lambda s: sleep_calls.append(s))

    missing_fields = [
        "pbg_percentage_display",
        "payment_terms_supply_display",
    ]

    sample_text = "Performance Security: 10%. Payment Terms: 80% on dispatch."

    with patch("app.services.llm_field_resolver._save_memory"):
        results = resolver.resolve_missing_fields(sample_text, missing_fields)

    # 1. Retried up to 3 attempts on the first category, then gave up
    assert mock_client.messages.create.call_count == 3

    # 2. Backoff slept twice: 0.5s (base * 2^0), 1.0s (base * 2^1)
    assert len(sleep_calls) == 2
    assert sleep_calls[0] == pytest.approx(0.5, 0.01)
    assert sleep_calls[1] == pytest.approx(1.0, 0.01)

    # 3. Status set to 'llm_unavailable'
    assert resolver.llm_status == "llm_unavailable"
    assert results.get("_llm_status") == "llm_unavailable"

    # 4. Failed categories include the exhausted category and all remaining
    assert "pbg_sd" in resolver.failed_categories
    assert "payment_terms" in resolver.failed_categories
    assert results.get("_failed_categories") == resolver.failed_categories


def test_mocked_429_recovers_on_transient_retry(monkeypatch):
    """
    On a transient 429 that recovers on retry attempt 2:
    - Attempt 1 raises 429.
    - Attempt 2 succeeds with valid extraction.
    - Extraction proceeds normally, llm_status remains 'ok', failed_categories is empty.
    """
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key")

    # Success response
    success_response = SimpleNamespace(
        content=[
            SimpleNamespace(
                type="tool_use",
                name="extract_missing_fields",
                input={"pbg_percentage": 10.0},
            )
        ],
        usage=SimpleNamespace(
            input_tokens=150,
            output_tokens=25,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
        ),
        stop_reason="tool_use",
    )

    mock_client = MagicMock()
    # 1st call fails with 429, 2nd call succeeds
    mock_client.messages.create.side_effect = [_create_mock_429_error(), success_response]
    resolver.client = mock_client

    sleep_calls = []
    monkeypatch.setattr(time, "sleep", lambda s: sleep_calls.append(s))

    missing_fields = ["pbg_percentage_display"]
    sample_text = "Performance Security: 10% of contract value."

    with patch("app.services.llm_field_resolver._save_memory"):
        results = resolver.resolve_missing_fields(sample_text, missing_fields)

    # 1. Total 2 calls made
    assert mock_client.messages.create.call_count == 2
    # 2. Slept once (0.5s backoff)
    assert len(sleep_calls) == 1
    assert sleep_calls[0] == pytest.approx(0.5, 0.01)

    # 3. Successful recovery
    assert resolver.llm_status == "ok"
    assert resolver.failed_categories == []
    assert "pbg_percentage_display" in results
    assert results["pbg_percentage_display"]["value"] == "10%"


def test_error_classification_retryable_vs_non_retryable():
    """
    Verify classification of retryable vs non-retryable errors according to spec.
    """
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key")

    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")

    # Non-retryable status codes and exceptions
    for code in (400, 401, 403, 404):
        resp = httpx.Response(code, request=req)
        err = anthropic.APIStatusError(message=f"HTTP {code}", response=resp, body=None)
        assert resolver._is_non_retryable_error(err) is True
        assert resolver._is_retryable_error(err) is False

    # Retryable status codes and exceptions
    for code in (408, 429, 500, 502, 503, 504):
        resp = httpx.Response(code, request=req)
        err = anthropic.APIStatusError(message=f"HTTP {code}", response=resp, body=None)
        assert resolver._is_retryable_error(err) is True
        assert resolver._is_non_retryable_error(err) is False

    # Standard python timeout and connection errors
    assert resolver._is_retryable_error(TimeoutError("Timeout")) is True
    assert resolver._is_retryable_error(ConnectionError("Connection lost")) is True


def test_global_time_budget_configuration(monkeypatch):
    """
    Verify global time budget defaults to 60.0s, accepts constructor override,
    and accepts LLM_TOTAL_TIME_BUDGET_SEC environment variable.
    """
    # 1. Default is 60.0s
    monkeypatch.delenv("LLM_TOTAL_TIME_BUDGET_SEC", raising=False)
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key")
    assert resolver.time_budget_sec == 60.0

    # 2. Configurable via constructor
    resolver_custom = LLMFieldResolver(api_key="sk-ant-test-mock-key", time_budget_sec=15.5)
    assert resolver_custom.time_budget_sec == 15.5

    # 3. Configurable via environment variable
    monkeypatch.setenv("LLM_TOTAL_TIME_BUDGET_SEC", "45.0")
    resolver_env = LLMFieldResolver(api_key="sk-ant-test-mock-key")
    assert resolver_env.time_budget_sec == 45.0


def test_global_time_budget_stops_retries_when_budget_exhausted(monkeypatch):
    """
    When the global time budget is exceeded during retry:
    - Resolver immediately gives up without further retry attempts.
    - llm_status is set to 'llm_unavailable'.
    - Failed and remaining categories are recorded in failed_categories.
    """
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key", time_budget_sec=1.0)

    mock_client = MagicMock()
    mock_client.messages.create.side_effect = _create_mock_429_error()
    resolver.client = mock_client

    # Simulate start_time 2 seconds ago (budget 1.0s exceeded)
    resolver.start_time = time.time() - 2.0
    assert resolver.is_time_budget_exceeded() is True

    missing_fields = ["pbg_percentage_display", "payment_terms_supply_display"]
    sample_text = "Sample tender text"

    results = resolver.resolve_missing_fields(sample_text, missing_fields)

    # Stopped before making any LLM call because budget was already exhausted
    assert mock_client.messages.create.call_count == 0
    assert resolver.llm_status == "llm_unavailable"
    assert "pbg_sd" in resolver.failed_categories
    assert "payment_terms" in resolver.failed_categories
    assert results.get("_llm_status") == "llm_unavailable"


def test_global_time_budget_aborts_backoff_sleep_if_sleep_exceeds_remaining_budget(monkeypatch):
    """
    If backoff sleep (e.g. 0.5s) exceeds the remaining budget (e.g. 0.1s):
    - Resolver does NOT sleep.
    - It aborts retries immediately and marks categories skipped.
    """
    monkeypatch.setenv("LLM_FALLBACK_ENABLED", "true")
    # Budget 0.2s
    resolver = LLMFieldResolver(api_key="sk-ant-test-mock-key", time_budget_sec=0.2)

    mock_client = MagicMock()
    mock_client.messages.create.side_effect = _create_mock_429_error()
    resolver.client = mock_client

    sleep_calls = []
    monkeypatch.setattr(time, "sleep", lambda s: sleep_calls.append(s))

    missing_fields = ["pbg_percentage_display"]
    sample_text = "Sample tender text"

    # Start time set so remaining budget is only 0.1s (0.5s sleep > 0.1s remaining)
    resolver.start_time = time.time() - 0.1

    results = resolver.resolve_missing_fields(sample_text, missing_fields)

    # Only 1 attempt made; backoff sleep of 0.5s exceeded 0.1s budget, so it aborted immediately
    assert mock_client.messages.create.call_count == 1
    assert len(sleep_calls) == 0
    assert resolver.llm_status == "llm_unavailable"
    assert "pbg_sd" in resolver.failed_categories
    assert results.get("_llm_status") == "llm_unavailable"


