import json
import logging
import sys
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Any, Dict

# ContextVar to hold the unique ID of the request during its lifecycle.
# This variable is thread/async-task-safe and context-local.
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="")

class JSONFormatter(logging.Formatter):
    """
    Custom formatter that transforms standard LogRecord structures into 
    standardized JSON strings.
    """
    def __init__(self, service_name: str = "tender_backend"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        request_id = request_id_ctx_var.get()
        
        log_record: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self.service_name,
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "file": record.filename,
            "line": record.lineno,
        }
        
        if request_id:
            log_record["request_id"] = request_id
            
        # Attach exception tracebacks if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        # Capture any extra dynamic kwargs added to the log call
        # e.g., logger.info("event occurred", extra={"custom_field": "val"})
        custom_fields = getattr(record, "custom_fields", None)
        if isinstance(custom_fields, dict):
            log_record.update(custom_fields)
            
        return json.dumps(log_record)

def setup_logging(log_level: str = "INFO", service_name: str = "tender_backend") -> None:
    """
    Applies JSON formatting to the root logger.
    """
    root_logger = logging.getLogger()
    
    # Remove default handlers to prevent double logging
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter(service_name=service_name))
    
    root_logger.addHandler(handler)
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)
    
    # Set levels for third party logs
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a logger with the given name.
    """
    return logging.getLogger(name)
