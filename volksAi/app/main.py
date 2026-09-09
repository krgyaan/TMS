import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, extract

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Standard logging configuration to stdout for Docker log visibility
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

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
        raise RuntimeError("FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder. Claude is required for tender field resolution.")
    logger.info("[STARTUP] Anthropic API key validated successfully. Claude Sonnet 5 is active.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    verify_anthropic_api_key()
    yield

app = FastAPI(
    title="VolksAI PDF Auto-Extraction Service",
    description="Internal microservice for automated tender PDF extraction and field mapping",
    version="1.0.0",
    lifespan=lifespan,
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

# Mount health and extraction routers
app.include_router(health.router)
app.include_router(extract.router)

