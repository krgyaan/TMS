import json
import logging
import logging.handlers
import os
import sys
from datetime import datetime, timezone
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Dict

# ContextVar to hold the unique ID of the request during its lifecycle.
# This variable is thread/async-task-safe and context-local.
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="")

class JSONFormatter(logging.Formatter):
    """
    Custom formatter that transforms standard LogRecord structures into 
    standardized JSON strings for ingestion by Promtail and Loki.
    """
    def __init__(self, service_name: str = "volksAi"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        request_id = request_id_ctx_var.get()
        
        log_record: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self.service_name,
            "service_name": self.service_name,
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
        custom_fields = getattr(record, "custom_fields", None)
        if isinstance(custom_fields, dict):
            log_record.update(custom_fields)
            
        return json.dumps(log_record)

def setup_logging(log_level: str = "INFO", service_name: str = "volksAi") -> None:
    """
    Applies JSON formatting to the root logger with dual stdout and optional file logging.
    """
    root_logger = logging.getLogger()
    
    # Remove default handlers to prevent double logging
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        
    formatter = JSONFormatter(service_name=service_name)
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)
    root_logger.addHandler(stdout_handler)

    # Optional file logging if LOG_DIR is specified or standard /logs exists
    log_dir_str = os.getenv("LOG_DIR", "")
    if not log_dir_str and Path("/logs").is_dir():
        log_dir_str = "/logs"
    elif not log_dir_str and Path("../logs").is_dir():
        log_dir_str = "../logs"

    if log_dir_str:
        try:
            log_dir = Path(log_dir_str)
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / f"{service_name}.log"
            file_handler = logging.handlers.TimedRotatingFileHandler(
                filename=str(log_file),
                when="midnight",
                interval=1,
                backupCount=14,
                encoding="utf-8"
            )
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            sys.stderr.write(f"[WARNING] Could not initialize file logger in {log_dir_str}: {e}\n")
    
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)
    
    # Set levels for third party logs
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("paddle").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a logger with the given name.
    """
    return logging.getLogger(name)
