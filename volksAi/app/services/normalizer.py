import re
from datetime import datetime
from typing import Optional, List, Any, Tuple

# Standard regex patterns
CURRENCY_CLEAN_RE = re.compile(r'[^\d\.]')
NUMBER_RE = re.compile(r'\b\d+\b')
FLOAT_RE = re.compile(r'\b\d+\.\d+|\b\d+\b')

DEFAULT_KNOWN_MODES = [
    "bg", "dd", "online", "rtgs", "neft", 
    "demand draft", "bank guarantee", "fdr", "fixed deposit"
]

def parse_money(val: Any) -> Optional[float]:
    """
    Cleans currency strings (e.g. Rs. 1,50,000/-) and extracts float value.
    Handles Lakh / Crore multipliers commonly found in Indian tenders.
    """
    if val is None or val == "Not Found" or val == "":
        return None
    val_str = str(val).lower().strip()
    
    multiplier = 1.0
    if re.search(r'\b(?:lakh|lakhs|lac|lacs)\b', val_str):
        multiplier = 100000.0
    elif re.search(r'\b(?:crore|crores|cr)\b', val_str):
        multiplier = 10000000.0
        
    # Remove standard prefix abbreviations and common OCR misreads (e.g. ks., re., *, F, E, rs., inr)
    val_str = re.sub(r'\b(?:rs|inr|re|ks|rupees|rupee)\b\.?[:\-]?\s*', '', val_str)
    val_str = re.sub(r'^[₹*FE]\s*', '', val_str)
    
    cleaned = CURRENCY_CLEAN_RE.sub("", val_str)
    if cleaned:
        cleaned = cleaned.strip('.')
        if cleaned:
            try:
                return float(cleaned) * multiplier
            except ValueError:
                pass
            
    m = re.search(r'\d+(\.\d+)?', val_str)
    if m:
        try:
            return float(m.group(0)) * multiplier
        except ValueError:
            pass
    return None

def parse_int(val: Any) -> Optional[int]:
    """
    Extracts the first valid integer from a string value.
    """
    if val is None or val == "Not Found" or val == "":
        return None
    val_str = str(val)
    m = NUMBER_RE.search(val_str)
    if m:
        try:
            return int(m.group(0))
        except ValueError:
            pass
    return None

def parse_float(val: Any) -> Optional[float]:
    """
    Extracts the first valid float from a string value.
    """
    if val is None or val == "Not Found" or val == "":
        return None
    val_str = str(val)
    m = FLOAT_RE.search(val_str)
    if m:
        try:
            return float(m.group(0))
        except ValueError:
            pass
    return None

def parse_yes_no(val: Optional[str], keywords: List[str]) -> str:
    """
    Returns 'Yes' if any of the keywords are present in the text value, else 'No'.
    """
    if not val:
        return "No"
    val_lower = val.lower()
    if any(kw.lower() in val_lower for kw in keywords):
        return "Yes"
    return "No"

def parse_bool(val: Any) -> Optional[bool]:
    """
    Parses boolean inputs safely, converting Yes/No/True/False to Python bool.
    """
    if val is None or val == "" or val == "Not Found":
        return None
    val_str = str(val).lower().strip()
    if val_str in ["yes", "true", "1", "y", "inclusive"]:
        return True
    if val_str in ["no", "false", "0", "n", "exclusive"]:
        return False
    return None

def parse_datetime(val: Any) -> Optional[datetime]:
    """
    Parses date or datetime strings into ISO-standard Python datetime objects.
    """
    if val is None or val == "Not Found" or val == "":
        return None
    val_str = str(val).strip()
    
    formats = [
        "%d/%m/%Y %I:%M %p",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y-%m-%dT%H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt)
        except ValueError:
            continue
            
    # Regex fallback for standard DD-MM-YYYY or DD/MM/YYYY
    date_match = re.search(r'\b(\d{2})[-/\.](\d{2})[-/\.](\d{4})\b', val_str)
    if date_match:
        try:
            day, month, year = map(int, date_match.groups())
            return datetime(year, month, day)
        except ValueError:
            pass
            
    return None

def normalize_text(val: Any) -> Optional[str]:
    """
    Cleans up redundant whitespaces, tab indents, and newlines from OCR text block.
    """
    if val is None or val == "Not Found" or val == "":
        return None
    val_str = str(val).strip()
    return re.sub(r'\s+', ' ', val_str)

def split_multi_value_field(val: Optional[str], known_modes: Optional[List[str]] = None) -> Optional[List[str]]:
    """
    Splits transactional sentences or comma-separated lists into an array of normalized uppercase modes.
    """
    if not val or val == "Not Found":
        return None
    
    if known_modes is None:
        known_modes = DEFAULT_KNOWN_MODES
        
    val_lower = val.lower()
    found_modes = []
    
    for mode in known_modes:
        # Match using word boundaries where applicable to prevent partial substring hits
        pattern = rf"\b{re.escape(mode.lower())}\b"
        if re.search(pattern, val_lower):
            normalized_mode = mode.upper()
            if normalized_mode == "DEMAND DRAFT":
                normalized_mode = "DD"
            elif normalized_mode == "BANK GUARANTEE":
                normalized_mode = "BG"
            if normalized_mode not in found_modes:
                found_modes.append(normalized_mode)
                
    return found_modes if found_modes else [val.strip()]

def parse_address_components(address: Optional[str]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Splits a full address string into line 1, line 2, and extracts the pincode.
    """
    if not address or address == "Not Found":
        return None, None, None
        
    parts = [p.strip() for p in address.split(",") if p.strip()]
    addr_line_1 = parts[0] if len(parts) >= 1 else None
    addr_line_2 = parts[1] if len(parts) >= 2 else None
    
    pin_match = re.search(r'\b\d{6}\b', address)
    pincode = pin_match.group(0) if pin_match else None
    
    return addr_line_1, addr_line_2, pincode

def detect_tender_type(criteria: Optional[str], guess: Optional[str]) -> str:
    """
    Classifies tender category based on keywords.
    """
    text_to_check = f"{criteria or ''} {guess or ''}".lower()
    if any(k in text_to_check for k in ["manpower", "service", "outsourcing", "consultancy"]):
        return "Service"
    if any(k in text_to_check for k in ["supply", "oem", "equipment", "goods", "hardware"]):
        return "Goods"
    return "Universal/Unknown"

def derive_presence_flag(val: Any) -> str:
    """
    Returns 'Yes' if a value exists and is not null/empty/not found/zero, else 'No'.
    """
    if val is None or val == "" or val == "Not Found" or val in (0, 0.0, "0", "0.0", "0.00", "₹0.00", "Nil", "NIL", "nil", "NA", "N/A", "None", "false", "False", False):
        return "No"
    return "Yes"
