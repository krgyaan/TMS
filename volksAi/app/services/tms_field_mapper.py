"""
TMS Field Mapper — Pure synchronous mapping function converting Python-native
infosheet extraction fields into TMS DTO-compliant output (matching Zod schemas).

Reference: TMS TenderInfoSheetPayloadSchema (info-sheet.dto.ts)
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Centralized Declarative Normalization Tables
# ─────────────────────────────────────────────────────────────────────────────

# 1. PBG Mode & SD Mode (Literally identical option set: DD, FDR, PBG, SB)
PAYMENT_INSTRUMENT_FULL_MAPPING: Dict[str, str] = {
    # PBG
    "PBG": "PBG",
    "BG": "PBG",
    "BANK GUARANTEE": "PBG",
    "PERFORMANCE BANK GUARANTEE": "PBG",
    "PERFORMANCE GUARANTEE": "PBG",
    "CPBG": "PBG",
    "CPS": "PBG",
    "E-PBG": "PBG",
    "E-BG": "PBG",
    "EPBG": "PBG",
    # DD
    "DD": "DD",
    "DEMAND DRAFT": "DD",
    "DEDUCTION": "DD",
    "DD/DEDUCTION": "DD",
    "BANKERS CHEQUE": "DD",
    "BANKER'S CHEQUE": "DD",
    "PAY ORDER": "DD",
    # FDR
    "FDR": "FDR",
    "FD": "FDR",
    "FIXED DEPOSIT": "FDR",
    "FIXED DEPOSIT RECEIPT": "FDR",
    "TERM DEPOSIT": "FDR",
    # SB
    "SB": "SB",
    "SURETY BOND": "SB",
    "INSURANCE SURETY BOND": "SB",
    "SURETY BONDS": "SB",
    "INSURANCE BOND": "SB",
}

# 2. EMD Mode (Options: BG, DD, BANK_TRANSFER, FDR, SB, PORTAL)
PAYMENT_INSTRUMENT_SHORT_MAPPING: Dict[str, str] = {
    # BG
    "BG": "BG",
    "BANK GUARANTEE": "BG",
    "E-BG": "BG",
    "PBG": "BG",
    # DD
    "DD": "DD",
    "DEMAND DRAFT": "DD",
    "BANKERS CHEQUE": "DD",
    "BANKER'S CHEQUE": "DD",
    "PAY ORDER": "DD",
    # BANK_TRANSFER
    "BANK_TRANSFER": "BANK_TRANSFER",
    "BANK TRANSFER": "BANK_TRANSFER",
    "BT": "BANK_TRANSFER",
    "NEFT": "BANK_TRANSFER",
    "RTGS": "BANK_TRANSFER",
    "IMPS": "BANK_TRANSFER",
    "ONLINE TRANSFER": "BANK_TRANSFER",
    "WIRE TRANSFER": "BANK_TRANSFER",
    "ONLINE BANKING": "BANK_TRANSFER",
    "ONLINE PAYMENT": "BANK_TRANSFER",
    "ONLINE": "BANK_TRANSFER",
    "TRANSFER": "BANK_TRANSFER",
    # FDR
    "FDR": "FDR",
    "FD": "FDR",
    "FIXED DEPOSIT": "FDR",
    "FIXED DEPOSIT RECEIPT": "FDR",
    "TERM DEPOSIT": "FDR",
    # SB
    "SB": "SB",
    "SURETY BOND": "SB",
    "INSURANCE SURETY BOND": "SB",
    "SURETY BONDS": "SB",
    # PORTAL
    "PORTAL": "PORTAL",
    "PAY ON PORTAL": "PORTAL",
    "PAYMENT ON PORTAL": "PORTAL",
    "PAYMENT GATEWAY": "PORTAL",
    "GEM PORTAL": "PORTAL",
    "PORTAL PAYMENT": "PORTAL",
}

# 3. Tender Fee & Processing Fee Modes (Literally identical option set: DD, PORTAL, BANK_TRANSFER)
FEE_MODE_MAPPING: Dict[str, str] = {
    # DD
    "DD": "DD",
    "DEMAND DRAFT": "DD",
    "BANKERS CHEQUE": "DD",
    "BANKER'S CHEQUE": "DD",
    "PAY ORDER": "DD",
    # PORTAL
    "PORTAL": "PORTAL",
    "PAY ON PORTAL": "PORTAL",
    "PAYMENT ON PORTAL": "PORTAL",
    "PAYMENT GATEWAY": "PORTAL",
    "GEM PORTAL": "PORTAL",
    "PORTAL PAYMENT": "PORTAL",
    # BANK_TRANSFER
    "BANK_TRANSFER": "BANK_TRANSFER",
    "BANK TRANSFER": "BANK_TRANSFER",
    "BT": "BANK_TRANSFER",
    "NEFT": "BANK_TRANSFER",
    "RTGS": "BANK_TRANSFER",
    "IMPS": "BANK_TRANSFER",
    "ONLINE TRANSFER": "BANK_TRANSFER",
    "ONLINE": "BANK_TRANSFER",
    "WIRE TRANSFER": "BANK_TRANSFER",
    "ONLINE BANKING": "BANK_TRANSFER",
    "ONLINE PAYMENT": "BANK_TRANSFER",
}

# 4. Financial Criteria (Avg Annual Turnover & Solvency Certificate share: NOT_APPLICABLE, AMOUNT)
FINANCIAL_CRITERIA_MAPPING: Dict[str, str] = {
    "NOT_APPLICABLE": "NOT_APPLICABLE",
    "NOT APPLICABLE": "NOT_APPLICABLE",
    "EXEMPT": "NOT_APPLICABLE",
    "EXEMPTED": "NOT_APPLICABLE",
    "NA": "NOT_APPLICABLE",
    "N/A": "NOT_APPLICABLE",
    "NIL": "NOT_APPLICABLE",
    "NONE": "NOT_APPLICABLE",
    "NO": "NOT_APPLICABLE",
    "AMOUNT": "AMOUNT",
    "POSITIVE": "AMOUNT",
    "VALUE": "AMOUNT",
    "YES": "AMOUNT",
    "APPLICABLE": "AMOUNT",
    "REQUIRED": "AMOUNT",
}

# 5. MAF Required (Options: YES_GENERAL, YES_PROJECT_SPECIFIC, NO)
MAF_REQUIRED_MAPPING: Dict[str, str] = {
    "YES_PROJECT_SPECIFIC": "YES_PROJECT_SPECIFIC",
    "YES - PROJECT SPECIFIC": "YES_PROJECT_SPECIFIC",
    "YES — PROJECT SPECIFIC": "YES_PROJECT_SPECIFIC",
    "PROJECT SPECIFIC": "YES_PROJECT_SPECIFIC",
    "PROJECT-SPECIFIC": "YES_PROJECT_SPECIFIC",
    "YES (PROJECT SPECIFIC)": "YES_PROJECT_SPECIFIC",
    "YES_GENERAL": "YES_GENERAL",
    "YES": "YES_GENERAL",
    "TRUE": "YES_GENERAL",
    "REQUIRED": "YES_GENERAL",
    "APPLICABLE": "YES_GENERAL",
    "YES - GENERAL": "YES_GENERAL",
    "YES — GENERAL": "YES_GENERAL",
    "NO": "NO",
    "FALSE": "NO",
    "NOT REQUIRED": "NO",
    "NOT APPLICABLE": "NO",
}

# 6. Physical Document Type (Options: ONLY_EMD, ONLY_OTHER_DOCUMENT, EMD_AND_OTHER_DOCUMENTS)
PHYSICAL_DOC_TYPE_MAPPING: Dict[str, str] = {
    "ONLY_EMD": "ONLY_EMD",
    "ONLY EMD": "ONLY_EMD",
    "EMD ONLY": "ONLY_EMD",
    "ONLY_OTHER_DOCUMENT": "ONLY_OTHER_DOCUMENT",
    "ONLY OTHER DOCUMENT": "ONLY_OTHER_DOCUMENT",
    "ONLY OTHER DOCUMENTS": "ONLY_OTHER_DOCUMENT",
    "OTHER DOCUMENTS ONLY": "ONLY_OTHER_DOCUMENT",
    "OTHER DOCUMENT ONLY": "ONLY_OTHER_DOCUMENT",
    "EMD_AND_OTHER_DOCUMENTS": "EMD_AND_OTHER_DOCUMENTS",
    "EMD + OTHER DOCUMENTS": "EMD_AND_OTHER_DOCUMENTS",
    "EMD AND OTHER DOCUMENTS": "EMD_AND_OTHER_DOCUMENTS",
    "BOTH": "EMD_AND_OTHER_DOCUMENTS",
}

# Master registry mapping field names to their declarative mapping table
FIELD_MAPPING_REGISTRY: Dict[str, Dict[str, str]] = {
    "pbgMode": PAYMENT_INSTRUMENT_FULL_MAPPING,
    "sdMode": PAYMENT_INSTRUMENT_FULL_MAPPING,
    "emdModes": PAYMENT_INSTRUMENT_SHORT_MAPPING,
    "tenderFeeModes": FEE_MODE_MAPPING,
    "processingFeeModes": FEE_MODE_MAPPING,
    "avgAnnualTurnoverType": FINANCIAL_CRITERIA_MAPPING,
    "solvencyCertificateType": FINANCIAL_CRITERIA_MAPPING,
    "mafRequired": MAF_REQUIRED_MAPPING,
    "physicalDocType": PHYSICAL_DOC_TYPE_MAPPING,
}

# Legacy alias for backward compatibility
EMD_MODE_NORMALIZATION = PAYMENT_INSTRUMENT_SHORT_MAPPING

# Explicitly excluded prefix/keys per Phase 1 scope decision
EXCLUDED_PREFIXES = ("schedule_",)
EXCLUDED_EXACT_KEYS = {
    "consignee_address_display",
    "docket_slip_upload_display",
    "courier_provider_display",
    "courier_docket_display",
    "courier_delivery_time_display",
    "mse_preference_display",
    "startup_preference_display",
    "reserved_for_mse_display",
}


# ─────────────────────────────────────────────────────────────────────────────
# Parsing & Conversion Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _is_empty(val: Any) -> bool:
    """Checks if value is None, empty string, or an NA/MISSING placeholder."""
    if val is None:
        return True
    if isinstance(val, (int, float, bool)):
        return False
    s = str(val).strip()
    if not s:
        return True
    s_lower = s.lower()
    if s_lower in ("na", "n/a", "not found", "not applicable", "nil", "none", "null", "-", "--"):
        return True
    if "missing" in s_lower or "⚠️" in s:
        return True
    return False


def _parse_float(val: Any) -> Optional[float]:
    """Strips currency symbols (₹, Rs., $), commas, parses numeric float."""
    if _is_empty(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    # Strip ₹, Rs., Rs, $, commas
    s_clean = re.sub(r"[₹$]|Rs\.?|INR", "", s, flags=re.IGNORECASE).replace(",", "").strip()

    # Handle Lakh / Crore multipliers if present
    multiplier = 1.0
    if re.search(r"\b(?:lakh|lac)s?\b", s_clean, re.IGNORECASE):
        multiplier = 100000.0
        s_clean = re.sub(r"\b(?:lakh|lac)s?\b", "", s_clean, flags=re.IGNORECASE).strip()
    elif re.search(r"\b(?:crore|cr)s?\b", s_clean, re.IGNORECASE):
        multiplier = 10000000.0
        s_clean = re.sub(r"\b(?:crore|cr)s?\b", "", s_clean, flags=re.IGNORECASE).strip()

    m = re.search(r"[-+]?\d*\.?\d+", s_clean)
    if not m:
        return None
    try:
        return round(float(m.group(0)) * multiplier, 2)
    except (ValueError, TypeError):
        return None


def _parse_int(val: Any) -> Optional[int]:
    """Extracts first integer via regex \\d+."""
    if _is_empty(val):
        return None
    if isinstance(val, int):
        return val
    if isinstance(val, float):
        return int(val)
    m = re.search(r"\d+", str(val))
    if not m:
        return None
    try:
        return int(m.group(0))
    except (ValueError, TypeError):
        return None


def _parse_percentage_float(val: Any) -> Optional[float]:
    """Strips %, commas, parses float."""
    if _is_empty(val):
        return None
    s = str(val).replace("%", "").replace(",", "").strip()
    m = re.search(r"[-+]?\d*\.?\d+", s)
    if not m:
        return None
    try:
        return float(m.group(0))
    except (ValueError, TypeError):
        return None


def _parse_percentage_int(val: Any) -> Optional[int]:
    """Strips %, parses integer clamped between 0 and 100."""
    if _is_empty(val):
        return None
    s = str(val).replace("%", "").strip()
    m = re.search(r"\d+", s)
    if not m:
        return None
    try:
        v = int(m.group(0))
        return max(0, min(100, v))
    except (ValueError, TypeError):
        return None


def _parse_modes(val: Any, delimiters: str = r"[/,]+") -> Optional[List[str]]:
    """Splits string on '/' or ',', trims items, and filters out NA/empty."""
    if _is_empty(val):
        return None
    if isinstance(val, list):
        items = [str(x).strip() for x in val if not _is_empty(x)]
        return items or None

    parts = re.split(delimiters, str(val))
    result = []
    for p in parts:
        cleaned = p.strip()
        if cleaned and not _is_empty(cleaned):
            result.append(cleaned)
    return result or None


def normalize_enum_value(
    raw_val: Any,
    mapping_table: Dict[str, str],
    field_name: str,
) -> Optional[str]:
    """
    Normalizes a single raw value against a declarative mapping table.
    Looks up case-insensitively and trimmed.
    Logs a warning if an unrecognized/novel value is encountered and returns None (unselected).
    """
    if _is_empty(raw_val):
        return None
    s = str(raw_val).strip()
    key = s.upper()

    # Direct match in table
    if key in mapping_table:
        return mapping_table[key]

    # Partial / substring match against known keys (longest key first)
    for pattern in sorted(mapping_table.keys(), key=len, reverse=True):
        if pattern in key or (len(key) >= 4 and key in pattern):
            return mapping_table[pattern]

    # Truly novel / unrecognized value: log warning and leave unselected per policy
    logger.warning(
        f"[ENUM_NORMALIZER] Unmapped novel value '{s}' for field '{field_name}'. "
        f"Leaving field unselected / missing per policy."
    )
    return None


def normalize_enum_list(
    raw_val: Any,
    mapping_table: Dict[str, str],
    field_name: str,
    delimiters: str = r"[/,]+",
) -> Optional[List[str]]:
    """
    Splits string on delimiters (or handles list of strings),
    runs each item through normalize_enum_value,
    deduplicates preserving order,
    and returns list of valid enum codes or None if empty.
    """
    raw_items = _parse_modes(raw_val, delimiters=delimiters)
    if not raw_items:
        return None

    normalized: List[str] = []
    for item in raw_items:
        code = normalize_enum_value(item, mapping_table, field_name)
        if code and code not in normalized:
            normalized.append(code)

    return normalized or None


def _normalize_emd_modes(val: Any) -> Optional[List[str]]:
    """Legacy helper delegating to centralized normalize_enum_list."""
    return normalize_enum_list(val, PAYMENT_INSTRUMENT_SHORT_MAPPING, "emdModes")


def _map_commercial_evaluation(val: Any) -> Optional[str]:
    """
    Maps free text to TMS enum:
    ITEM_WISE_GST_INCLUSIVE | ITEM_WISE_PRE_GST | OVERALL_GST_INCLUSIVE | OVERALL_PRE_GST
    """
    if _is_empty(val):
        return None
    s = str(val).strip().upper()
    is_pre = "PRE" in s or "EXCL" in s or "WITHOUT" in s

    if "ITEM" in s:
        return "ITEM_WISE_PRE_GST" if is_pre else "ITEM_WISE_GST_INCLUSIVE"
    if "OVERALL" in s or "TOTAL" in s or "L1" in s or "L-1" in s:
        return "OVERALL_PRE_GST" if is_pre else "OVERALL_GST_INCLUSIVE"

    # Direct enum match fallback
    if s in ("ITEM_WISE_GST_INCLUSIVE", "ITEM_WISE_PRE_GST", "OVERALL_GST_INCLUSIVE", "OVERALL_PRE_GST"):
        return s
    return None


def _map_yes_no(val: Any) -> Optional[str]:
    """Maps Yes -> 'YES', No/NA -> 'NO'."""
    if _is_empty(val):
        return "NO"
    s = str(val).strip().upper()
    if "YES" in s:
        return "YES"
    return "NO"


def _map_yes_no_or_none(val: Any) -> Optional[str]:
    """Maps truthy/yes -> 'YES', falsey/no -> 'NO', empty/not specified -> None."""
    if _is_empty(val):
        return None
    s = str(val).strip().upper()
    if s in ("NOT SPECIFIED", "NA", "N/A", "NONE", "NOT FOUND"):
        return None
    if s.startswith("NO"):
        return "NO"
    if s.startswith("YES"):
        return "YES"
    if "YES" in s or "MANDATORY" in s:
        return "YES"
    if "NO" in s:
        return "NO"
    return None


def _map_emd_required(val: Any) -> Optional[str]:
    """Maps Yes -> 'YES', No -> 'NO', Exempt -> 'EXEMPT'."""
    if _is_empty(val):
        return None
    s = str(val).strip().upper()
    if "EXEMPT" in s:
        return "EXEMPT"
    if "YES" in s:
        return "YES"
    if "NO" in s:
        return "NO"
    return None


def _map_maf_required(val: Any) -> Optional[str]:
    """
    Maps:
    'Yes - Project Specific' -> 'YES_PROJECT_SPECIFIC'
    'Yes' -> 'YES_GENERAL'
    'No' -> 'NO'
    NA/None/empty -> None (missing)
    """
    if _is_empty(val):
        return None
    s = str(val).strip().upper()
    if s in ("NA", "NOT FOUND", "NONE"):
        return None
    if "PROJECT" in s and "YES" in s:
        return "YES_PROJECT_SPECIFIC"
    if "YES" in s:
        return "YES_GENERAL"
    if "NO" in s or "FALSE" in s:
        return "NO"
    return None


def _map_turnover_type(val: Any) -> Optional[str]:
    """
    Maps:
    'Not Applicable' / 'Exempt' -> 'NOT_APPLICABLE'
    'Positive' -> 'POSITIVE'
    numeric / 'Amount' -> 'AMOUNT'
    
    Strict Non-Destructive Design: If the type string is empty/missing, returns
    None (null) without auto-inferring 'AMOUNT', preserving reviewer transparency
    so the Tender Executive (TE) can explicitly confirm the requirement during review.
    """
    if val is None:
        return None
    s = str(val).strip().upper()
    if not s or s in ("NOT FOUND", "NIL", "-", "--") or "MISSING" in s or "⚠️" in s:
        return None
    if "EXEMPT" in s or "NOT APPLICABLE" in s or s in ("NA", "N/A"):
        return "NOT_APPLICABLE"
    if "POSITIVE" in s:
        return "POSITIVE"
    if "AMOUNT" in s or re.search(r"\d", s):
        return "AMOUNT"
    return None


def _map_criteria_type(val: Any) -> Optional[str]:
    """Maps criteria to NOT_APPLICABLE | POSITIVE | AMOUNT."""
    if val is None:
        return None
    s = str(val).strip().upper()
    if not s or s in ("NOT FOUND", "NIL", "-", "--") or "MISSING" in s or "⚠️" in s:
        return None
    if "NOT APPLICABLE" in s or s in ("NA", "N/A"):
        return "NOT_APPLICABLE"
    if "POSITIVE" in s:
        return "POSITIVE"
    if "AMOUNT" in s or re.search(r"\d", s):
        return "AMOUNT"
    return None


def _validate_email(val: Any) -> Optional[str]:
    """Validates email format; returns cleaned string or None."""
    if _is_empty(val):
        return None
    s = str(val).strip()
    if re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", s):
        return s
    return None


def _parse_physical_docs_deadline(deadline_str: Any, raw: Dict[str, Any]) -> Optional[str]:
    """
    Converts relative deadline string (e.g. 'Within 7 days of Bid Due Date')
    or absolute date into an ISO date string.
    """
    if _is_empty(deadline_str):
        return None

    s = str(deadline_str).strip()

    # Case 1: Relative offset (e.g. 'Within 7 days of Bid Due Date')
    if "within" in s.lower() or "day" in s.lower():
        days_match = re.search(r"\d+", s)
        offset_days = int(days_match.group(0)) if days_match else 7

        base_date_val = (
            raw.get("bid_due_date_time")
            or raw.get("bid_submission_end_date")
            or raw.get("bid_end_datetime")
            or raw.get("bid_due_date")
        )
        if not _is_empty(base_date_val):
            base_str = str(base_date_val).strip()
            for fmt in (
                "%d-%m-%Y %H:%M:%S",
                "%d-%m-%Y",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d",
                "%d/%m/%Y %H:%M:%S",
                "%d/%m/%Y",
            ):
                try:
                    dt = datetime.strptime(base_str, fmt)
                    absolute_dt = dt + timedelta(days=offset_days)
                    return absolute_dt.isoformat()
                except ValueError:
                    continue

        return None

    # Case 2: Already an absolute date string
    for fmt in (
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
    ):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.isoformat()
        except ValueError:
            continue

    # Try ISO direct parse
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.isoformat()
    except Exception:
        return None


def _extract_clients(raw: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    """
    Groups client_name_1/2/3, client_email_1/2/3, client_phone_1/2/3 into
    TMS clients array: [{ clientName, clientEmail, clientMobile }, ...]
    Skips any slot where clientName is empty/missing.
    """
    clients: List[Dict[str, Optional[str]]] = []
    for i in (1, 2, 3):
        name_key = f"client_name_{i}_display"
        email_key = f"client_email_{i}_display"
        phone_key = f"client_phone_{i}_display"

        name_val = raw.get(name_key)
        if _is_empty(name_val):
            continue

        email_val = _validate_email(raw.get(email_key))
        phone_val = raw.get(phone_key)
        mobile_val = None if _is_empty(phone_val) else str(phone_val).strip()

        clients.append({
            "clientName": str(name_val).strip(),
            "clientEmail": email_val,
            "clientMobile": mobile_val,
        })
    return clients


# ─────────────────────────────────────────────────────────────────────────────
# Main Mapping Function
# ─────────────────────────────────────────────────────────────────────────────

def map_to_tms_dto(raw_infosheet_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pure synchronous function converting Python-native infosheet extraction fields
    into TMS DTO-shaped dictionary matching TMS Zod schemas.

    Parameters:
        raw_infosheet_data (dict): Raw dictionary from infosheet generation.

    Returns:
        dict: TMS DTO payload.
    """
    raw = raw_infosheet_data or {}

    # Delivery time installation & inclusive flag
    inst_del_raw = raw.get("delivery_time_installation_display")
    if inst_del_raw and "inclusive" in str(inst_del_raw).lower():
        delivery_time_installation_days = None
        delivery_time_installation_inclusive = True
    else:
        delivery_time_installation_days = _parse_int(inst_del_raw)
        inc_flag_raw = raw.get("installation_inclusive_display")
        delivery_time_installation_inclusive = (
            True if (inc_flag_raw and str(inc_flag_raw).strip().lower() == "yes") else False
        )

    # String arrays for documents
    po_docs = _parse_modes(raw.get("po_selected_documents_display"), delimiters=r"[,;\n]+")
    comm_docs = _parse_modes(raw.get("commercial_eligibility_documents_display"), delimiters=r"[,;\n]+")

    # Experience years / tech eligibility age
    exp_years = raw.get("experience_years_display")
    if _is_empty(exp_years):
        exp_years = raw.get("eligibility_criterion_years_display")
    if _is_empty(exp_years):
        exp_years = raw.get("age_in_yrs")
    tech_eligibility_age = _parse_int(exp_years)

    # Turnover values: when turnover type is NOT_APPLICABLE, requirement is not applicable -> None
    turnover_type = _map_turnover_type(raw.get("avg_annual_turnover_type_display"))
    turnover_val = None if turnover_type == "NOT_APPLICABLE" else _parse_float(raw.get("avg_annual_turnover_value_display"))

    # Working capital, net worth, and solvency certificate: None when NOT_APPLICABLE
    wc_type = _map_criteria_type(raw.get("working_capital_type_display"))
    wc_val = None if wc_type == "NOT_APPLICABLE" else _parse_float(raw.get("working_capital_value_display"))

    nw_type = _map_criteria_type(raw.get("net_worth_type_display"))
    nw_val = None if nw_type == "NOT_APPLICABLE" else _parse_float(raw.get("net_worth_value_display"))

    solv_type = _map_criteria_type(raw.get("solvency_certificate_type_display"))
    solv_val = None if solv_type == "NOT_APPLICABLE" else _parse_float(raw.get("solvency_certificate_value_display"))

    # Processing Fee: None when mode is empty/NA and amount is 0 or absent
    proc_modes = _parse_modes(raw.get("processing_fee_mode_display"))
    raw_proc_amt = _parse_float(raw.get("processing_fee_amount_display"))
    proc_amount = None if (proc_modes is None and (raw_proc_amt is None or raw_proc_amt <= 0)) else raw_proc_amt

    # Tender Fee: None when mode is empty/NA and amount is 0 or absent
    tender_fee_modes = _parse_modes(raw.get("tender_fee_mode_display"), delimiters=r"[/]+")
    raw_tender_fee_amt = _parse_float(raw.get("tender_fee_amount_display"))
    tender_fee_amount = None if (tender_fee_modes is None and (raw_tender_fee_amt is None or raw_tender_fee_amt <= 0)) else raw_tender_fee_amt

    # Tender value: a tender worth <= 0 is invalid/non-existent and must map to None
    raw_tender_val = _parse_float(raw.get("tender_value_display"))
    tender_value = raw_tender_val if (raw_tender_val is not None and raw_tender_val > 0) else None

    dto: Dict[str, Any] = {
        # Processing Fee
        "processingFeeAmount": proc_amount,
        "processingFeeModes": proc_modes,

        # Tender Fee
        "tenderFeeAmount": tender_fee_amount,
        "tenderFeeModes": tender_fee_modes,

        # EMD
        "emdAmount": _parse_float(raw.get("emd_amount_display")),
        "emdRequired": _map_emd_required(raw.get("emd_required_display")),
        "emdModes": normalize_enum_list(raw.get("emd_mode_display"), PAYMENT_INSTRUMENT_SHORT_MAPPING, "emdModes"),

        # Tender Value
        "tenderValue": tender_value,

        # Terms & Evaluation
        "bidValidityDays": _parse_int(raw.get("bid_validity_days_display")),
        "commercialEvaluation": _map_commercial_evaluation(raw.get("commercial_evaluation_display")),
        "reverseAuctionApplicable": _map_yes_no(raw.get("reverse_auction_applicable_display")),
        "mafRequired": _map_maf_required(raw.get("maf_required_display")),

        # Delivery Time
        "deliveryTimeSupply": _parse_int(raw.get("delivery_time_supply_display")),
        "deliveryTimeInstallationDays": delivery_time_installation_days,
        "deliveryTimeInstallationInclusive": delivery_time_installation_inclusive,

        # Payment Terms
        "paymentTermsSupply": _parse_percentage_int(raw.get("payment_terms_supply_display")),
        "paymentTermsInstallation": _parse_percentage_int(raw.get("payment_terms_installation_display")),

        # PBG
        "pbgRequired": _map_yes_no(raw.get("pbg_required_display")),
        "pbgMode": normalize_enum_list(raw.get("pbg_mode_display"), PAYMENT_INSTRUMENT_FULL_MAPPING, "pbgMode"),
        "pbgPercentage": _parse_percentage_float(raw.get("pbg_percentage_display")),
        "pbgDurationMonths": _parse_int(raw.get("pbg_duration_display")),

        # Security Deposit
        "sdMode": normalize_enum_list(raw.get("sd_mode_display"), PAYMENT_INSTRUMENT_FULL_MAPPING, "sdMode"),
        "sdPercentage": _parse_percentage_float(raw.get("sd_percentage_display")),
        "sdDurationMonths": _parse_int(raw.get("sd_duration_display")),

        # LD (Liquidated Damages)
        "ldPercentagePerWeek": _parse_percentage_float(raw.get("ld_percentage_display")),
        "maxLdPercentage": _parse_percentage_float(raw.get("max_ld_percentage_display")),

        # Physical Documents
        "physicalDocsRequired": _map_yes_no(raw.get("physical_docs_required_display")),
        "physicalDocsDeadline": _parse_physical_docs_deadline(raw.get("physical_docs_deadline_display"), raw),

        # Before-Bidding Requirements
        # Pre-Bid Meeting (single composed free-text string; "N/A"/"NA" sentinels -> None)
        "preBidMeeting": None if _is_empty(raw.get("pre_bid_meeting_display")) or str(raw.get("pre_bid_meeting_display")).strip().lower() in ("na", "n/a", "none", "none specified / no pre-bid meeting scheduled") else str(raw.get("pre_bid_meeting_display")).strip(),

        # Site Visit / Survey
        "siteVisit": None if _is_empty(raw.get("site_visit_display") or raw.get("readiness_site_visit_display")) or str(raw.get("site_visit_display") or raw.get("readiness_site_visit_display")).strip().lower() in ("not specified", "na", "n/a", "none") else str(raw.get("site_visit_display") or raw.get("readiness_site_visit_display")).strip(),
        "siteVisitRequired": _map_yes_no_or_none(raw.get("site_visit_display") or raw.get("readiness_site_visit_display")),

        # Sample Submission / Testing
        "sampleSubmission": None if _is_empty(raw.get("sample_submission_display")) or str(raw.get("sample_submission_display")).strip().lower() in ("not specified", "na", "n/a", "none") else str(raw.get("sample_submission_display")).strip(),
        "sampleSubmissionRequired": _map_yes_no_or_none(raw.get("sample_submission_display")),

        # Make in India (MII) Preference
        "miiPreference": None if _is_empty(raw.get("mii_preference_display")) or str(raw.get("mii_preference_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("mii_preference_display")).strip(),
        "miiRequired": _map_yes_no_or_none(raw.get("mii_preference_display")),

        # Required Documents from Seller
        "requiredDocuments": [
            str(raw[f"doc_{i}_display"]).strip()
            for i in range(1, 10)
            if not _is_empty(raw.get(f"doc_{i}_display")) and str(raw[f"doc_{i}_display"]).strip().lower() not in ("na", "n/a", "none", "nil", "not found")
        ] or None,
        "doc1": None if _is_empty(raw.get("doc_1_display")) or str(raw.get("doc_1_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_1_display")).strip(),
        "doc2": None if _is_empty(raw.get("doc_2_display")) or str(raw.get("doc_2_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_2_display")).strip(),
        "doc3": None if _is_empty(raw.get("doc_3_display")) or str(raw.get("doc_3_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_3_display")).strip(),
        "doc4": None if _is_empty(raw.get("doc_4_display")) or str(raw.get("doc_4_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_4_display")).strip(),
        "doc5": None if _is_empty(raw.get("doc_5_display")) or str(raw.get("doc_5_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_5_display")).strip(),
        "doc6": None if _is_empty(raw.get("doc_6_display")) or str(raw.get("doc_6_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_6_display")).strip(),
        "doc7": None if _is_empty(raw.get("doc_7_display")) or str(raw.get("doc_7_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_7_display")).strip(),
        "doc8": None if _is_empty(raw.get("doc_8_display")) or str(raw.get("doc_8_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_8_display")).strip(),
        "doc9": None if _is_empty(raw.get("doc_9_display")) or str(raw.get("doc_9_display")).strip().lower() in ("na", "n/a", "none") else str(raw.get("doc_9_display")).strip(),

        # Technical Work Orders & Financial
        "orderValue1": _parse_float(raw.get("order_value_1_display")),
        "orderValue2": _parse_float(raw.get("order_value_2_display")),
        "orderValue3": _parse_float(raw.get("order_value_3_display")),

        "avgAnnualTurnoverType": turnover_type,
        "avgAnnualTurnoverValue": turnover_val,

        "workingCapitalType": wc_type,
        "workingCapitalValue": wc_val,

        "netWorthType": nw_type,
        "netWorthValue": nw_val,

        "solvencyCertificateType": solv_type,
        "solvencyCertificateValue": solv_val,

        "customEligibilityCriteria": None if _is_empty(raw.get("custom_eligibility_criteria_display")) else str(raw.get("custom_eligibility_criteria_display")).strip(),
        "techEligibilityAge": tech_eligibility_age,

        # Selected Documents
        "technicalWorkOrders": po_docs,
        "commercialDocuments": comm_docs,

        # Contacts & Address
        "clients": _extract_clients(raw),
        "courierAddress": None if _is_empty(raw.get("courier_address_display")) else str(raw.get("courier_address_display")).strip(),
    }

    return dto
