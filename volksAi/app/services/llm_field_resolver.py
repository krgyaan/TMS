"""
LLM Field Resolver — Anthropic Claude (claude-sonnet-5) for GAIL/GeM ATC parsing.

Architecture:
  Role 1: Missing-field fallback via schema-constrained Anthropic Tool Use
          Only invoked for fields still NA/Not Found after the Layer 1 regex pass.
  Role 2: Ambiguity resolution via scoped clause evaluation
          Runs on configured AMBIGUITY_PRONE_FIELDS to confirm or override Layer 1 candidates.
          Produces human-auditable sibling reasoning fields ({field}_reasoning).

Ground-truth anchor knowledge compiled from manual analysis of:
  - GAIL Rajahmundry NiCd (1) ATC
  - GGL Agra VRLA Batteries ATC (GEM/2026/B/7772525)
  - GAIL Jaipur AMC ATC
  - GAIL GCC-Goods Rev.1 (April 2022)
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set, Union
from dotenv import load_dotenv

# Automatically load .env and .env.dev from workspace roots
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env.dev")
load_dotenv(ROOT_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

# Model and pricing constants (Sonnet 5 standard pricing)
SONNET_MODEL_DEFAULT = "claude-sonnet-5"
SONNET_INPUT_PRICE_PER_M = 2.00    # $2.00 per million input tokens
SONNET_OUTPUT_PRICE_PER_M = 10.00  # $10.00 per million output tokens

# Path where few-shot examples accumulate across all parsed documents
_MEMORY_DIR = Path(__file__).parent.parent / "storage" / "llm_memory"
_MEMORY_FILE = _MEMORY_DIR / "extraction_memory.json"
_MEMORY_MAX_EXAMPLES_PER_FIELD = int(os.getenv("LLM_MAX_EXAMPLES_PER_FIELD", "5"))

# ─────────────────────────────────────────────────────────────────────────────
# Configurable Ambiguity-Prone Fields & Semantic Definitions (Role 2)
# ─────────────────────────────────────────────────────────────────────────────
AMBIGUITY_PRONE_FIELDS: List[str] = [
    "net_worth_type_display",
    "payment_terms_supply_display",
    "payment_terms_installation_display",
    "delivery_time_supply_display",
    "delivery_time_installation_display",
]

AMBIGUITY_FIELD_DEFINITIONS: Dict[str, str] = {
    "net_worth_type_display": (
        "Indicates whether the bidder's Net Worth must be positive or is 'Not Applicable' / exempt under "
        "Bidder Eligibility Criteria (BEC Section-II). CRITICAL RULE: General legal boilerplate in General Conditions (GCC) "
        "stating 'The Net Worth of the Bidder must be positive' must NOT be used if Section-II (BEC) unconditionally declares "
        "Financial Criteria Not Applicable or exempt for all bidders in this tender."
    ),
    "payment_terms_supply_display": (
        "Percentage of contract/order value paid for goods supply milestone upon receipt/delivery of materials. "
        "Differentiate milestone-based terms (e.g. '70%', '80%', '85%') from general dispatch terms (e.g. '95%'). "
        "If the tender specifies a milestone schedule (e.g. 70% on supply, 30% on installation; or 80% on supply, 20% on installation; "
        "or 85% on supply, 15% on installation), extract the supply milestone percentage. Return as percentage string (e.g. '80%')."
    ),
    "payment_terms_installation_display": (
        "Percentage of contract/order value paid upon completion of installation, testing, and commissioning milestone "
        "(e.g. '30%', '20%', '15%', '5%'). Must pair with the supply milestone. Return as percentage string (e.g. '20%')."
    ),
    "delivery_time_supply_display": (
        "Goods supply delivery timeline in days (e.g. '90 Days', '140 Days', '150 Days'). "
        "Differentiate goods delivery period from overall total contract or FOA completion period "
        "(e.g. 160 days total completion vs 90 days delivery). Return formatted with 'Days' (e.g. '90 Days')."
    ),
    "delivery_time_installation_display": (
        "Installation and commissioning timeline in days (e.g. '90 Days', '140 Days', '150 Days', '365 Days'). "
        "Return formatted with 'Days' (e.g. '90 Days')."
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# GAIL / GeM ATC Anchor Knowledge Base
# Compiled from: GAIL GCC-Goods Rev.1 (2022), BDS Section-III, all ATC samples
# ─────────────────────────────────────────────────────────────────────────────
GAIL_GEM_SYSTEM_INSTRUCTION = """You are an expert at extracting structured data from Indian government procurement tender documents — specifically GAIL/PSU Additional Terms & Conditions (ATC) PDFs procured on the GeM portal.

## GAIL / GeM Document Structure Knowledge

### Section & Clause Map (GAIL GCC-Goods Rev.1, April 2022)
- **SECTION-I (IFB Summary)**: IFB Tags (A)–(H) — fixed-format summary rows
  - Tag (E): BID SECURITY / EMD AMOUNT — extract exact ₹ amount here, NOT from Clause 16
  - Tag (G): CONTACT DETAILS OF TENDER DEALING OFFICER — primary contact block (name, phone, email)
  - Tag (H): DEALING GAIL'S OFFICE ADDRESS — courier/physical submission address
- **SECTION-II**: BID EVALUATION CRITERIA (BEC) — eligibility, MAF, technical & financial criteria
  - **Technical Criteria (custom_eligibility_criteria)**:
    - Extract the core technical experience requirement (e.g., "Bidder should have supplied / executed SITC of...").
    - DO NOT extract Make-in-India (MII) or Public Procurement / MSE Purchase Preference clauses here. MII is NOT technical BEC.
  - **Single / Multiple Work Order Values (order_value_1, order_value_2, order_value_3)**:
    - Extract the required executed order values from BEC technical criteria.
    - PRESERVE THE UNIT: If the table column is "(Rs. in Lakhs)" and the row says "32.00", output "Rs. 32.00 Lakh" or "₹32,00,000". Never output bare "32.00" without units.
  - **Eligibility Experience Period (eligibility_criterion_years)**:
    - Extract ONLY the integer number of years required (e.g. "7" or "3"). Do not output "etc.", sentences, or vague text.
  - **Financial Criteria (Turnover, Working Capital, Net Worth, Solvency)**:
    - Only mark as "Not Applicable" if UNCONDITIONALLY NOT APPLICABLE for ALL bidders.
    - If financial criteria is exempt ONLY for MSE / Startups, extract the standard threshold values applicable to general bidders (e.g., "Rs. 61.00 Lakh").
  - MAF/OEM: "Manufacturer Authorization", "Authorized Dealer/Partner" → maf_required=true
- **SECTION-III (BDS)**: BIDDING DATA SHEET — second occurrence (ignore TOC listing near front)
  - Find the SECOND occurrence of "BIDDING DATA SHEET (BDS)" and slice to next SECTION-
  - BDS 8.1 / 22.2: Courier/Submission address — also called 'Consignee Address' or 'Delivery Address'
  - BDS 39.2 / 39.3: Nodal Officer / second contact block

### Terms of Payment & Guarantees
- **CLAUSE 9.0 / 26.0 (Goods/SITC)** or **CLAUSE 21.0 / 3.1 (Services/AMC)**: TERMS OF PAYMENT
  - For Goods/SITC contracts: typically 70% or 80% on supply receipt, 30% or 20% on installation/commissioning
  - Differentiate milestone payments from general dispatch/acceptance terms
- **CLAUSE 38.0 / 39.0**: CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT / PBG
  - Extract: percentage (%), duration in months, accepted instrument types
  - Common instruments: Bank Guarantee, Demand Draft, FDR, Online Transfer, Insurance Surety Bond
- **PRICE REDUCTION SCHEDULE (PRS) FOR DELAYED DELIVERY**:
  - Typically: 0.5% per complete week of delay, maximum 5% of total order value

## CRITICAL EXTRACTION RULES
1. Extract ONLY values explicitly present in the provided document text.
2. Do NOT infer, guess, or hallucinate values.
3. Return null for any field not found in the text.
4. For payment terms: return INTEGER percentages (e.g. 70, not "70%").
5. For LD/PRS: return DECIMAL rate (e.g. 0.5, not "0.5%").
6. For SD/PBG mode: list all accepted instruments as a human-readable string.
7. For custom_eligibility_criteria: Extract technical scope of past experience only; never extract Make in India / Local Content preference text.
8. For order values and turnover: Always preserve currency and multiplier units (e.g. 'Rs. 32.00 Lakh' or '₹32,00,000').
9. For eligibility_criterion_years: Output a clean single integer string (e.g. '7', '5', '3').

{few_shot_section}"""

# ─────────────────────────────────────────────────────────────────────────────
# Field Map: display_key → (prompt_field_name, json_type, description, display_format)
# ─────────────────────────────────────────────────────────────────────────────
def _fmt_pct(v) -> Optional[str]:
    try:
        return f"{int(float(str(v)))}%"
    except Exception:
        return None

def _fmt_pct_decimal(v) -> Optional[str]:
    try:
        val_f = float(str(v))
        return f"{int(val_f)}%" if val_f.is_integer() else f"{val_f}%"
    except Exception:
        return None

def _fmt_int(v) -> Optional[str]:
    try:
        return str(int(float(str(v))))
    except Exception:
        return None

def _fmt_bool(v) -> Optional[str]:
    if isinstance(v, bool):
        return "Yes" if v else "No"
    return "Yes" if str(v).lower() in ("true", "yes", "1") else "No"

def _fmt_str(v) -> Optional[str]:
    s = str(v).strip()
    return s if s else None

def _fmt_years(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    m = re.search(r"\b(\d{1,2})\b", s)
    if m:
        return m.group(1)
    word_to_num = {
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"
    }
    for w, n in word_to_num.items():
        if w in s.lower():
            return n
    return s if s else None


FIELD_PROMPT_MAP: Dict[str, Tuple[str, str, str, Any]] = {
    "payment_terms_supply_display": (
        "payment_terms_supply_pct", "integer",
        "% of contract value paid on supply/delivery/receipt of materials (integer, e.g. 70, 80, 85)",
        _fmt_pct,
    ),
    "payment_terms_installation_display": (
        "payment_terms_installation_pct", "integer",
        "% paid on installation/commissioning/site acceptance (integer, e.g. 30, 20, 15)",
        _fmt_pct,
    ),
    "ld_percentage_display": (
        "ld_percentage_per_week", "number",
        "PRS/LD rate as % per complete week of delay — search 'PRICE REDUCTION SCHEDULE (PRS)', NOT 'Liquidated Damages' (decimal, e.g. 0.5)",
        _fmt_pct_decimal,
    ),
    "max_ld_percentage_display": (
        "max_ld_percentage", "number",
        "Maximum PRS/LD cap as % of total order value (decimal, e.g. 5.0)",
        _fmt_pct_decimal,
    ),
    "sd_required_display": (
        "sd_required", "boolean",
        "Is Security Deposit / CPS required? If PBG at 5% covers CPS, sd_required=false",
        _fmt_bool,
    ),
    "sd_mode_display": (
        "sd_mode", "string",
        "Accepted payment instruments for Security Deposit/CPS (e.g. 'Bank Guarantee / DD / FDR / Insurance Surety Bond')",
        _fmt_str,
    ),
    "sd_percentage_display": (
        "sd_percentage", "number",
        "Security Deposit percentage of contract value (decimal, e.g. 5.0)",
        _fmt_pct_decimal,
    ),
    "sd_duration_display": (
        "sd_duration_months", "integer",
        "Security Deposit validity duration in months (integer, e.g. 30)",
        _fmt_int,
    ),
    "pbg_percentage_display": (
        "pbg_percentage", "number",
        "Performance Bank Guarantee (PBG) percentage of contract value (decimal, e.g. 5.0 for 5%)",
        _fmt_pct_decimal,
    ),
    "pbg_duration_display": (
        "pbg_duration_months", "integer",
        "Performance Bank Guarantee (PBG) validity duration in months (integer, e.g. 30)",
        _fmt_int,
    ),
    "maf_required_display": (
        "maf_required", "boolean",
        "Is Manufacturer Authorization Form (MAF) / OEM Authorization required? Look in BEC Section-II for 'Manufacturer' or 'Authorized Dealer'",
        _fmt_bool,
    ),
    "client_name_1_display": (
        "client_name_1", "string",
        "Name of primary contact / Tender Dealing Officer from IFB Tag (G) or BDS Clause 39.2 (e.g. 'Sh. Ramesh Kumar')",
        _fmt_str,
    ),
    "client_email_1_display": (
        "client_email_1", "string",
        "Email address of primary contact (e.g. ramesh.kumar@gail.co.in)",
        _fmt_str,
    ),
    "client_phone_1_display": (
        "client_phone_1", "string",
        "Phone/extension number of primary contact",
        _fmt_str,
    ),
    "client_name_2_display": (
        "client_name_2", "string",
        "Name of second contact / Nodal Officer from BDS Clause 39.3",
        _fmt_str,
    ),
    "client_email_2_display": (
        "client_email_2", "string",
        "Email of second contact / Nodal Officer",
        _fmt_str,
    ),
    "client_phone_2_display": (
        "client_phone_2", "string",
        "Phone of second contact / Nodal Officer",
        _fmt_str,
    ),
    "client_name_3_display": (
        "client_name_3", "string",
        "Name of third contact / additional dealing officer",
        _fmt_str,
    ),
    "client_email_3_display": (
        "client_email_3", "string",
        "Email of third contact",
        _fmt_str,
    ),
    "client_phone_3_display": (
        "client_phone_3", "string",
        "Phone of third contact",
        _fmt_str,
    ),
    "custom_eligibility_criteria_display": (
        "custom_eligibility_criteria", "string",
        "Detailed Technical Eligibility criteria / technical scope and single order value requirement from Section-II BEC (verbatim or summarized). EXCLUDE Make-in-India / Local Content clauses.",
        _fmt_str,
    ),
    "courier_address_display": (
        "courier_address", "string",
        "Full office address for physical document submission from IFB Tag (H) or BDS Clause 22.2",
        _fmt_str,
    ),
    "delivery_time_supply_display": (
        "delivery_time_supply_days", "integer",
        "Number of days for supply/delivery from date of purchase order (integer, e.g. 90, 140, 150)",
        _fmt_int,
    ),
    "pbg_mode_display": (
        "pbg_mode", "string",
        "Accepted instruments for PBG/ePBG (e.g. 'Bank Guarantee / Insurance Surety Bond')",
        _fmt_str,
    ),
    "commercial_evaluation_display": (
        "commercial_evaluation_type", "string",
        "Commercial evaluation method — look for 'Overall GST Inclusive', 'L1 basis', 'L-1', 'Total value wise'",
        _fmt_str,
    ),
    "reverse_auction_applicable_display": (
        "reverse_auction_applicable", "boolean",
        "Is Reverse Auction applicable for this bid? (true/false)",
        _fmt_bool,
    ),
    "order_value_1_display": (
        "order_value_1", "string",
        "Executed work order value for 1st/single executed order from BEC technical eligibility. If presented as a multi-part split table (Part A + Part B), extract or sum the values for all quoted parts (e.g. 'Rs. 61.00 Lac' or '₹61,00,000.00').",
        _fmt_str,
    ),
    "order_value_2_display": (
        "order_value_2", "string",
        "Executed work order value for 2nd executed order (if 2 orders required in BEC criteria).",
        _fmt_str,
    ),
    "order_value_3_display": (
        "order_value_3", "string",
        "Executed work order value for 3rd executed order (if 3 orders required in BEC criteria).",
        _fmt_str,
    ),
    "avg_annual_turnover_value_display": (
        "avg_annual_turnover_value", "string",
        "Minimum Average Annual Turnover value required in BEC criteria. Extract single or combined multi-part total (e.g. 'Rs. 61.00 Lac' or '₹61,00,000.00').",
        _fmt_str,
    ),
    "working_capital_value_display": (
        "working_capital_value", "string",
        "Minimum Working Capital value required in BEC criteria. Extract single or combined multi-part total (e.g. 'Rs. 12.00 Lac' or '₹12,00,000.00').",
        _fmt_str,
    ),
    "solvency_certificate_value_display": (
        "solvency_certificate_value", "string",
        "Minimum Solvency Certificate value required in BEC criteria (e.g. 'Rs. 50.00 Lac' or 'Not Applicable').",
        _fmt_str,
    ),
    "net_worth_value_display": (
        "net_worth_value", "string",
        "Net worth requirement from BEC criteria (e.g. 'Must be positive' or monetary threshold).",
        _fmt_str,
    ),
    "eligibility_criterion_years_display": (
        "eligibility_criterion_years", "string",
        "Number of years of prior experience required in BEC technical criteria (e.g. '7' or '3'). Return clean integer number string only.",
        _fmt_years,
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# Scoped Context Extractor for Role 2 (Ambiguity Resolution)
# ─────────────────────────────────────────────────────────────────────────────
def extract_scoped_context(full_text: str, field_name: str) -> str:
    """
    Extracts scoped document sections relevant to specific ambiguous fields
    to keep token usage minimal and focus Claude on relevant clauses.
    Instruments and logs section names and character counts per field.
    """
    if not full_text:
        logger.info("[SCOPED_CONTEXT] Field '%s': empty full_text provided (0 chars)", field_name)
        return ""
    snippets = []
    section_names = []

    if "net_worth" in field_name:
        # 1. Section-II / BEC block
        bec_m = re.search(
            r"(?:SECTION\s*[-–—]?\s*II\b|BID\s+EVALUATION\s+CRITERIA|\bBEC\b)[\s\S]{0,5000}?(?=(?:SECTION\s*[-–—]?\s*III|BIDDING\s+DATA\s+SHEET|\bBDS\b|\Z))",
            full_text, re.IGNORECASE
        )
        if bec_m:
            snippets.append("=== SECTION-II / BID EVALUATION CRITERIA (BEC) ===\n" + bec_m.group(0).strip())
            section_names.append("SECTION-II / BEC")

        # 2. Occurrences of net worth and financial criteria
        for m in re.finditer(r"\b(?:net\s*worth|financial\s+criteria|financial\s+exemption)\b", full_text, re.IGNORECASE):
            start = max(0, m.start() - 300)
            end = min(len(full_text), m.end() + 600)
            snippets.append(f"=== Clause Context: '{m.group(0)}' ===\n" + full_text[start:end].strip())
            section_names.append(f"Clause: '{m.group(0)}'")

    elif "payment" in field_name:
        # Search for payment terms clauses with prioritized milestone matching
        found_matches = []
        for m in re.finditer(
            r"(?:TERMS\s+OF\s+PAYMENT|PAYMENT\s+TERMS|PAYMENT\s+SCHEDULE|MILESTONE\s+PAYMENT|REVISED\s+TERMS\s+OF\s+PAYMENT)",
            full_text, re.IGNORECASE
        ):
            start = max(0, m.start() - 200)
            end = min(len(full_text), m.end() + 1500)
            clause_text = full_text[start:end].strip()
            # Prioritize clauses with milestone percentages (70/30, 80/20, 90/10) over generic boilerplate
            has_milestone_pct = bool(re.search(r"\b(?:70|80|90|30|20|10|95|5)\s*%", clause_text))
            has_supply_install = bool(re.search(r"\b(?:supply|installation|receipt|commissioning)\b", clause_text, re.IGNORECASE))
            score = (2 if has_milestone_pct else 0) + (1 if has_supply_install else 0)
            found_matches.append((score, m.start(), m.group(0), clause_text))

        # Sort higher-relevance milestone clauses first
        found_matches.sort(key=lambda x: (x[0], -x[1]), reverse=True)
        for score, pos, header, clause_text in found_matches:
            snippets.append(f"=== Payment Clause: '{header}' (pos {pos}) ===\n{clause_text}")
            section_names.append(f"Payment Clause: '{header}' (score={score})")

        # Special Conditions / SCC
        scc_m = re.search(
            r"(?:SECTION\s*[-–—]?\s*V\b|SPECIAL\s+CONDITIONS\s+OF\s+CONTRACT|\bSCC\b)[\s\S]{0,4000}?(?=(?:SECTION\s*[-–—]?\s*VI|\Z))",
            full_text, re.IGNORECASE
        )
        if scc_m:
            snippets.append("=== SPECIAL CONDITIONS OF CONTRACT (SCC) ===\n" + scc_m.group(0)[:3000].strip())
            section_names.append("SCC Section")

    elif "delivery" in field_name:
        found_delivery = []
        for m in re.finditer(
            r"(?:DELIVERY\s+PERIOD|PERIOD\s+OF\s+WORK|TIME\s+FOR\s+COMPLETION|COMPLETION\s+SCHEDULE|DELIVERY\s+SCHEDULE)",
            full_text, re.IGNORECASE
        ):
            start = max(0, m.start() - 200)
            end = min(len(full_text), m.end() + 1200)
            d_text = full_text[start:end].strip()
            has_days_months = bool(re.search(r"\b\d+\s*(?:days|months|weeks)\b", d_text, re.IGNORECASE))
            score = 2 if has_days_months else 0
            found_delivery.append((score, m.start(), m.group(0), d_text))

        found_delivery.sort(key=lambda x: (x[0], -x[1]), reverse=True)
        for score, pos, header, d_text in found_delivery:
            snippets.append(f"=== Delivery / Completion Clause: '{header}' (pos {pos}) ===\n{d_text}")
            section_names.append(f"Delivery Clause: '{header}' (score={score})")

    if not snippets:
        # Fallback to first 8000 characters if no specialized section matched
        fallback_text = full_text[:8000]
        logger.warning(
            "[SCOPED_CONTEXT] Field '%s': NO specific section matched! Falling back to first 8000 characters (%d chars).",
            field_name, len(fallback_text)
        )
        return fallback_text

    # Combine top distinct snippet blocks, capping total character length at 15000
    combined = "\n\n".join(snippets[:6])
    final_scoped = combined[:15000]

    logger.info(
        "[SCOPED_CONTEXT] Field '%s': Selected %d sections (%s) -> Total %d characters sent (full doc: %d chars, %.1f%% of full doc)",
        field_name, len(section_names[:6]), section_names[:6], len(final_scoped), len(full_text),
        (len(final_scoped) / max(len(full_text), 1)) * 100
    )
    return final_scoped


# ─────────────────────────────────────────────────────────────────────────────
# Extraction Memory Store (few-shot learning)
# ─────────────────────────────────────────────────────────────────────────────
def _load_memory() -> Dict[str, List[Dict]]:
    """Load few-shot examples from persistent JSON store."""
    if not _MEMORY_FILE.exists():
        return {}
    try:
        with open(_MEMORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("examples_by_field", {})
    except Exception as e:
        logger.warning("[LLM_MEMORY] Could not load extraction_memory.json: %s", e)
        return {}

def _save_memory(field_key: str, anchor_text: str, value: Any, doc_type: str, confidence: float = 0.90):
    """Persist a successful extraction example to the few-shot memory store."""
    try:
        _MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        existing: Dict[str, List[Dict]] = {}
        if _MEMORY_FILE.exists():
            with open(_MEMORY_FILE, "r", encoding="utf-8") as f:
                raw = json.load(f)
                existing = raw.get("examples_by_field", {})

        examples = existing.get(field_key, [])
        examples = [ex for ex in examples if ex.get("anchor_text", "")[:100] != anchor_text[:100]]
        examples.append({
            "anchor_text": anchor_text[:300],
            "value": value,
            "doc_type": doc_type,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        examples.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        examples = examples[:_MEMORY_MAX_EXAMPLES_PER_FIELD]
        existing[field_key] = examples

        with open(_MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump({"version": 2, "examples_by_field": existing}, f, indent=2, ensure_ascii=False)
        logger.info("[LLM_MEMORY] Saved example for field '%s': %r", field_key, str(value)[:60])
    except Exception as e:
        logger.warning("[LLM_MEMORY] Could not save example: %s", e)

def _anonymize_few_shot_value(display_key: str, val: Any) -> Any:
    """Anonymize literal field values to prevent cross-tender value leakage during few-shot prompting."""
    if val is None or isinstance(val, (bool, int, float)):
        return val
    s = str(val)
    if "email" in display_key:
        return "officer@gail.co.in"
    if "phone" in display_key:
        return "+91-98XXXXXXXX"
    if "name" in display_key:
        return "Shri Officer Name"
    if "address" in display_key or "courier" in display_key:
        return "GAIL Office Address, City, State - Pin Code"
    return s

def _build_few_shot_section(missing_fields: List[str], memory: Dict[str, List[Dict]]) -> str:
    """Build the few-shot examples section of the prompt from memory with anonymized values."""
    lines = []
    for display_key in missing_fields:
        entry = FIELD_PROMPT_MAP.get(display_key)
        if not entry:
            continue
        prompt_field = entry[0]
        if display_key == "custom_eligibility_criteria_display":
            continue
        examples = memory.get(display_key, []) or memory.get(prompt_field, [])
        if not examples:
            continue
        lines.append(f"\n## Learned Examples for `{prompt_field}`:")
        for ex in examples[:2]:
            anon_val = _anonymize_few_shot_value(display_key, ex["value"])
            lines.append(f"  - Anchor: \"{ex['anchor_text'][:120]}\"")
            lines.append(f"    → Value Format Example: {json.dumps(anon_val)}")
    if not lines:
        return ""
    return "\n## Few-Shot Extraction Examples (Formatting guidelines from historical tenders):\n" + "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Anthropic Tool Schema Builders
# ─────────────────────────────────────────────────────────────────────────────
def _build_missing_fields_tool_schema(missing_fields: List[str]) -> Dict[str, Any]:
    """Build a strict JSON schema for Role 1 missing-field tool use."""
    properties = {}
    required = []
    for display_key in missing_fields:
        entry = FIELD_PROMPT_MAP.get(display_key)
        if not entry:
            continue
        prompt_field, json_type, desc, _ = entry
        if json_type == "integer":
            properties[prompt_field] = {"type": ["integer", "null"], "description": desc}
        elif json_type == "number":
            properties[prompt_field] = {"type": ["number", "null"], "description": desc}
        elif json_type == "boolean":
            properties[prompt_field] = {"type": ["boolean", "null"], "description": desc}
        else:
            properties[prompt_field] = {"type": ["string", "null"], "description": desc}
        required.append(prompt_field)

    return {
        "name": "extract_missing_fields",
        "description": "Records the extracted tender field values.",
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": required,
        }
    }


def _build_ambiguity_tool_schema() -> Dict[str, Any]:
    """Build a strict JSON schema for Role 2 ambiguity resolution tool use."""
    return {
        "name": "resolve_ambiguous_fields",
        "description": "Reviews candidate extracted fields against tender clauses to either confirm or override each field.",
        "input_schema": {
            "type": "object",
            "properties": {
                "decisions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field_name": {
                                "type": "string",
                                "description": "The exact display key being reviewed, e.g. 'net_worth_type_display'"
                            },
                            "action": {
                                "type": "string",
                                "enum": ["confirm", "override"],
                                "description": "Whether to confirm the regex candidate or override it with a corrected value"
                            },
                            "resolved_value": {
                                "type": ["string", "number", "null"],
                                "description": "The final resolved display string (e.g. 'Not Applicable', '80%', '90 Days'). If confirmed, matches candidate."
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "A concise one-line rationale explaining why the candidate was confirmed or overridden."
                            }
                        },
                        "required": ["field_name", "action", "resolved_value", "reasoning"]
                    }
                }
            },
            "required": ["decisions"]
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main Anthropic Claude Resolver Class
# ─────────────────────────────────────────────────────────────────────────────
class LLMFieldResolver:
    """
    Sole LLM Resolver for VolksAI / Tender Volks.
    Powered by Anthropic Claude (claude-sonnet-5) with strict tool use output.
    Executes:
      Role 1: Missing-field fallback
      Role 2: Ambiguity resolution on AMBIGUITY_PRONE_FIELDS
    """

    def __init__(
        self,
        *,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 25.0,
    ):
        anthropic_key = (
            api_key
            or os.getenv("ANTHROPIC_API_KEY", "").strip()
            or os.getenv("LLM_API_KEY", "").strip()
        )

        # Fail loudly if API key is missing or placeholder
        if not anthropic_key or "placeholder" in anthropic_key.lower() or "your_claude" in anthropic_key.lower():
            raise RuntimeError(
                "FATAL: ANTHROPIC_API_KEY is not configured or is a placeholder. "
                "Claude (claude-sonnet-5) is required for tender field resolution."
            )

        self.api_key = anthropic_key
        self.provider = "anthropic"
        self.model_name = model or os.getenv("ANTHROPIC_MODEL", SONNET_MODEL_DEFAULT)
        self.timeout = float(timeout)
        self.enabled = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true"

        import anthropic
        self.client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        # Token and cost tracking
        self.total_input_tokens: int = 0
        self.total_output_tokens: int = 0
        self.total_cost_usd: float = 0.0

    def record_usage(self, in_tok: int, out_tok: int):
        """Record token counts and update estimated cost in USD."""
        self.total_input_tokens += in_tok
        self.total_output_tokens += out_tok
        cost = (in_tok / 1_000_000 * SONNET_INPUT_PRICE_PER_M) + (out_tok / 1_000_000 * SONNET_OUTPUT_PRICE_PER_M)
        self.total_cost_usd += cost

    def get_usage_summary(self) -> Dict[str, Any]:
        """Return cumulative token usage and estimated cost."""
        return {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
            "estimated_cost_usd": round(self.total_cost_usd, 5),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 1: Missing-Field Fallback (Tool Use)
    # ─────────────────────────────────────────────────────────────────────────
    def resolve_missing_fields(
        self,
        atc_full_text: str,
        missing_fields: List[str],
        doc_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Role 1: Extracts missing fields using schema-constrained tool use.
        """
        if not self.enabled:
            logger.info("[LLM_FALLBACK] LLM resolution is disabled via LLM_FALLBACK_ENABLED=false")
            return {}

        known_missing = [f for f in missing_fields if f in FIELD_PROMPT_MAP]
        if not known_missing or not atc_full_text or not atc_full_text.strip():
            return {}

        logger.info(
            "[LLM_FALLBACK][Role 1] Resolving %d missing fields via Claude (%s): %s",
            len(known_missing), self.model_name, known_missing,
        )

        detected_type = doc_type or self._detect_doc_type(atc_full_text)
        memory = _load_memory()
        few_shot_section = _build_few_shot_section(known_missing, memory)

        system_instruction = GAIL_GEM_SYSTEM_INSTRUCTION.format(few_shot_section=few_shot_section)
        
        # Build tool schema
        tool_spec = _build_missing_fields_tool_schema(known_missing)

        field_descriptions = "\n".join(
            f"- `{entry[0]}`: {entry[2]}"
            for f in known_missing
            for entry in [FIELD_PROMPT_MAP[f]]
        )
        user_prompt = (
            f"Extract the following missing fields from this government procurement tender document.\n\n"
            f"Fields to extract:\n{field_descriptions}\n\n"
            f"Tender Document Text:\n--- START OF DOCUMENT ---\n{atc_full_text[:120000]}\n--- END OF DOCUMENT ---"
        )

        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=2048,
                system=system_instruction,
                messages=[{"role": "user", "content": user_prompt}],
                tools=[tool_spec],
                tool_choice={"type": "tool", "name": "extract_missing_fields"},
            )

            # Record tokens
            if hasattr(response, "usage") and response.usage:
                self.record_usage(response.usage.input_tokens, response.usage.output_tokens)
                logger.info(
                    "[LLM_FALLBACK][Role 1] Token usage: %d in / %d out (Est. cost: $%.5f USD)",
                    response.usage.input_tokens, response.usage.output_tokens, self.total_cost_usd
                )

            extracted_dict: Dict[str, Any] = {}
            for block in response.content:
                if getattr(block, "type", "") == "tool_use" and getattr(block, "name", "") == "extract_missing_fields":
                    extracted_dict = getattr(block, "input", {}) or {}
                    break

            # Map raw tool outputs to formatted display values
            prompt_to_display = {entry[0]: disp_key for disp_key, entry in FIELD_PROMPT_MAP.items()}
            results: Dict[str, Any] = {}

            for prompt_field, raw_val in extracted_dict.items():
                if raw_val is None:
                    continue
                display_key = prompt_to_display.get(prompt_field)
                if not display_key or display_key not in known_missing:
                    continue

                formatter = FIELD_PROMPT_MAP[display_key][3]
                formatted_val = formatter(raw_val) if callable(formatter) else str(raw_val)

                if formatted_val is not None and str(formatted_val).strip():
                    results[display_key] = {
                        "value": formatted_val,
                        "raw_value": raw_val,
                        "confidence": 0.85,
                        "source": "llm",
                    }
                    # Save to few-shot memory
                    _save_memory(display_key, str(raw_val), formatted_val, detected_type, confidence=0.85)

            logger.info("[LLM_FALLBACK][Role 1] Successfully resolved %d/%d fields via Claude", len(results), len(known_missing))
            return results

        except Exception as exc:
            logger.error("[LLM_FALLBACK][Role 1] Claude extraction failed: %s", exc)
            return {}

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 2: Ambiguity Resolution (Clause Scoping & Reasoning)
    # ─────────────────────────────────────────────────────────────────────────
    def resolve_ambiguous_fields(
        self,
        full_text: str,
        candidates: Dict[str, Any],
        doc_type: Optional[str] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Role 2: Re-evaluates ambiguity-prone fields against scoped document clauses.
        Either confirms the regex candidate or overrides it with a corrected value and reasoning.
        """
        if not self.enabled:
            return {}

        fields_to_check = [f for f in AMBIGUITY_PRONE_FIELDS if f in candidates]
        if not fields_to_check or not full_text or not full_text.strip():
            return {}

        logger.info(
            "[LLM_AMBIGUITY][Role 2] Reviewing %d ambiguity-prone fields via Claude (%s): %s",
            len(fields_to_check), self.model_name, fields_to_check,
        )

        # Build scoped context for all requested fields
        scoped_contexts = []
        for f in fields_to_check:
            ctx = extract_scoped_context(full_text, f)
            if ctx:
                scoped_contexts.append(f"### Scoped Context for `{f}`:\n{ctx}")

        combined_scoped_text = "\n\n".join(scoped_contexts)
        if not combined_scoped_text.strip():
            combined_scoped_text = full_text[:15000]

        tool_spec = _build_ambiguity_tool_schema()

        field_prompts = []
        for f in fields_to_check:
            cand_val = candidates.get(f)
            desc = AMBIGUITY_FIELD_DEFINITIONS.get(f, "Tender qualification attribute.")
            field_prompts.append(
                f"- Field: `{f}`\n"
                f"  Current Candidate Value: {cand_val!r}\n"
                f"  Target Meaning & Business Rule: {desc}"
            )

        user_prompt = (
            "You are an expert procurement auditor reviewing candidate fields extracted from an Indian government tender.\n"
            "Layer 1 regex extraction may have matched legal boilerplate or the wrong milestone schedule.\n\n"
            "Review each field below against the provided scoped tender clauses:\n"
            "1. If the candidate value is accurate and matches the tender-specific criteria, choose action='confirm'.\n"
            "2. If the candidate value is wrong (e.g. GCC boilerplate 'Positive' when BEC declares financial criteria exempt; "
            "or general dispatch % instead of milestone supply %), "
            "choose action='override', provide the corrected 'resolved_value', and a clear one-line 'reasoning'.\n"
            "3. SPECIAL RULE FOR DELIVERY TIME FIELDS (delivery_time_supply_display, delivery_time_installation_display):\n"
            "   - If the tender clauses state an overall contract completion or delivery period (e.g. 150 Days, 90 Days, 140 Days, 365 Days) "
            "but do NOT isolate a distinct supply-only figure, DO NOT collapse the value to a bare 'Not Specified' or null!\n"
            "   - Instead, choose action='override' and return the total period accompanied by a clear qualification, e.g.:\n"
            "     '{candidate_days} (total completion) — no distinct supply-only figure found in scoped clauses'.\n"
            "   - For installation delivery time, if included in total contract or not separated: "
            "'{candidate_days} (total completion) — installation included in total period'.\n\n"
            "Fields to review:\n" + "\n\n".join(field_prompts) + "\n\n"
            "Scoped Tender Clauses:\n--- START OF RELEVANT CLAUSES ---\n"
            f"{combined_scoped_text}\n--- END OF RELEVANT CLAUSES ---"
        )

        try:
            response = self.client.messages.create(
                model=self.model_name,
                max_tokens=2048,
                messages=[{"role": "user", "content": user_prompt}],
                tools=[tool_spec],
                tool_choice={"type": "tool", "name": "resolve_ambiguous_fields"},
            )

            # Record tokens
            if hasattr(response, "usage") and response.usage:
                self.record_usage(response.usage.input_tokens, response.usage.output_tokens)
                logger.info(
                    "[LLM_AMBIGUITY][Role 2] Token usage: %d in / %d out (Est. cost: $%.5f USD)",
                    response.usage.input_tokens, response.usage.output_tokens, self.total_cost_usd
                )

            decisions_list: List[Dict[str, Any]] = []
            for block in response.content:
                if getattr(block, "type", "") == "tool_use" and getattr(block, "name", "") == "resolve_ambiguous_fields":
                    input_data = getattr(block, "input", {}) or {}
                    decisions_list = input_data.get("decisions", [])
                    break

            results: Dict[str, Dict[str, Any]] = {}
            for d in decisions_list:
                f_name = d.get("field_name")
                if not f_name or f_name not in fields_to_check:
                    continue
                action = d.get("action", "confirm")
                resolved_val = d.get("resolved_value")
                reasoning = d.get("reasoning", "")

                # ISSUE 5 FALLBACK GUARD FOR DELIVERY TIME:
                # When Claude returns 'Not Specified' or empty for delivery_time fields,
                # but a candidate exists from Layer 1 regex, return candidate with qualification
                # rather than collapsing to a bare "Not Specified".
                if f_name in ("delivery_time_supply_display", "delivery_time_installation_display"):
                    cand_val = candidates.get(f_name)
                    if (not resolved_val or str(resolved_val).strip() in ("Not Specified", "None", "NA", "null")) and cand_val and str(cand_val) not in ("NA", "Not Found", "None"):
                        target_type = "supply-only" if "supply" in f_name else "installation-only"
                        resolved_val = f"{cand_val} (total completion) — no distinct {target_type} figure found in scoped clauses"
                        action = "override"
                        if not reasoning:
                            reasoning = f"Total completion period retained as fallback: no separate {target_type} schedule isolated in scoped clauses."

                results[f_name] = {
                    "action": action,
                    "resolved_value": resolved_val,
                    "reasoning": reasoning,
                }

            logger.info("[LLM_AMBIGUITY][Role 2] Successfully evaluated %d decisions via Claude", len(results))
            return results

        except Exception as exc:
            logger.error("[LLM_AMBIGUITY][Role 2] Claude ambiguity resolution failed: %s", exc)
            return {}

    # Backward compatibility alias
    def resolve(
        self,
        atc_full_text: str,
        missing_fields: List[str],
        doc_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Backward-compatible alias for resolve_missing_fields."""
        return self.resolve_missing_fields(atc_full_text, missing_fields, doc_type)

    def _detect_doc_type(self, text: str) -> str:
        """Detect tender domain/type from text keywords."""
        t = text.lower()
        if "amc" in t or "annual maintenance" in t:
            return "GAIL_AMC"
        if "battery" in t or "vrla" in t or "nicd" in t:
            return "GAIL_BATTERY"
        if "pipe" in t or "pipeline" in t:
            return "GAIL_PIPELINE"
        return "GAIL_GOODS"
