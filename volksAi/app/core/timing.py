"""
Per-stage timing instrumentation and opt-in deterministic LLM record/replay helper.

Logs structured timing lines in the exact format:
    [TIMING] stage=<name> elapsed_ms=<n> request_id=<id>
"""

import hashlib
import json
import logging
import os
import time
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable, Dict, Generator, List, Optional

from app.core.logging import request_id_ctx_var

logger = logging.getLogger(__name__)

# Optional per-request accumulator mapping stage name -> elapsed_ms
stage_timings_ctx_var: ContextVar[Optional[Dict[str, float]]] = ContextVar(
    "stage_timings", default=None
)

# Optional per-request stage entry callback for async job progress tracking
stage_callback_ctx_var: ContextVar[Optional[Callable[[str], None]]] = ContextVar(
    "stage_callback", default=None
)


def init_stage_timings() -> Dict[str, float]:
    """Initialize a fresh per-request stage timings dictionary in contextvars."""
    store: Dict[str, float] = {}
    stage_timings_ctx_var.set(store)
    return store


def get_stage_timings() -> Dict[str, float]:
    """Return a copy of the current request's recorded stage timings."""
    store = stage_timings_ctx_var.get()
    return dict(store) if store is not None else {}


@contextmanager
def stage_timer(
    stage: str,
    request_id: Optional[str] = None,
    extra_meta: Optional[Dict[str, Any]] = None,
) -> Generator[Dict[str, Any], None, None]:
    """
    Context manager measuring wall-clock elapsed milliseconds for a pipeline stage.
    Always logs:
        [TIMING] stage=<name> elapsed_ms=<n> request_id=<id>
    """
    req_id = request_id or request_id_ctx_var.get() or "none"
    cb = stage_callback_ctx_var.get()
    if cb is not None:
        try:
            cb(stage)
        except Exception:
            pass
    t0 = time.perf_counter()
    state: Dict[str, Any] = {"stage": stage, "request_id": req_id, "elapsed_ms": 0.0}
    try:
        yield state
    finally:
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        state["elapsed_ms"] = elapsed_ms
        store = stage_timings_ctx_var.get()
        if store is not None:
            store[stage] = round(store.get(stage, 0.0) + elapsed_ms, 2)

        suffix = ""
        if extra_meta:
            suffix_parts = [f"{k}={v}" for k, v in extra_meta.items() if v is not None]
            if suffix_parts:
                suffix = " " + " ".join(suffix_parts)

        logger.info(
            "[TIMING] stage=%s elapsed_ms=%.2f request_id=%s%s",
            stage,
            elapsed_ms,
            req_id,
            suffix,
            extra={
                "custom_fields": {
                    "timing_stage": stage,
                    "elapsed_ms": elapsed_ms,
                    "request_id": req_id,
                    **(extra_meta or {}),
                }
            },
        )


def compute_llm_request_hash(
    *,
    model: Any,
    system: Any,
    tools: Any,
    messages: Any,
    max_tokens: Any = None,
    tool_choice: Any = None,
) -> str:
    """Compute a deterministic SHA-256 hex digest for an Anthropic messages.create call."""
    payload = {
        "model": model,
        "system": system,
        "tools": tools,
        "messages": messages,
        "max_tokens": max_tokens,
        "tool_choice": tool_choice,
    }
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _serialize_response(response: Any) -> Dict[str, Any]:
    """Convert an Anthropic Message response into a JSON-serializable dict."""
    blocks: List[Dict[str, Any]] = []
    for block in getattr(response, "content", []) or []:
        b_type = getattr(block, "type", "")
        if b_type == "tool_use":
            blocks.append(
                {
                    "type": "tool_use",
                    "id": getattr(block, "id", "toolu_replay"),
                    "name": getattr(block, "name", ""),
                    "input": getattr(block, "input", {}) or {},
                }
            )
        elif b_type == "text":
            blocks.append(
                {
                    "type": "text",
                    "text": getattr(block, "text", ""),
                }
            )
        else:
            blocks.append({"type": str(b_type)})

    usage_obj = getattr(response, "usage", None)
    usage_dict = {
        "input_tokens": getattr(usage_obj, "input_tokens", 0) or 0,
        "output_tokens": getattr(usage_obj, "output_tokens", 0) or 0,
        "cache_creation_input_tokens": getattr(usage_obj, "cache_creation_input_tokens", 0) or 0,
        "cache_read_input_tokens": getattr(usage_obj, "cache_read_input_tokens", 0) or 0,
    }
    return {
        "stop_reason": getattr(response, "stop_reason", "end_turn"),
        "content": blocks,
        "usage": usage_dict,
    }


def _deserialize_response(data: Dict[str, Any]) -> Any:
    """Reconstruct a response object compatible with Anthropic Message attributes."""
    content_objs = []
    for b in data.get("content", []):
        content_objs.append(SimpleNamespace(**b))
    usage_data = data.get("usage", {})
    usage_obj = SimpleNamespace(
        input_tokens=usage_data.get("input_tokens", 0),
        output_tokens=usage_data.get("output_tokens", 0),
        cache_creation_input_tokens=usage_data.get("cache_creation_input_tokens", 0),
        cache_read_input_tokens=usage_data.get("cache_read_input_tokens", 0),
    )
    return SimpleNamespace(
        stop_reason=data.get("stop_reason", "end_turn"),
        content=content_objs,
        usage=usage_obj,
    )


def call_anthropic_with_replay(
    create_fn: Callable[..., Any],
    **kwargs: Any,
) -> Any:
    """
    Opt-in record/replay wrapper around `client.messages.create`.
    Controlled by `VOLKSAI_LLM_RECORD_REPLAY_DIR` (disabled by default when unset/empty).
    """
    replay_dir_str = os.getenv("VOLKSAI_LLM_RECORD_REPLAY_DIR", "").strip()
    if not replay_dir_str:
        return create_fn(**kwargs)

    replay_dir = Path(replay_dir_str)
    replay_dir.mkdir(parents=True, exist_ok=True)
    digest = compute_llm_request_hash(
        model=kwargs.get("model"),
        system=kwargs.get("system"),
        tools=kwargs.get("tools"),
        messages=kwargs.get("messages"),
        max_tokens=kwargs.get("max_tokens"),
        tool_choice=kwargs.get("tool_choice"),
    )
    cache_file = replay_dir / f"{digest}.json"
    if cache_file.is_file():
        try:
            cached_data = json.loads(cache_file.read_text(encoding="utf-8"))
            logger.info("[LLM_REPLAY] Hit deterministic replay cache (%s)", digest[:12])
            return _deserialize_response(cached_data)
        except Exception as exc:
            logger.warning("[LLM_REPLAY] Failed reading replay file %s: %s", cache_file, exc)

    response = create_fn(**kwargs)
    try:
        serialized = _serialize_response(response)
        cache_file.write_text(json.dumps(serialized, indent=2), encoding="utf-8")
        logger.info("[LLM_REPLAY] Recorded LLM response to %s", cache_file.name)
    except Exception as exc:
        logger.warning("[LLM_REPLAY] Failed recording replay file %s: %s", cache_file, exc)
    return response
