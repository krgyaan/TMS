import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import setup_logging, get_logger
from app.routers import health, extract, classify, bidding_requirements, annexures

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Initialize structured JSON logging for Promtail / Loki with service_name="volksAi"
setup_logging(service_name="volksAi")

import os
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment is loaded from root and app .env files
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT.parent.parent / ".env")

logger = logging.getLogger("volksAi")

def verify_anthropic_api_key():
    if os.getenv("LLM_FALLBACK_ENABLED", "true").lower() != "true":
        logger.info("[STARTUP] LLM fallback disabled; skipping Anthropic API key validation.")
        return
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    placeholder_vals = ["your_claude_api_key_here", "your_anthropic_api_key_here", "your_key_here", "placeholder", "xxx"]
    if not key or any(p in key.lower() for p in placeholder_vals):
        logger.error("[STARTUP] FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder.")
        health.set_health_status("degraded", llm_status="not_configured", last_error={
            "status": None,
            "type": "missing_key",
            "message": "ANTHROPIC_API_KEY is not configured or is a placeholder"
        })
        return
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key, timeout=5.0)
        test_model = os.getenv("ANTHROPIC_ROLE1_MODEL", "claude-haiku-4-5-20251001")
        client.messages.create(
            model=test_model,
            max_tokens=1,
            messages=[{"role": "user", "content": "ping"}],
        )
        logger.info("[STARTUP] Anthropic API connection verified successfully. Claude is active.")
        health.set_health_status("ok", llm_status="ok")
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        from app.services.llm_field_resolver import classify_anthropic_error
        err_info = classify_anthropic_error(exc)
        logger.error(
            "[STARTUP] Anthropic API startup check failed: status_code=%s, error_type=%s, msg=%s",
            status_code, err_info["type"], err_info["message"]
        )
        # If startup probe gets a 401 (or other failure), report degraded so it is visible
        health.set_health_status("degraded", llm_status=err_info["type"], last_error=err_info)

@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_anthropic_api_key()
    yield

import uuid
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from app.core.logging import request_id_ctx_var

app = FastAPI(
    title="VolksAI PDF Auto-Extraction Service",
    description="Internal microservice for automated tender PDF extraction and field mapping",
    version="1.0.0",
    lifespan=lifespan,
)


class _RequestIdASGIMiddleware:
    """Pure ASGI middleware propagating X-Request-ID without BaseHTTPMiddleware task-group overhead."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        incoming_req_id = ""
        for k, v in scope.get("headers") or []:
            if k.lower() == b"x-request-id":
                incoming_req_id = v.decode("latin-1", errors="ignore").strip()
                break
        req_id = incoming_req_id or f"req_{uuid.uuid4().hex[:12]}"
        token = request_id_ctx_var.set(req_id)

        async def _send_with_request_id(message):
            if message.get("type") == "http.response.start":
                raw_headers = list(message.get("headers") or [])
                if not any(k.lower() == b"x-request-id" for k, _ in raw_headers):
                    raw_headers.append((b"x-request-id", req_id.encode("latin-1")))
                message = {**message, "headers": raw_headers}
            await send(message)

        try:
            await self.app(scope, receive, _send_with_request_id)
        finally:
            request_id_ctx_var.reset(token)


app.add_middleware(_RequestIdASGIMiddleware)


@app.exception_handler(HTTPException)
async def http_exception_with_request_id(request: Request, exc: HTTPException):
    req_id = (
        request_id_ctx_var.get()
        or (request.headers.get("X-Request-ID") or "").strip()
        or f"req_{uuid.uuid4().hex[:12]}"
    )
    headers = dict(exc.headers or {})
    headers["X-Request-ID"] = req_id
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": req_id},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_with_request_id(request: Request, exc: Exception):
    req_id = (
        request_id_ctx_var.get()
        or (request.headers.get("X-Request-ID") or "").strip()
        or f"req_{uuid.uuid4().hex[:12]}"
    )
    logger.exception(
        "[UNHANDLED_ERROR] Unhandled exception in request",
        extra={"custom_fields": {"request_id": req_id, "path": str(request.url.path)}},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": req_id},
        headers={"X-Request-ID": req_id},
    )


# CORS configured to allow only requests from localhost (service is internal-only,
# invoked solely by the TMS NestJS backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount health, extraction, classification, bidding-requirements, and annexure routers
app.include_router(health.router)
app.include_router(extract.router)
app.include_router(classify.router)
app.include_router(bidding_requirements.router)

app.include_router(annexures.router)

