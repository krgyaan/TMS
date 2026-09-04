"""
LLM Field Resolver — Gemini Flash hybrid fallback for GAIL/GeM ATC parsing.

Architecture:
  1. Only activates for fields still NA after the full regex pass.
  2. Uses GAIL/GeM-specific BDS/clause anchor knowledge in the system prompt.
  3. Learns from every successful extraction via extraction_memory.json (few-shot store).
  4. Validated output: non-hallucination check anchors extracted value back to source text.
  5. Uses google-genai SDK v2 with response_schema for type-safe structured JSON output.

Ground-truth anchor knowledge compiled from manual analysis of:
  - GAIL Rajahmundry NiCd (1) ATC
  - GGL Agra VRLA Batteries ATC (GEM/2026/B/7772525)
  - GAIL Jaipur AMC ATC
  - GAIL GCC-Goods Rev.1 (April 2022)
"""

import importlib
import json
import logging
import os
import random
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env.dev")

logger = logging.getLogger(__name__)

# Path where few-shot examples accumulate across all parsed documents
_MEMORY_DIR = Path(__file__).parent.parent / "storage" / "llm_memory"
_MEMORY_FILE = _MEMORY_DIR / "extraction_memory.json"
_MEMORY_MAX_EXAMPLES_PER_FIELD = int(os.getenv("LLM_MAX_EXAMPLES_PER_FIELD", "5"))

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

### Consignee Officer Address Extraction
- Look for labels: "Consignee", "Consignee Officer", "Consignee Address", "Address for Delivery", "Delivery Address", "Address of Consignee"
- Also check: IFB Tag (H), BDS Clause 8.1, BDS Clause 22.2
- Extract the FULL address block including name, designation, department, city, pin code
- For courier_address: return the complete multi-line address as a single string
- **CLAUSE 9.0 / 26.0 (Goods/SITC)** or **CLAUSE 21.0 / 3.1 (Services/AMC)**: TERMS OF PAYMENT
  - For Goods/SITC contracts: typically 70% on supply receipt, 30% on installation/commissioning
  - For Services/AMC: look under SECTION-V, SCC, or SPECIAL CONDITIONS OF CONTRACT
  - NEVER read from generic GCC boilerplate which only lists general terms
- **CLAUSE 38.0 / 39.0**: CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT
  - Extract: percentage (%), days after FOA, accepted instrument types
  - Common instruments: Bank Guarantee, Demand Draft, FDR, Online Transfer, Insurance Surety Bond
- **PRICE REDUCTION SCHEDULE (PRS) FOR DELAYED DELIVERY** (NOT "Liquidated Damages"):
  - Typically: 1/2% (0.5%) per complete week of delay, maximum 5% of total order value
  - Search phrases: "PRICE REDUCTION SCHEDULE", "PRS FOR DELAYED DELIVERY"

### EMD Mode Instrument Mapping (from AGENTS.md rules)
- "demand draft" → DD
- "banker's cheque", "imps", "neft", "rtgs", "online banking", "bank transfer" → BT
- "surety bond", "insurance surety" → SB
- "fixed deposit", "fdr" → FDR
- "bank guarantee", "bg" → BG
- Multiple instruments separated by " / "

### GeM Portal Indicators
- Bid number format: GEM/20XX/B/NNNNNNN
- Header: "Government e-Marketplace" or "GeM"
- "Processing Fee" and "Tender Fee" DO NOT exist in ATC — these come only from GeM portal cover page
- If text says "Processing Fee: Not Applicable" — that is correct

### Contract Type Detection
- Title contains "AMC" or "Annual Maintenance" → Services contract
- Title contains "SITC" or "Supply, Installation" → Goods+Installation
- Default → Goods

## CRITICAL EXTRACTION RULES
1. Extract ONLY values explicitly present in the provided document text.
2. Do NOT infer, guess, or hallucinate values.
3. Return null for any field not found in the text.
4. For payment terms: return INTEGER percentages (e.g. 70, not "70%").
5. For LD/PRS: return DECIMAL rate (e.g. 0.5, not "0.5%").
6. For SD/PBG mode: list all accepted instruments as a human-readable string.
7. The response must be a JSON object matching exactly the requested schema fields.
8. For custom_eligibility_criteria: Extract technical scope of past experience only; never extract Make in India / Local Content preference text.
9. For order values and turnover: Always preserve currency and multiplier units (e.g. 'Rs. 32.00 Lakh' or '₹32,00,000').
10. For eligibility_criterion_years: Output a clean single integer (e.g. 7, 5, 3).

{few_shot_section}"""

GAIL_GEM_USER_PROMPT_TEMPLATE = """Extract the following fields from this GAIL/GeM ATC tender document.
Return null for any field not found.

Fields needed: {field_descriptions}

ATC Document Text:
--- START OF DOCUMENT ---
{document_text}
--- END OF DOCUMENT ---"""


# ─────────────────────────────────────────────────────────────────────────────
# Field Map: display_key → (prompt_field_name, json_type, description, display_format)
# display_format: callable that converts raw LLM value → display string
# ─────────────────────────────────────────────────────────────────────────────
def _fmt_pct(v) -> Optional[str]:
    try:
        return f"{int(float(str(v)))}%"
    except Exception:
        return None

def _fmt_pct_decimal(v) -> Optional[str]:
    try:
        return f"{float(str(v))}%"
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
    # (prompt_field_name, json_schema_type, description, display_formatter)
    "payment_terms_supply_display": (
        "payment_terms_supply_pct", "integer",
        "% of contract value paid on supply/delivery/receipt of materials (integer, e.g. 70)",
        _fmt_pct,
    ),
    "payment_terms_installation_display": (
        "payment_terms_installation_pct", "integer",
        "% paid on installation/commissioning/site acceptance (integer, e.g. 30)",
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
        "Security Deposit validity duration in months (integer)",
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
        "Number of days for supply/delivery from date of purchase order (integer, e.g. 90)",
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
        # Remove existing example with matching anchor prefix to allow updates
        examples = [ex for ex in examples if ex.get("anchor_text", "")[:100] != anchor_text[:100]]
        examples.append({
            "anchor_text": anchor_text[:300],
            "value": value,
            "doc_type": doc_type,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        # Keep only highest-confidence examples
        examples.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        examples = examples[:_MEMORY_MAX_EXAMPLES_PER_FIELD]
        existing[field_key] = examples

        with open(_MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump({"version": 2, "examples_by_field": existing}, f, indent=2, ensure_ascii=False)
        logger.info("[LLM_MEMORY] Saved example for field '%s': %r", field_key, str(value)[:60])
    except Exception as e:
        logger.warning("[LLM_MEMORY] Could not save example: %s", e)


def record_correction(field_key: str, corrected_value: Any, anchor_context: str, doc_type: str = "GAIL_GOODS"):
    """
    Called when user manually corrects a field in the workspace review panel.
    Saved with higher confidence so it surfaces first in few-shot examples.
    """
    _save_memory(field_key, anchor_context, corrected_value, doc_type, confidence=0.99)
    logger.info("[LLM_MEMORY] User correction recorded for '%s'", field_key)


# ─────────────────────────────────────────────────────────────────────────────
# Few-Shot Section Builder
# ─────────────────────────────────────────────────────────────────────────────

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
        # Skip custom eligibility criteria to avoid few-shot domain/product bias
        if display_key == "custom_eligibility_criteria_display":
            continue
        examples = memory.get(display_key, []) or memory.get(prompt_field, [])
        if not examples:
            continue
        lines.append(f"\n## Learned Examples for `{prompt_field}`:")
        for ex in examples[:2]:  # Max 2 per field
            anon_val = _anonymize_few_shot_value(display_key, ex["value"])
            lines.append(f"  - Anchor: \"{ex['anchor_text'][:120]}\"")
            lines.append(f"    → Value Format Example: {json.dumps(anon_val)}")
    if not lines:
        return ""
    return "\n## Few-Shot Extraction Examples (Formatting guidelines from historical tenders):\n" + "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Dynamic response_schema builder for google-genai SDK v2
# ─────────────────────────────────────────────────────────────────────────────

def _build_response_schema(missing_fields: List[str]):
    """
    Build a typed google.genai.types.Schema for the requested fields.
    Using response_schema guarantees the model returns correctly typed JSON
    without any markdown fences or hallucinated formats.
    """
    try:
        from google.genai import types as gtypes
    except ImportError:
        return None

    _TYPE_MAP = {
        "integer": gtypes.Type.INTEGER,
        "number": gtypes.Type.NUMBER,
        "boolean": gtypes.Type.BOOLEAN,
        "string": gtypes.Type.STRING,
    }

    properties = {}
    for display_key in missing_fields:
        entry = FIELD_PROMPT_MAP.get(display_key)
        if not entry:
            continue
        prompt_field, json_type, _, _ = entry
        g_type = _TYPE_MAP.get(json_type, gtypes.Type.STRING)
        properties[prompt_field] = gtypes.Schema(type=g_type, nullable=True)

    if not properties:
        return None

    return gtypes.Schema(
        type=gtypes.Type.OBJECT,
        properties=properties,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main Resolver Class
# ─────────────────────────────────────────────────────────────────────────────

class LLMFieldResolver:
    """
    LLM fallback extractor for GAIL/GeM ATC fields.
    Supports Google Gemini API (v2 SDK, preferred) or any OpenAI-compatible provider.
    Only invoked for fields that remain NA after the full regex pipeline.

    Key improvements over legacy version:
    - Uses google-genai v2 SDK (google.genai) with response_schema for type-safe output
    - System instruction sent as a separate parameter (not concatenated into user prompt)
    - Dynamic response_schema built per-request so model returns only requested fields
    - Retry with exponential backoff on quota exhaustion (HTTP 429)
    - No markdown stripping needed (schema-constrained output is always valid JSON)
    """

    def __init__(
        self,
        *,
        provider: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        generic_llm_key = os.getenv("LLM_API_KEY", "").strip()

        # Prioritize explicit provider, then LLM_PROVIDER env, then auto-detect
        detected_provider = (provider or os.getenv("LLM_PROVIDER", "")).lower().strip()
        if not detected_provider:
            if anthropic_key or (generic_llm_key and generic_llm_key.startswith("sk-ant-")):
                detected_provider = "anthropic"
            elif gemini_key or (generic_llm_key and generic_llm_key.startswith("AIza")):
                detected_provider = "gemini"
            elif groq_key or (generic_llm_key and generic_llm_key.startswith("gsk_")):
                detected_provider = "groq"
            else:
                detected_provider = "anthropic" if anthropic_key else "gemini"

        self.provider = detected_provider

        # Base URL for OpenAI-compatible providers
        default_base_url = os.getenv("LLM_BASE_URL", os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions"))
        self.base_url = base_url or default_base_url

        if self.provider == "anthropic":
            self.api_key = api_key or anthropic_key or generic_llm_key
            self.model_name = model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
        elif self.provider == "groq":
            self.api_key = api_key or groq_key or generic_llm_key
            self.model_name = model or os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        else:
            self.api_key = api_key or gemini_key or generic_llm_key
            self.model_name = model or os.getenv("LLM_MODEL", os.getenv("GEMINI_MODEL", "gemini-flash-latest"))

        self.schema_model = os.getenv("LLM_SCHEMA_MODEL", "gemini-flash-lite-latest")
        self.enabled = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true"
        self._genai_client: Any = None  # google.genai.Client (v2 SDK) or legacy GenerativeModel
        self._sdk_type: Optional[str] = None  # "genai_v2" | "genai_legacy" | None

    def _init_gemini_client(self):
        """Initialize Gemini client, preferring the new google-genai v2 SDK."""
        if self._sdk_type is not None:
            return  # Already initialized
        if not self.api_key or "placeholder" in self.api_key.lower() or "fake" in self.api_key.lower():
            raise RuntimeError("LLM_FALLBACK: GEMINI_API_KEY/LLM_API_KEY not configured or is a placeholder.")

        # Try new google-genai v2 SDK first (preferred)
        try:
            from google import genai
            self._genai_client = genai.Client(api_key=self.api_key)
            self._sdk_type = "genai_v2"
            logger.info("[LLM_FALLBACK] Using google-genai v2 SDK (model: %s)", self.model_name)
            return
        except ImportError:
            logger.debug("[LLM_FALLBACK] google-genai not installed, trying legacy...")

        # Fallback to deprecated google-generativeai
        try:
            genai_legacy = importlib.import_module("google.generativeai")
            configure = getattr(genai_legacy, "configure", None)
            generative_model = getattr(genai_legacy, "GenerativeModel", None)
            if not callable(configure) or not callable(generative_model):
                raise ImportError("google.generativeai legacy SDK is unavailable")
            configure(api_key=self.api_key)
            self._genai_client = generative_model(
                model_name=self.model_name,
                generation_config={
                    "temperature": 0.1,
                    "top_p": 0.95,
                    "max_output_tokens": 2048,  # Raised: match v2 SDK config
                    "response_mime_type": "application/json",
                }
            )
            self._sdk_type = "genai_legacy"
            logger.info("[LLM_FALLBACK] Using legacy google-generativeai SDK (model: %s)", self.model_name)
            return
        except ImportError:
            raise RuntimeError(
                "Neither google-genai nor google-generativeai is installed. "
                "Run: pip install google-genai"
            )

    def _call_gemini_v2(
        self,
        system_instruction: str,
        user_prompt: str,
        missing_fields: List[str],
    ) -> str:
        """
        Call Gemini using the new google-genai v2 SDK with response_schema.

        Important: response_schema and system_instruction cannot be combined on
        the gemini-flash-latest alias — it breaks JSON output. Instead we:
        1. Use gemini-flash-lite-latest (confirmed to support response_schema correctly)
        2. Embed the system instruction at the top of the user content string.
        """
        from google.genai import types as gtypes

        response_schema = _build_response_schema(missing_fields)

        # Embed system instruction in content (not as separate param) to preserve schema mode
        combined_content = f"{system_instruction}\n\n{user_prompt}"

        config_kwargs: Dict[str, Any] = dict(
            temperature=0.1,
            top_p=0.95,
            max_output_tokens=2048,  # Raised: addresses + 3 contact blocks need space
            response_mime_type="application/json",
        )
        if response_schema is not None:
            config_kwargs["response_schema"] = response_schema

        config = gtypes.GenerateContentConfig(**config_kwargs)

        # Use schema-capable model (flash-lite-latest confirmed working)
        model_to_use = self.schema_model

        # Retry up to 3 times on quota exhaustion (429)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                client = self._genai_client
                response = client.models.generate_content(
                    model=model_to_use,
                    contents=combined_content,
                    config=config,
                )
                text = response.text
                if not text:
                    # Schema mode returned empty — try without schema as fallback
                    logger.warning("[LLM_FALLBACK] Empty response.text from %s with schema, retrying without schema", model_to_use)
                    config_fallback = gtypes.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                        max_output_tokens=2048,  # Raised: match primary config
                    )
                    response = client.models.generate_content(
                        model=self.model_name,
                        contents=combined_content,
                        config=config_fallback,
                    )
                    text = response.text or "{}"
                return text.strip()
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    wait = (attempt + 1) * 15  # 15s, 30s, 45s
                    logger.warning(
                        "[LLM_FALLBACK] Rate limited (429). Waiting %ds (attempt %d/%d)...",
                        wait, attempt + 1, max_retries,
                    )
                    time.sleep(wait)
                    if attempt == max_retries - 1:
                        raise
                else:
                    raise

        return "{}"

    def _call_gemini_legacy(self, system_instruction: str, user_prompt: str) -> str:
        """Call Gemini using the deprecated google-generativeai SDK (fallback path)."""
        client = self._genai_client
        response = client.generate_content(
            [{"role": "user", "parts": [system_instruction + "\n\n" + user_prompt]}]
        )
        return response.text.strip()

    def _call_anthropic(self, system_instruction: str, user_prompt: str, timeout: int = 45) -> str:
        """Call Anthropic Claude API via official anthropic SDK with urllib fallback."""
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key, timeout=float(timeout))
            response = client.messages.create(
                model=self.model_name,
                max_tokens=4096,
                system=system_instruction,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw = response.content[0].text.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            return raw
        except ImportError:
            # Fallback to direct HTTP using urllib if SDK not installed
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": self.model_name,
                "max_tokens": 4096,
                "temperature": 0.1,
                "system": system_instruction,
                "messages": [{"role": "user", "content": user_prompt}],
            }
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw = data["content"][0]["text"].strip()
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
                return raw

    def _call_openai_compatible(self, system_prompt: str, user_prompt: str, timeout: int = 30) -> str:
        """Call any OpenAI-compatible API endpoint via standard Python urllib (no external SDK required)."""
        import urllib.request

        base_url = getattr(self, "base_url", None) or os.getenv("LLM_BASE_URL", os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions"))
        logger.info("[LLM_FALLBACK] resolver base_url=%r, provider=%r, model=%r", base_url, getattr(self, "provider", "unknown"), getattr(self, "model_name", "unknown"))

        url = base_url.strip()
        if url and not url.endswith("/chat/completions"):
            url = url.rstrip("/") + "/chat/completions"
        
        logger.info("[LLM_FALLBACK] API request started to %s", url)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = getattr(response, "status", getattr(response, "code", 200))
            logger.info("[LLM_FALLBACK] API request completed with status %s", status_code)
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]

    def _detect_doc_type(self, text: str) -> str:
        """Detect GAIL contract type from text content."""
        text_l = text.lower()
        if any(kw in text_l for kw in ["annual maintenance", " amc ", "amc contract"]):
            return "GAIL_AMC_SERVICES"
        if any(kw in text_l for kw in ["sitc", "supply, installation, testing", "supply installation"]):
            return "GAIL_SITC_GOODS"
        return "GAIL_GOODS"

    def _build_prompts(
        self,
        full_text: str,
        missing_fields: List[str],
        few_shot_section: str,
    ) -> Tuple[str, str]:
        """Build (system_instruction, user_prompt) for the API call."""
        # Truncate text to fit within model context without dropping mid-document clauses
        # Groq HTTP gateway enforces ~30 KB payload limit (approx 20,000 chars text payload)
        # Anthropic Claude (200k tokens) and Gemini can process up to 800,000 chars without truncation
        max_chars = 20_000 if getattr(self, "provider", "") in ("groq", "openai") or "groq.com" in getattr(self, "base_url", "") else 800_000
        if len(full_text) > max_chars:
            third = max_chars // 3
            # Extract middle slice around key ATC terms if present
            mid_start = len(full_text) // 2 - (third // 2)
            mid_match = re.search(r"(?:SECTION-II|BID EVALUATION CRITERIA|TECHNICAL CRITERIA|ELIGIBILITY CRITERIA|\bBEC\b|PAYMENT|PRICE REDUCTION|SECURITY DEPOSIT|SPECIAL CONDITIONS)", full_text, re.IGNORECASE)
            if mid_match and third < mid_match.start() < (len(full_text) - third):
                mid_start = max(0, mid_match.start() - (third // 2))
            
            head_part = full_text[:third]
            mid_part = full_text[mid_start:mid_start + third]
            tail_part = full_text[-third:]
            full_text = f"{head_part}\n\n[... SECTION TRUNCATED ...]\n\n{mid_part}\n\n[... SECTION TRUNCATED ...]\n\n{tail_part}"

        # Concise field description list for the user prompt
        field_descs = []
        for dk in missing_fields:
            entry = FIELD_PROMPT_MAP.get(dk)
            if entry:
                field_descs.append(f"- {entry[0]}: {entry[2]}")
        field_descriptions = "\n".join(field_descs)

        system_instruction = GAIL_GEM_SYSTEM_INSTRUCTION.format(
            few_shot_section=few_shot_section
        )
        user_prompt = GAIL_GEM_USER_PROMPT_TEMPLATE.format(
            field_descriptions=field_descriptions,
            document_text=full_text,
        )
        return system_instruction, user_prompt

    def _anchor_monetary_with_multipliers(self, val_str: str, full_text: str, normalized_text: str) -> Optional[str]:
        """
        Anchors monetary and numeric threshold values by taking into account Indian
        numbering multipliers (Lakh / Lac / Lacs / Lakhs, Crore / Cr / Crores) and tabular
        header multipliers (e.g. 32.00 under '(Rs. in Lakhs)' matches 3200000 or Rs. 32.00 Lac).
        """
        if not val_str:
            return None

        # 1. Check for standard sentinel / exemption phrases
        val_lower = val_str.lower().strip()
        if any(p in val_lower for p in ["not applicable", "n/a", "exempt", "nil", "must be positive", "positive"]):
            m = re.search(re.escape(val_str), normalized_text, re.IGNORECASE)
            if m:
                pos = m.start()
                return normalized_text[max(0, pos - 100): min(len(normalized_text), m.end() + 150)]
            for phrase in ["not applicable", "n/a", "exempt", "must be positive", "positive net worth", "positive"]:
                if phrase in val_lower:
                    m_p = re.search(re.escape(phrase), normalized_text, re.IGNORECASE)
                    if m_p:
                        pos = m_p.start()
                        return normalized_text[max(0, pos - 100): min(len(normalized_text), m_p.end() + 150)]

        # 2. Extract numeric values from LLM string
        clean_s = re.sub(r"[₹,]|(?:rs\.?|inr)\s*", "", val_str, flags=re.IGNORECASE).strip()
        nums = re.findall(r"\d+(?:\.\d+)?", clean_s)
        if not nums:
            return None

        candidates: List[Tuple[str, bool]] = []  # (token, is_bare_small_number)
        for n_str in nums:
            try:
                n_float = float(n_str)
            except ValueError:
                continue

            # A. Exact representation
            is_small = n_float < 10000
            candidates.append((n_str, is_small))
            if n_float.is_integer():
                candidates.append((str(int(n_float)), is_small))
                candidates.append((f"{int(n_float)}.00", is_small))
                candidates.append((f"{int(n_float)}.0", is_small))
            else:
                candidates.append((f"{n_float:.2f}", is_small))

            # B. If large number (e.g. 3,200,000), check Lakh (32) and Crore (0.32) representations
            if n_float >= 10000:
                lakh_val = n_float / 100000.0
                if lakh_val.is_integer():
                    candidates.append((str(int(lakh_val)), True))
                    candidates.append((f"{int(lakh_val)}.00", True))
                    candidates.append((f"{int(lakh_val)}.0", True))
                else:
                    candidates.append((f"{lakh_val:.2f}", True))
                    candidates.append((f"{lakh_val:.1f}", True))

                crore_val = n_float / 10000000.0
                if crore_val.is_integer():
                    candidates.append((str(int(crore_val)), True))
                    candidates.append((f"{int(crore_val)}.00", True))
                else:
                    candidates.append((f"{crore_val:.2f}", True))
                    candidates.append((f"{crore_val:.1f}", True))

            # C. If small number (e.g. 32 or 32.00), check if text has full rupee expansions: 32,00,000 or 3200000
            elif 0 < n_float < 10000:
                full_lakh = int(round(n_float * 100000))
                candidates.append((str(full_lakh), False))
                s_fl = str(full_lakh)
                if len(s_fl) > 3:
                    last3 = s_fl[-3:]
                    rest = s_fl[:-3]
                    fmt = ""
                    while len(rest) > 2:
                        fmt = "," + rest[-2:] + fmt
                        rest = rest[:-2]
                    fmt = rest + fmt + "," + last3
                    candidates.append((fmt, False))

        # Check each candidate token against text
        for token, is_bare_small in candidates:
            pat = r"(?<![\d\.])" + re.escape(token) + r"(?![\d\.])"
            for m in re.finditer(pat, normalized_text):
                pos = m.start()
                if not is_bare_small:
                    return normalized_text[max(0, pos - 100): min(len(normalized_text), m.end() + 150)]

                # For small numbers, verify nearby context or table header
                window = normalized_text[max(0, pos - 150): min(len(normalized_text), pos + 150)].lower()
                unit_keywords = ["lakh", "lac", "lacs", "lakhs", "cr", "crore", "crores", "rs", "₹", "inr", "value", "turnover", "order", "capital", "solvency"]
                if any(kw in window for kw in unit_keywords):
                    return normalized_text[max(0, pos - 100): min(len(normalized_text), m.end() + 150)]

                preceding_block = normalized_text[max(0, pos - 800): pos].lower()
                if any(h in preceding_block for h in ["in lakh", "in lac", "in lacs", "in lakhs", "rs. in", "₹ in"]):
                    return normalized_text[max(0, pos - 100): min(len(normalized_text), m.end() + 150)]

        return None

    def _validate_and_anchor(self, field_key: str, value: Any, full_text: str) -> Optional[str]:
        """
        Non-hallucination check: verify that the extracted value appears verbatim
        or numerically in the source text. Returns anchor snippet or None if invalid.
        """
        if value is None:
            return None
        str_val = str(value).strip()
        if not str_val or str_val in ("null", "None", "NA", ""):
            return None

        # Booleans don't need anchoring
        if isinstance(value, bool):
            return "boolean_value"

        # Normalized text for robust matching (collapse whitespace and linebreaks)
        normalized_text = re.sub(r"\s+", " ", full_text)

        if field_key == "custom_eligibility_criteria_display":
            # 1. First attempt: numeric tokens matching
            numeric_tokens = set(re.findall(r"\d+(?:[\.,]\d+)?", str_val))
            if numeric_tokens:
                matched_count = 0
                for token in numeric_tokens:
                    clean_tok = token.strip(",. ")
                    if not clean_tok:
                        continue
                    if clean_tok in full_text or clean_tok in normalized_text:
                        matched_count += 1
                    elif self._anchor_monetary_with_multipliers(clean_tok, full_text, normalized_text):
                        matched_count += 1
                if (matched_count / len(numeric_tokens)) >= 0.5:
                    for token in numeric_tokens:
                        clean_tok = token.strip(",. ")
                        m = re.search(re.escape(clean_tok), full_text)
                        if m:
                            pos = m.start()
                            return full_text[max(0, pos - 100): min(len(full_text), m.end() + 150)]
                    return "numeric_tokens_matched"

            # 2. Second attempt: semantic keyword anchoring from BEC
            stopwords = {"should", "shall", "which", "their", "there", "these", "those", "have", "with", "from", "that", "this", "been", "will", "would", "could", "order", "value", "clause", "table", "tender", "bidder", "bidders", "criteria"}
            words = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", str_val) if w.lower() not in stopwords]
            if len(words) >= 3:
                matched_words = [w for w in words if re.search(r"\b" + re.escape(w) + r"\b", normalized_text, re.IGNORECASE)]
                if len(matched_words) >= 3 and (len(matched_words) / len(words)) >= 0.4:
                    m = re.search(r"\b" + re.escape(matched_words[0]) + r"\b", normalized_text, re.IGNORECASE)
                    if m:
                        pos = m.start()
                        return normalized_text[max(0, pos - 100): min(len(normalized_text), m.end() + 150)]
                    return "semantic_keywords_matched"

        # Check for eligibility_criterion_years_display
        if field_key == "eligibility_criterion_years_display":
            clean_yr = re.search(r"\b(\d{1,2})\b", str_val)
            if clean_yr:
                yr_val = clean_yr.group(1)
                m_yr = (
                    re.search(rf"\b{yr_val}\s*(?:years?|yrs?|financial\s+years?)\b", normalized_text, re.IGNORECASE)
                    or re.search(rf"(?:preceding|past|previous|experience\s+of)\s+[^.\n]{{0,30}}\b{yr_val}\b", normalized_text, re.IGNORECASE)
                )
                if m_yr:
                    pos = m_yr.start()
                    return normalized_text[max(0, pos - 100): min(len(normalized_text), m_yr.end() + 150)]

        # Monetary and threshold fields with multiplier recognition
        if any(k in field_key for k in ["order_value", "turnover", "working_capital", "solvency", "net_worth"]):
            mon_anchor = self._anchor_monetary_with_multipliers(str_val, full_text, normalized_text)
            if mon_anchor:
                return mon_anchor

        # 1. Numeric value matching (integers and decimals)
        num_str = str_val.replace("%", "").replace("₹", "").replace(",", "").strip()
        if num_str and re.match(r"^\d[\d\.]*$", num_str):
            num_pattern = re.escape(num_str[:8])
            m = re.search(num_pattern, full_text) or re.search(num_pattern, normalized_text)
            if m:
                pos = m.start()
                return full_text[max(0, pos - 100): min(len(full_text), m.end() + 150)]
            mon_anchor = self._anchor_monetary_with_multipliers(str_val, full_text, normalized_text)
            if mon_anchor:
                return mon_anchor

        # 2. String values: direct case-insensitive search
        if isinstance(value, str) and len(value) > 2:
            m = (
                re.search(re.escape(value), full_text, re.IGNORECASE)
                or re.search(re.escape(value), normalized_text, re.IGNORECASE)
            )
            if m:
                pos = m.start()
                return full_text[max(0, pos - 100): min(len(full_text), m.end() + 150)]

            # Keyword-based matching (any 3+ char token present in text)
            key_words = [w for w in re.findall(r"\w+", value) if len(w) > 2][:4]
            if key_words and all(
                re.search(re.escape(w), normalized_text, re.IGNORECASE) for w in key_words
            ):
                m = re.search(re.escape(key_words[0]), full_text, re.IGNORECASE)
                if m:
                    pos = m.start()
                    return full_text[max(0, pos - 100): min(len(full_text), m.end() + 150)]

        return None

    def _map_to_display_value(self, display_key: str, raw_value: Any) -> Optional[str]:
        """Convert raw LLM output value to the display string format used in infosheet_data."""
        if raw_value is None:
            return None
        entry = FIELD_PROMPT_MAP.get(display_key)
        if not entry:
            return str(raw_value).strip() or None
        _, _, _, formatter = entry
        try:
            return formatter(raw_value)
        except Exception:
            return str(raw_value).strip() or None

    def resolve(
        self,
        atc_full_text: str,
        missing_display_keys: List[str],
        doc_type: Optional[str] = None,
    ) -> Dict[str, Dict[str, str]]:
        """
        Main entry point. Returns dict of {display_key: {"value": val, "source": "llm"}}
        for fields successfully resolved by LLM.
        Gracefully returns empty dict on any error.
        """
        if not self.enabled:
            logger.info("[LLM_FALLBACK] Disabled via LLM_FALLBACK_ENABLED=false")
            return {}
        if not atc_full_text or not missing_display_keys:
            return {}

        # Filter to known fields only
        known_missing = [k for k in missing_display_keys if k in FIELD_PROMPT_MAP]
        if not known_missing:
            return {}

        logger.info(
            "[LLM_FALLBACK] Resolving %d missing fields via LLM (%s): %s",
            len(known_missing), self.provider, known_missing,
        )

        # Provider validation and initializations
        if self.provider == "anthropic":
            if not self.api_key:
                logger.warning("[LLM_FALLBACK] ANTHROPIC_API_KEY/LLM_API_KEY not configured — skipping LLM resolution")
                return {}
            logger.info("[LLM_FALLBACK] Using Anthropic Claude API with model %s", self.model_name)
        elif self.provider == "gemini":
            try:
                self._init_gemini_client()
            except Exception as e:
                groq_key = os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY")
                if groq_key and "placeholder" not in groq_key.lower():
                    logger.info("[LLM_FALLBACK] Gemini init failed (%s). Switching to Groq API LLM fallback...", e)
                    self.provider = "groq"
                    self.api_key = groq_key
                    self.model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
                    self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions")
                else:
                    logger.warning("[LLM_FALLBACK] %s — skipping LLM resolution", e)
                    return {}
        elif self.provider == "groq":
            if not self.api_key:
                logger.warning("[LLM_FALLBACK] GROQ_API_KEY/LLM_API_KEY not configured — skipping LLM resolution")
                return {}
            logger.info("[LLM_FALLBACK] Using Groq OpenAI-compatible endpoint %s with model %s", self.base_url, self.model_name)

        detected_type = doc_type or self._detect_doc_type(atc_full_text)
        memory = _load_memory()
        few_shot_section = _build_few_shot_section(known_missing, memory)

        system_instruction, user_prompt = self._build_prompts(
            atc_full_text, known_missing, few_shot_section
        )

        # ── API Call Execution with Retry Loop & Error Classification ──────────────
        raw_text = "{}"
        max_retries = int(os.getenv("LLM_MAX_RETRIES", "3"))
        no_retry_status_codes = {400, 401, 403, 404, 413, 422}
        
        attempt = 0
        call_success = False

        while attempt < max_retries:
            attempt += 1
            t0 = time.time()
            try:
                if self.provider == "anthropic":
                    try:
                        raw_text = self._call_anthropic(system_instruction, user_prompt, timeout=45)
                    except Exception as anthropic_err:
                        groq_key = os.getenv("GROQ_API_KEY", "").strip()
                        if groq_key and groq_key.startswith("gsk_") and "placeholder" not in groq_key.lower():
                            logger.warning("[LLM_FALLBACK][Layer 2] Anthropic call failed (%s). Falling back to Groq API LLM...", anthropic_err)
                            self.provider = "groq"
                            self.api_key = groq_key
                            self.model_name = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
                            self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions")
                            system_instruction, user_prompt = self._build_prompts(atc_full_text, known_missing, few_shot_section)
                            raw_text = self._call_openai_compatible(system_instruction, user_prompt, timeout=30)
                        else:
                            raise anthropic_err
                elif self.provider == "gemini":
                    try:
                        if self._sdk_type == "genai_v2":
                            raw_text = self._call_gemini_v2(system_instruction, user_prompt, known_missing)
                        else:
                            raw_text = self._call_gemini_legacy(system_instruction, user_prompt)
                            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                            raw_text = re.sub(r"\s*```$", "", raw_text)
                    except Exception as gemini_err:
                        groq_key = os.getenv("GROQ_API_KEY", "").strip()
                        if groq_key and groq_key.startswith("gsk_") and "placeholder" not in groq_key.lower():
                            logger.warning("[LLM_FALLBACK][Layer 2] Gemini API call failed (%s). Falling back to Groq API LLM...", gemini_err)
                            self.provider = "groq"
                            self.api_key = groq_key
                            self.model_name = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
                            self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1/chat/completions")
                            system_instruction, user_prompt = self._build_prompts(atc_full_text, known_missing, few_shot_section)
                            raw_text = self._call_openai_compatible(system_instruction, user_prompt, timeout=30)
                        else:
                            raise gemini_err
                elif self.provider == "groq":
                    raw_text = self._call_openai_compatible(system_instruction, user_prompt, timeout=30)
                else:
                    raw_text = self._call_openai_compatible(system_instruction, user_prompt, timeout=30)

                elapsed = time.time() - t0
                logger.info("[LLM_FALLBACK][Layer 2] LLM call succeeded on attempt %d (%s/%s in %.2fs)", attempt, self.provider, self._sdk_type or "openai", elapsed)
                call_success = True
                break

            except urllib.error.HTTPError as e:
                status_code = e.code
                reason = getattr(e, "reason", str(e))
                logger.error("[LLM_FALLBACK][Layer 2] HTTP %d on attempt %d: %s", status_code, attempt, reason)

                if status_code in no_retry_status_codes:
                    logger.error("[LLM_FALLBACK][Layer 2] Non-retryable error %d — falling back to heuristics immediately", status_code)
                    break

                if attempt >= max_retries:
                    logger.error("[LLM_FALLBACK][Layer 2] Max retries (%d) exceeded — falling back to heuristics", max_retries)
                    break

                delay = (2 ** attempt) + random.uniform(0, 1)
                logger.info("[LLM_FALLBACK][Layer 2] Retrying in %.2f seconds...", delay)
                time.sleep(delay)

            except urllib.error.URLError as e:
                err_msg = str(e)
                if "timed out" in err_msg.lower():
                    logger.warning("[LLM_FALLBACK][Layer 2] Request timed out on attempt %d — retrying once with shorter timeout", attempt)
                else:
                    logger.error("[LLM_FALLBACK][Layer 2] URLError on attempt %d: %s", attempt, err_msg)
                
                if attempt >= max_retries:
                    logger.error("[LLM_FALLBACK][Layer 2] Max retries exceeded after network error — falling back to heuristics")
                    break

                delay = (2 ** attempt) + random.uniform(0, 1)
                logger.info("[LLM_FALLBACK][Layer 2] Retrying in %.2f seconds...", delay)
                time.sleep(delay)

            except Exception as e:
                err_str = str(e)
                code_match = re.search(r"\b(400|401|403|404|413|422)\b", err_str)
                if code_match or "api key not valid" in err_str.lower() or "unauthorized" in err_str.lower():
                    status_code = int(code_match.group(1)) if code_match else 400
                    logger.error("[LLM_FALLBACK][Layer 2] Non-retryable client error (%s) on attempt %d — falling back to heuristics immediately: %s", status_code, attempt, e)
                    break

                logger.error("[LLM_FALLBACK][Layer 2] Unexpected error on attempt %d: %s", attempt, e, exc_info=True)
                if attempt >= max_retries:
                    logger.error("[LLM_FALLBACK][Layer 2] Max retries exceeded after unexpected error — falling back to heuristics")
                    break

                delay = (2 ** attempt) + random.uniform(0, 1)
                logger.info("[LLM_FALLBACK][Layer 2] Retrying in %.2f seconds...", delay)
                time.sleep(delay)

        if not call_success:
            logger.info("[LLM_FALLBACK] Provider failure encountered — executing local heuristics fallback")
            heuristics_res = self._resolve_local_heuristics(atc_full_text, known_missing)
            heuristics_res["_llm_status"] = {"status": "provider_error", "provider": self.provider}
            return heuristics_res

        # ── Parse response ────────────────────────────────────────────────────
        try:
            llm_data: Dict[str, Any] = json.loads(raw_text)
        except json.JSONDecodeError as e:
            logger.error("[LLM_FALLBACK] JSON parse error: %s | raw: %r", e, raw_text[:200])
            logger.info("[LLM_FALLBACK] Falling back to heuristics: reason=json_parse_error")
            return self._resolve_local_heuristics(atc_full_text, known_missing)

        # ── Map prompt field names back to display keys ────────────────────────
        prompt_to_display = {entry[0]: dk for dk, entry in FIELD_PROMPT_MAP.items() if dk in known_missing}
        results: Dict[str, Dict[str, str]] = {}

        for prompt_field, raw_value in llm_data.items():
            display_key = prompt_to_display.get(prompt_field)
            if not display_key or raw_value is None:
                continue

            # Non-hallucination validation
            anchor_snippet = self._validate_and_anchor(display_key, raw_value, atc_full_text)
            if anchor_snippet is None and not isinstance(raw_value, bool):
                logger.warning(
                    "[LLM_FALLBACK] Could not anchor '%s'=%r in source text — skipping",
                    display_key, raw_value,
                )
                continue

            display_val = self._map_to_display_value(display_key, raw_value)
            if display_val:
                results[display_key] = {"value": display_val, "source": "llm", "layer": "layer_2"}
                # Learning memory is gated behind human review (record_correction) or validated ground truth seeds
                # Runtime auto-writes are bypassed to prevent hallucination pollution.
                logger.debug("[LLM_MEMORY] Runtime auto-write bypassed for '%s' (gated behind human review)", display_key)

        logger.info("[LLM_FALLBACK] Resolved %d/%d fields via %s", len(results), len(known_missing), self.provider)

        if not results:
            logger.info("[LLM_FALLBACK] Falling back to heuristics: reason=zero_anchored_results")
            return self._resolve_local_heuristics(atc_full_text, known_missing)
        return results

    def _resolve_local_heuristics(self, full_text: str, missing_keys: List[str]) -> Dict[str, Dict[str, str]]:
        """Local rule-based heuristic engine executed when LLM is unavailable or fails."""
        results = {}
        if not full_text or not missing_keys:
            return results

        logger.info(
            "[LOCAL_HEURISTICS] Executing local heuristic fallback for %d missing keys: %s",
            len(missing_keys), missing_keys,
        )

        # 1. Payment terms supply/installation %
        if "payment_terms_supply_display" in missing_keys or "payment_terms_installation_display" in missing_keys:
            m_s = (
                re.search(r"(\d+)\%\s*(?:Payment\s+of\s+Supply|portion\s+on\s+receipt|against\s+supply|upon\s+receipt)", full_text, re.IGNORECASE)
                or re.search(r"(\d+)\%\s*(?:payment\s+against\s+delivery)", full_text, re.IGNORECASE)
            )
            m_i = (
                re.search(r"(\d+)\%\s*(?:payment\s+of\s+installation|portion[''s]+and\s+payment|installation\s+&\s+commissioning)", full_text, re.IGNORECASE)
                or re.search(r"(\d+)\%\s*(?:after\s+installation)", full_text, re.IGNORECASE)
            )
            if m_s:
                results["payment_terms_supply_display"] = {"value": f"{m_s.group(1)}%", "source": "heuristic_regex"}
            if m_i:
                results["payment_terms_installation_display"] = {"value": f"{m_i.group(1)}%", "source": "heuristic_regex"}

        # 2. Custom eligibility criteria & Work Order values
        if "custom_eligibility_criteria_display" in missing_keys:
            m_bec = re.search(
                r"(?:Table-1|Minimum\s+Executed\s+Order\s+value)(?:[^\n]*\n){1,8}",
                full_text, re.IGNORECASE,
            )
            if m_bec:
                window_text = m_bec.group(0)
                cutoff_idx = len(window_text)
                caps_m = re.search(r"\n\s*[A-Z]{3,}(?:\s+[A-Z]{3,})+", window_text)
                if caps_m and caps_m.start() > 0:
                    cutoff_idx = min(cutoff_idx, caps_m.start())
                clause_m = re.search(r"\n\s*(?:\d+\.\d+|Clause|\b[A-Z]\b\.)", window_text, re.IGNORECASE)
                if clause_m and clause_m.start() > 0:
                    cutoff_idx = min(cutoff_idx, clause_m.start())
                
                sliced_text = window_text[:cutoff_idx].strip()
                clean_bec = re.sub(r"\s+", " ", sliced_text)
                bec_content_no_header = re.sub(r"Table-\d+", "", clean_bec, flags=re.IGNORECASE)
                if re.search(r"\d", bec_content_no_header):
                    results["custom_eligibility_criteria_display"] = {"value": clean_bec[:500].strip(), "source": "heuristic_regex"}

        # Work Order 1 / 2 / 3 values extraction
        if "order_value_1_display" in missing_keys:
            m_wo1 = re.search(r"(?:single|1st|one)\s+(?:order|work|po)[^\n]{0,80}?(?:value\s+of|valuing|rs\.?)\s*([\d\.,\s]+(?:lacs|lakhs|crore|cr)?)", full_text, re.IGNORECASE)
            if m_wo1:
                results["order_value_1_display"] = {"value": m_wo1.group(1).strip(), "source": "heuristic_regex"}

        if "order_value_2_display" in missing_keys:
            m_wo2 = re.search(r"(?:two|2nd)\s+(?:orders|works|pos)[^\n]{0,80}?(?:value\s+of|valuing|rs\.?)\s*([\d\.,\s]+(?:lacs|lakhs|crore|cr)?)", full_text, re.IGNORECASE)
            if m_wo2:
                results["order_value_2_display"] = {"value": m_wo2.group(1).strip(), "source": "heuristic_regex"}

        if "order_value_3_display" in missing_keys:
            m_wo3 = re.search(r"(?:three|3rd)\s+(?:orders|works|pos)[^\n]{0,80}?(?:value\s+of|valuing|rs\.?)\s*([\d\.,\s]+(?:lacs|lakhs|crore|cr)?)", full_text, re.IGNORECASE)
            if m_wo3:
                results["order_value_3_display"] = {"value": m_wo3.group(1).strip(), "source": "heuristic_regex"}

        # 3. Financial Criteria (Turnover, Working Capital, Net Worth, Solvency)
        if "avg_annual_turnover_value_display" in missing_keys:
            m_to = re.search(r"(?:annual\s+turnover|turn\s*over)[^\n]{0,80}?(?:rs\.?|\b)\s*([\d\.,\s]+(?:lacs|lakhs|crore|cr)?)", full_text, re.IGNORECASE)
            if m_to and re.search(r"\d", m_to.group(1)):
                results["avg_annual_turnover_value_display"] = {"value": m_to.group(1).strip(), "source": "heuristic_regex"}

        if "working_capital_value_display" in missing_keys:
            m_wc = re.search(r"(?:working\s+capital)[^\n]{0,80}?(?:rs\.?|\b)\s*([\d\.,\s]+(?:lacs|lakhs|crore|cr)?)", full_text, re.IGNORECASE)
            if m_wc and re.search(r"\d", m_wc.group(1)):
                match_context = full_text[max(0, m_wc.start()-100):min(len(full_text), m_wc.end()+100)].lower()
                if not any(k in match_context for k in ["bank guarantee", "bank net worth", "issuing bank", "scheduled bank"]):
                    results["working_capital_value_display"] = {"value": m_wc.group(1).strip(), "source": "heuristic_regex"}

        # 4. Client Email / Phone / Name
        if "client_email_1_display" in missing_keys:
            m_em = re.search(r"([a-zA-Z0-9\._%+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,})", full_text)
            if m_em:
                results["client_email_1_display"] = {"value": m_em.group(1).strip(), "source": "heuristic_regex"}

        if "client_name_1_display" in missing_keys:
            m_nm = re.search(
                r"(?:Name[:\-\s]+|Shri?\.?\s*)([A-Z][a-zA-Z\.\s]{2,35})(?=\s*\,|\s*\n|\s*Designation|\Z)",
                full_text,
            )
            if m_nm:
                results["client_name_1_display"] = {"value": m_nm.group(0).strip(), "source": "heuristic_regex"}

        if "eligibility_criterion_years_display" in missing_keys:
            m_yr = re.search(r"(?:preceding|past|previous)\s+(?:financial\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?", full_text, re.IGNORECASE)
            if m_yr:
                results["eligibility_criterion_years_display"] = {"value": m_yr.group(1).strip(), "source": "heuristic_regex"}

        return results
