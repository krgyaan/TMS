import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)

_health_state: Dict[str, Any] = {
    "status": "ok",
    "llm": {"status": "ok", "last_error": None}
}

def set_health_status(overall_status: str, llm_status: str = "ok", last_error: Optional[Dict[str, Any]] = None):
    global _health_state
    _health_state["status"] = overall_status
    _health_state["llm"] = {
        "status": llm_status,
        "last_error": last_error
    }

def get_health_state() -> Dict[str, Any]:
    return _health_state

@router.get("/health")
async def health_check():
    """Liveness & readiness probe polled by TMS NestJS API."""
    return _health_state
