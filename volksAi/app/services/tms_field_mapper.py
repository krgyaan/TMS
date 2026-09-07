"""
TMS Field Mapper — Pure synchronous mapping function converting Python-native
infosheet extraction fields into TMS DTO-compliant output (matching Zod schemas).

Reference: TMS TenderInfoSheetPayloadSchema (info-sheet.dto.ts)
"""

import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Normalization Mappings & Constants
# ─────────────────────────────────────────────────────────────────────────────

EMD_MODE_NORMALIZATION: Dict[str, str] = {
    "BG": "Bank Guarantee",
    "DD": "Demand Draft",
    "BT": "Bank Transfer",
    "SB": "Surety Bond",
    "FDR": "Fixed Deposit",
    "FD": "Fixed Deposit",
    "NEFT": "Bank Transfer",
    "RTGS": "Bank Transfer",
    "ONLINE": "Bank Transfer",
    "ONLINE TRANSFER": "Bank Transfer",
    "BANK GUARANTEE": "Bank Guarantee",
    "DEMAND DRAFT": "Demand Draft",
    "BANK TRANSFER": "Bank Transfer",
    "SURETY BOND": "Surety Bond",
    "FIXED DEPOSIT": "Fixed Deposit",
    "INSURANCE SURETY BOND": "Insurance Surety Bond",
}

# Explicitly excluded prefix/keys per Phase 1 scope decision
EXCLUDED_PREFIXES = ("doc_", "schedule_", "readiness_")
EXCLUDED_EXACT_KEYS = {
    "consignee_address_display",
    "docket_slip_upload_display",
    "courier_provider_display",
    "courier_docket_display",
    "courier_delivery_time_display",
    "mse_preference_display",
    "mii_preference_display",
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


def _normalize_emd_modes(val: Any) -> Optional[List[str]]:
    """
    Splits on '/' and normalizes:
    BG -> Bank Guarantee, DD -> Demand Draft, BT -> Bank Transfer,
    SB -> Surety Bond, FDR -> Fixed Deposit.
    """
    raw_modes = _parse_modes(val, delimiters=r"[/,]+")
    if not raw_modes:
        return None

    normalized = []
    for mode in raw_modes:
        key = mode.upper().strip()
        norm_val = EMD_MODE_NORMALIZATION.get(key, mode)
        if norm_val not in normalized:
            normalized.append(norm_val)
    return normalized or None


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
    'No'/'NA' -> 'NO'
    """
    if _is_empty(val):
        return "NO"
    s = str(val).strip().upper()
    if "PROJECT" in s and "YES" in s:
        return "YES_PROJECT_SPECIFIC"
    if "YES" in s:
        return "YES_GENERAL"
    return "NO"


def _map_turnover_type(val: Any, val_amount: Optional[float] = None) -> Optional[str]:
    """
    Maps:
    'Not Applicable' / 'Exempt' -> 'NOT_APPLICABLE'
    'Positive' -> 'POSITIVE'
    numeric / 'Amount' -> 'AMOUNT'
    """
    if val is None:
        if val_amount is not None and val_amount > 0:
            return "AMOUNT"
        return None
    s = str(val).strip().upper()
    if not s or s in ("NOT FOUND", "NIL", "-", "--") or "MISSING" in s or "⚠️" in s:
        if val_amount is not None and val_amount > 0:
            return "AMOUNT"
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
        exp_years = raw.get("age_in_yrs")
    tech_eligibility_age = _parse_int(exp_years)

    # Turnover values
    turnover_val = _parse_float(raw.get("avg_annual_turnover_value_display"))
    turnover_type = _map_turnover_type(raw.get("avg_annual_turnover_type_display"), turnover_val)

    dto: Dict[str, Any] = {
        # Processing Fee
        "processingFeeAmount": _parse_float(raw.get("processing_fee_amount_display")),
        "processingFeeModes": _parse_modes(raw.get("processing_fee_mode_display")),

        # Tender Fee
        "tenderFeeAmount": _parse_float(raw.get("tender_fee_amount_display")),
        "tenderFeeModes": _parse_modes(raw.get("tender_fee_mode_display"), delimiters=r"[/]+"),

        # EMD
        "emdAmount": _parse_float(raw.get("emd_amount_display")),
        "emdRequired": _map_emd_required(raw.get("emd_required_display")),
        "emdModes": _normalize_emd_modes(raw.get("emd_mode_display")),

        # Tender Value
        "tenderValue": _parse_float(raw.get("tender_value_display")),

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
        "pbgMode": _parse_modes(raw.get("pbg_mode_display")),
        "pbgPercentage": _parse_percentage_float(raw.get("pbg_percentage_display")),
        "pbgDurationMonths": _parse_int(raw.get("pbg_duration_display")),

        # Security Deposit
        "sdMode": _parse_modes(raw.get("sd_mode_display")),
        "sdPercentage": _parse_percentage_float(raw.get("sd_percentage_display")),
        "sdDurationMonths": _parse_int(raw.get("sd_duration_display")),

        # LD (Liquidated Damages)
        "ldPercentagePerWeek": _parse_percentage_float(raw.get("ld_percentage_display")),
        "maxLdPercentage": _parse_percentage_float(raw.get("max_ld_percentage_display")),

        # Physical Documents
        "physicalDocsRequired": _map_yes_no(raw.get("physical_docs_required_display")),
        "physicalDocsDeadline": _parse_physical_docs_deadline(raw.get("physical_docs_deadline_display"), raw),

        # Technical Work Orders & Financial
        "orderValue1": _parse_float(raw.get("order_value_1_display")),
        "orderValue2": _parse_float(raw.get("order_value_2_display")),
        "orderValue3": _parse_float(raw.get("order_value_3_display")),

        "avgAnnualTurnoverType": turnover_type,
        "avgAnnualTurnoverValue": turnover_val,

        "workingCapitalType": _map_criteria_type(raw.get("working_capital_type_display")),
        "workingCapitalValue": _parse_float(raw.get("working_capital_value_display")),

        "netWorthType": _map_criteria_type(raw.get("net_worth_type_display")),
        "netWorthValue": _parse_float(raw.get("net_worth_value_display")),

        "solvencyCertificateType": _map_criteria_type(raw.get("solvency_certificate_type_display")),
        "solvencyCertificateValue": _parse_float(raw.get("solvency_certificate_value_display")),

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
