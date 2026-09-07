import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, extract

# Standard logging configuration to stdout for Docker log visibility
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("volksAi")

app = FastAPI(
    title="VolksAI PDF Auto-Extraction Service",
    description="Internal microservice for automated tender PDF extraction and field mapping",
    version="1.0.0",
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
