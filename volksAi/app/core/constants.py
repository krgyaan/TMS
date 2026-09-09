import os
import tempfile
from enum import Enum
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Detect Vercel / Serverless read-only filesystem environment
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or os.environ.get("AWS_EXECUTION_ENV"):
    temp_base = Path(tempfile.gettempdir()) / "tender_app"
    STORAGE_ROOT = temp_base / "storage"
else:
    STORAGE_ROOT = PROJECT_ROOT / "storage"



# Status strings
class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

