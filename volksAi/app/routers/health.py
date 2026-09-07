import logging
from fastapi import APIRouter

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """Simple liveness check polled by TMS NestJS API before dispatching extraction jobs."""
    return {"status": "ok"}
