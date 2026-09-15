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

# =============================================================================
# MODEL IDENTIFIERS & PRICING CONSTANTS
# Verified on 2026-09-07 via https://docs.claude.com/en/docs/about-claude/pricing
# If updating models or pricing, re-verify against the official docs URL above.
# =============================================================================
ROLE_1_MODEL_DEFAULT = os.getenv("ANTHROPIC_ROLE1_MODEL", "claude-haiku-4-5-20251001")
ROLE_2_MODEL_DEFAULT = os.getenv("ANTHROPIC_ROLE2_MODEL", "claude-sonnet-5")

# Capped max output token ceilings (tight ceilings preventing runaway output cost)
ROLE_1_MAX_TOKENS = int(os.getenv("ANTHROPIC_ROLE1_MAX_TOKENS", "600"))
ROLE_2_MAX_TOKENS = int(os.getenv("ANTHROPIC_ROLE2_MAX_TOKENS", "800"))
ROLE_1_MAX_TOKENS_RETRY = 1000  # Automatic single retry cap on truncation

# Claude Haiku 4.5 Pricing ($ per million tokens)
# Live pricing: $1.00 / MTok base input, $5.00 / MTok output
HAIKU_45_INPUT_PRICE_PER_M = 1.00
HAIKU_45_OUTPUT_PRICE_PER_M = 5.00
HAIKU_45_CACHE_WRITE_5M_PER_M = 1.25
HAIKU_45_CACHE_WRITE_1H_PER_M = 2.00
HAIKU_45_CACHE_READ_PER_M = 0.10

# Claude Sonnet 5 Pricing ($ per million tokens)
# Permanent rate: $2.00 / MTok base input, $10.00 / MTok output
SONNET_5_INPUT_PRICE_PER_M = 2.00
SONNET_5_OUTPUT_PRICE_PER_M = 10.00
SONNET_5_CACHE_WRITE_5M_PER_M = 2.50
SONNET_5_CACHE_WRITE_1H_PER_M = 4.00
SONNET_5_CACHE_READ_PER_M = 0.20

# Token budget per tender (gates strictly on integer raw_processing_tokens = in + out + cache_create + cache_read)
LLM_TOKEN_BUDGET_PER_TENDER = int(os.getenv("LLM_TOKEN_BUDGET_PER_TENDER", "20000"))

# STEP 4 fix: extract_scoped_context's opening bid-summary slice and final combined
# cap previously allowed up to 18,000 / 25,000 characters per category, driving
# ~7,100 input tokens per Role 1 call. Capped to the 6,000-8,000 char target range.
SCOPED_CONTEXT_BID_SUMMARY_OPENING_CHARS = 5000
SCOPED_CONTEXT_MAX_CHARS = 6000

# Path where few-shot examples accumulate across all parsed documents
_MEMORY_DIR = Path(__file__).parent.parent / "storage" / "llm_memory"
_MEMORY_FILE = _MEMORY_DIR / "extraction_memory.json"
_MEMORY_MAX_EXAMPLES_PER_FIELD = int(os.getenv("LLM_MAX_EXAMPLES_PER_FIELD", "5"))

# Category mappings for Role 1 scoped batching (avoids sending full text or paying repeated overhead)
FIELD_SECTION_CATEGORY: Dict[str, str] = {
    # 0. Basic Bid Summary & Fees
    "tender_value_display": "bid_summary",
    "emd_amount_display": "bid_summary",
    "emd_required_display": "bid_summary",
    "emd_mode_display": "bid_summary",
    "tender_fee_amount_display": "bid_summary",
    "tender_fee_mode_display": "bid_summary",
    "processing_fee_amount_display": "bid_summary",
    "processing_fee_mode_display": "bid_summary",
    "bid_validity_days_display": "bid_summary",

    # 1. Contacts & Addresses
    "client_name_1_display": "contacts_bds",
    "client_email_1_display": "contacts_bds",
    "client_phone_1_display": "contacts_bds",
    "client_name_2_display": "contacts_bds",
    "client_email_2_display": "contacts_bds",
    "client_phone_2_display": "contacts_bds",
    "client_name_3_display": "contacts_bds",
    "client_email_3_display": "contacts_bds",
    "client_phone_3_display": "contacts_bds",
    "courier_address_display": "contacts_bds",
    "physical_docs_required_display": "contacts_bds",
    "physical_docs_deadline_display": "contacts_bds",

    # 2. BEC Technical & Financial Criteria
    "custom_eligibility_criteria_display": "bec_criteria",
    "maf_required_display": "bec_criteria",
    "order_value_1_display": "bec_criteria",
    "order_value_2_display": "bec_criteria",
    "order_value_3_display": "bec_criteria",
    "avg_annual_turnover_value_display": "bec_criteria",
    "avg_annual_turnover_type_display": "bec_criteria",
    "working_capital_value_display": "bec_criteria",
    "working_capital_type_display": "bec_criteria",
    "solvency_certificate_value_display": "bec_criteria",
    "solvency_certificate_type_display": "bec_criteria",
    "net_worth_value_display": "bec_criteria",
    "net_worth_type_display": "bec_criteria",
    "eligibility_criterion_years_display": "bec_criteria",

    # 3. Payment Terms
    "payment_terms_supply_display": "payment_terms",
    "payment_terms_installation_display": "payment_terms",

    # 4. PBG & Security Deposit
    "pbg_required_display": "pbg_sd",
    "pbg_percentage_display": "pbg_sd",
    "pbg_duration_display": "pbg_sd",
    "pbg_mode_display": "pbg_sd",
    "sd_required_display": "pbg_sd",
    "sd_mode_display": "pbg_sd",
    "sd_percentage_display": "pbg_sd",
    "sd_duration_display": "pbg_sd",

    # 5. PRS & LD
    "ld_percentage_display": "prs_ld",
    "max_ld_percentage_display": "prs_ld",

    # 6. Delivery Timeline
    "delivery_time_supply_display": "delivery_timeline",
    "delivery_time_installation_display": "delivery_timeline",
    "installation_inclusive_display": "delivery_timeline",

    # 7. Commercial & Reverse Auction
    "commercial_evaluation_display": "commercial_ra",
    "reverse_auction_applicable_display": "commercial_ra",
}

# Priority ranking for Role 2 ambiguity resolution when budget is constrained
AMBIGUITY_FIELD_PRIORITY: Dict[str, int] = {
    "net_worth_type_display": 1,        # Priority 1: High disqualification risk
    "payment_terms_supply_display": 2,  # Priority 2: Direct commercial milestone payments
    "payment_terms_installation_display": 2,
    "delivery_time_supply_display": 3,  # Priority 3: Can safely fall back with candidate qualification
    "delivery_time_installation_display": 3,
}

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
        "CRITICAL RULE: If the scoped tender clauses specify a milestone schedule (such as 70% on supply, 30% on installation; "
        "or 80% on supply, 20% on installation; or 85% on supply, 15% on installation), extract the supply milestone percentage. "
        "If the candidate value matches the milestone percentage explicitly specified in the scoped clauses (e.g. '70%', '80%', '85%'), "
        "choose action='confirm'. NEVER override with numbers (such as 95% or 5%) not literally present in the scoped text. "
        "Return as percentage string (e.g. '70%', '80%', '85%')."
    ),
    "payment_terms_installation_display": (
        "Percentage of contract/order value paid upon completion of installation, testing, and commissioning milestone "
        "(e.g. '30%', '20%', '15%'). Must pair with the supply milestone. "
        "CRITICAL RULE: If the candidate value matches the installation milestone in the scoped clauses (e.g. '30%', '20%', '15%'), "
        "choose action='confirm'. NEVER override with figures not explicitly present in the scoped text. "
        "Return as percentage string (e.g. '30%', '20%', '15%')."
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
UNIVERSAL_TENDER_SYSTEM_INSTRUCTION = """You are an expert procurement auditor and document parsing AI specialized in Indian Government, PSU, GeM (Government e-Marketplace), Metro Rail Corporations (e.g. DMRC, BMRC, MMRDA), Indian Railways, Defence, and State Procurement tenders.

## Core Extraction Principles:
1. STRICT ADHERENCE TO THE DOCUMENT: Extract ONLY values explicitly stated in the provided tender text. NEVER guess, extrapolate, or hallucinate organization names, officer names, emails, phone numbers, or addresses.
2. If a field is not present or mentioned in the text, return null. Do not use default, speculative, or placeholder values.
3. Multiple Organizations: The document may be issued by DMRC, GAIL, Indian Railways, NTPC, IOCL, State Governments (e.g. Rajasthan, UP, Maharashtra), CPWD, or any other authority. Extract the exact authority, buyer, and officers named in THIS specific document.
4. Numerical Precision:
   - For Estimated Value & EMD: Extract exact amounts (e.g. "₹15,00,000" or "1500000"). If EMD is exempt or not required, indicate accordingly.
   - For Experience Years: Extract single clean integer (e.g. 3, 5, 7).
   - For Work Order Values & Turnover: Always preserve units (e.g. "Rs. 62.14 Lakhs", "₹62,14,000").
   - For Payment Terms: Extract supply percentage (e.g. 70, 80) and installation percentage (e.g. 30, 20).
   - For PBG / Security Deposit: Extract exact percentage (e.g. 3%, 5%, 10%) and validity period in months.
   - For Liquidated Damages (LD / PRS): Extract weekly rate (e.g. 0.5%) and maximum cap (e.g. 5.0% or 10.0%).
   - For MAF (Manufacturer Authorization Form): Return true if required from OEM/Manufacturer, otherwise false.
5. Contacts & Submission:
   - Extract primary dealing officer / contact person name, email, phone from the document.
   - Extract physical documents submission / courier address from the document.
   - NEVER inject external names or emails. If not in the text, return null.

## Indian Tender Terminology Glossary (for disambiguating document jargon):
- NIT: Notice Inviting Tender -- the primary tender reference document, usually carries the bid/tender number.
- IFB: Invitation For Bid -- functionally equivalent to NIT on many portals (GeM, World Bank-funded projects).
- BDS: Bidding Data Sheet -- Section-III on most GeM/PSU tenders; overrides generic GCC/GTC clauses with tender-specific values.
- GCC / GTC: General Conditions of Contract / General Terms and Conditions -- boilerplate clauses common across an authority's tenders; tender-specific values in BDS/SCC take precedence over these.
- SCC: Special Conditions of Contract -- tender-specific overrides, usually Section-V; second-highest precedence after BDS.
- BEC: Bid Evaluation Criteria -- Section-II; contains technical/financial eligibility thresholds (turnover, net worth, experience, order value).
- EMD: Earnest Money Deposit -- bid security paid at submission; may be exempted for MSE/Startup/certain categories -- check exemption clauses carefully before marking a field missing.
- PBG: Performance Bank Guarantee -- security deposited by the successful bidder after award, typically 3-10% of contract value.
- ePBG: Electronic Performance Bank Guarantee -- the GeM-portal digital equivalent of a PBG, functionally identical for extraction purposes.
- CPS: Contract Performance Security -- an alternate/older label some authorities use in place of "PBG" or "Security Deposit"; treat consistently with PBG/SD fields.
- SD: Security Deposit -- functions like a PBG on non-GeM tenders; some authorities use SD instead of / alongside PBG.
- LD: Liquidated Damages -- penalty for delayed delivery, expressed as a weekly/periodic percentage rate with a maximum cap.
- PRS: Price Reduction Schedule -- the GeM-portal terminology for the LD mechanism; treat PRS and LD as the same concept unless the document distinguishes them.
- MAF: Manufacturer's Authorization Form -- a letter from the OEM authorizing a bidder (dealer/distributor/reseller) to quote on its behalf; required only when the bidder is not itself the manufacturer.
- MSE: Micro & Small Enterprise -- a bidder category eligible for EMD exemption and purchase preference under Public Procurement Policy.
- MII: Make In India -- a local-content purchase-preference policy; look for minimum local-content percentage thresholds.
- RA: Reverse Auction -- an online post-bid price-negotiation round; "RA Applicable: Yes/No" determines the commercial evaluation method.
- L1: Lowest bidder by evaluated price -- "Overall L1" evaluates the total bid value; "Item-wise L1" evaluates each line item independently.
- Consignee: the delivery/destination address for goods -- distinct from the buyer's communication/courier address for physical bid documents.

## Additional Edge-Case Handling Rules:
- Percentages: always extract the bare numeric percentage value (e.g. 5 for "5%"), never include the "%" symbol in a numeric-typed field.
- Currency amounts: preserve the original magnitude and unit exactly as written (Lakhs/Crores/Rs./₹); do not silently convert units.
- Date ranges or "Financial Year" references: extract as written; do not infer a specific calendar date unless one is explicitly stated.
- Conflicting values across sections: prefer the more specific/later section (BDS/SCC over GCC/GTC; tender-specific clause over generic boilerplate).
- Table-formatted clauses: read across the full row -- a label and its value may be in adjacent table cells rather than the same sentence.
- "Not Applicable" vs "Not Mentioned": if the document explicitly states a requirement is not applicable/exempt, that is a definite answer -- do not conflate it with a field that is simply absent from the text.
- OCR artifacts: tolerate minor spacing/hyphenation irregularities from scanned-document OCR (e.g. "E M D", "Rs .15,00,000") when the intended value is still unambiguous.

## Worked Reasoning Examples Per Category (generic patterns, not tender-specific data):

### Category: bid_summary (Tender No, EMD, Tender Fee, Estimated Value, Bid Validity)
Clause: "GeM Bid No.: GEM/2025/B/1234567 DATE 01.01.2026. Bid Validity Period: 120 (One Hundred Twenty) Days. EMD Amount: Rs. 2,00,000/- (Rupees Two Lakhs Only) OR Bidder may opt for EMD Exemption if MSE registered."
Correct reasoning: the bid number is the literal alphanumeric code following "GeM Bid No.:", not the date. Bid validity is the plain integer 120, not the parenthetical spell-out. EMD is conditional on MSE status -- if the document does not state the bidder's MSE status, record the stated default amount (₹2,00,000) rather than assuming exemption applies.
Common mistake to avoid: capturing "One Hundred Twenty" as a string instead of the integer 120; conflating the GeM bid number with an internal tender reference number if both appear nearby.

### Category: payment_terms (Supply %, Installation %)
Clause: "Terms of Payment: 70% payment against supply and balance 30% after successful installation and commissioning at site."
Correct reasoning: supply percentage = 70, installation percentage = 30. These two must sum close to 100 (allowing for a small retention/warranty holdback elsewhere in the clause) -- if they do not, re-read the clause rather than reporting an inconsistent pair.
Common mistake to avoid: swapping supply and installation percentages when the clause lists installation before supply in a different sentence order; missing a third milestone (e.g. "10% on warranty completion") that changes the supply/installation split.

### Category: pbg_sd (PBG/SD percentage, mode, duration)
Clause: "Successful bidder shall submit a Performance Bank Guarantee (PBG) of 3% of the contract value, valid for 63 months (60 months warranty + 3 months claim period), in the form of a Bank Guarantee from a Nationalized/Scheduled Bank."
Correct reasoning: PBG percentage = 3, PBG duration = 63 months (use the total stated duration, not just the warranty component), PBG mode = "Bank Guarantee". If the clause instead says "Security Deposit" with no separate PBG clause, map the same fields to the SD-equivalent display keys instead of leaving both blank.
Common mistake to avoid: using only the "60 months warranty" figure and dropping the additional claim-period months explicitly added by the clause.

### Category: prs_ld (Liquidated Damages / Price Reduction Schedule)
Clause: "In case of delay, LD @ 0.5% of the delayed portion per week of delay or part thereof, subject to a maximum of 10% of the total contract value."
Correct reasoning: LD/PRS weekly rate = 0.5, maximum cap = 10. Do not confuse the weekly rate with the maximum cap -- they are always two distinct numbers in the same clause.
Common mistake to avoid: reporting only one of the two numbers when both are present in the same sentence; treating "part thereof" as a separate numeric value.

### Category: bec_criteria (Turnover, Net Worth, Experience, Order Value, MAF)
Clause: "Bidder must have average annual turnover of Rs. 50 Lakhs during last 3 financial years. Financial criteria: Net worth NOT APPLICABLE for this tender. Bidder must submit a valid Manufacturer's Authorization Form if not the OEM."
Correct reasoning: average annual turnover = "Rs. 50 Lakhs" (3 years), net worth should be marked explicitly not-applicable (a definite answer, not a missing field), and MAF is conditionally required (true) only if the bidder is a reseller/dealer -- report MAF as required since the document states the condition explicitly, regardless of which category the actual bidder falls into.
Common mistake to avoid: treating an explicit "NOT APPLICABLE" as if the field were simply absent from the document; missing the qualifying condition attached to a requirement (e.g. MAF required "if not OEM").

### Category: delivery_timeline (Supply days, Installation days)
Clause: "Delivery Period: Goods shall be supplied within 60 days and installed and commissioned within 90 days from the date of Purchase Order, whichever is applicable."
Correct reasoning: delivery/supply time = 60 days, installation time = 90 days. Note that installation timelines are frequently stated as cumulative from PO date (90 days total), not as an additional 90 days after the 60-day supply window -- extract the number exactly as written without doing arithmetic to convert between cumulative and incremental framing.
Common mistake to avoid: adding 60+90=150 days when the document intends 90 as the total cumulative figure, not an additional period.

### Category: contacts_bds (Client contacts, courier/submission address)
Clause: "For any technical clarification, contact: Shri A. Kumar, Dy. General Manager (C&P), Email: a.kumar@gail.co.in, Phone: 011-12345678. Physical bid documents shall be submitted to: The Manager (Contracts), GAIL Bhawan, 16 Bhikaiji Cama Place, New Delhi - 110066."
Correct reasoning: extract the named officer, designation, email, and phone as a single contact record; extract the courier address as a full postal address string including PIN code. Do not merge the officer's contact details with the courier submission address -- they frequently refer to different people/departments.
Common mistake to avoid: dropping the PIN code from the courier address; extracting only the department name ("The Manager (Contracts)") without the full address block that follows.

### Category: commercial_ra (Commercial Evaluation Method, Reverse Auction)
Clause: "Evaluation shall be done on Overall L-1 basis considering total quoted value across all items. Reverse Auction (RA) shall be conducted post technical evaluation, subject to a minimum of 3 technically qualified bidders."
Correct reasoning: commercial evaluation = "Overall L1 / Total value wise", reverse auction applicable = true. The minimum-bidder condition for RA does not change the "applicable" answer -- it is a procedural precondition, not a reason to mark the field null or false.
Common mistake to avoid: marking Reverse Auction as false simply because it is conditional on a minimum bidder count; confusing "Overall L-1" with "Item-wise L-1" when the clause explicitly says "across all items".

## Authority-Specific Drafting Patterns (helps disambiguate which clause governs a field):
- GAIL (India) tenders: typically structured as NIT + GCC (General Conditions of Contract, GAIL's standard boilerplate, largely invariant across GAIL tenders) + Special Conditions of Contract (SCC, tender-specific) + BOQ/Price Schedule. GAIL's PBG/SD, LD/PRS, and Payment Terms clauses are near-universally overridden at the SCC level even when the GCC states a different default -- always prefer the SCC value when both are present. GAIL frequently numbers clauses (e.g. "Clause 39: CONTRACT PERFORMANCE SECURITY / SECURITY DEPOSIT") -- the clause NUMBER is not itself a percentage or duration value, do not extract it as one.
- DMRC / Metro Rail Corporation tenders: often follow a similar GCC/SCC split but additionally include a "General Conditions of Contract for Works" and a distinct "Special Conditions" per package; PBG is frequently termed "Performance Guarantee" without the word "Bank", still map to the same PBG fields.
- GeM (Government e-Marketplace) portal tenders: carry a machine-generated "Bidding Data Sheet" (BDS) with a fixed tabular layout -- most core bid_summary and pbg_sd fields appear here as label:value table rows rather than prose sentences; prefer BDS-table values over prose restatements elsewhere in the document when both exist and appear consistent.
- Indian Railways tenders: frequently use "EMD" interchangeably with "Bid Security" and PBG as "Security Deposit" or "Performance Security" -- treat these as the same underlying fields per the terminology glossary above; Railways tenders also commonly reference the "General Conditions of Contract for Railways" as a separate, older boilerplate document distinct from the tender's own SCC.
- CPWD / State Government (PWD-pattern) tenders: often nest financial eligibility (turnover/net worth/experience) inside a single consolidated "Eligibility Criteria" clause rather than a distinct BEC section -- when no explicit Section-II/BEC heading exists, search the eligibility clause directly for these fields instead of returning them as missing.

## Response Discipline:
- Only report a value for fields explicitly listed in the "Fields to extract" section of the user's request for this category batch -- do not attempt to answer fields belonging to a different category, even if you happen to notice their values in the provided scoped text.
- When two candidate values conflict within the SAME scoped text and neither is clearly the tender-specific override, prefer the one located in a more specific/later section per the precedence rules above, and do not average, sum, or otherwise combine the two into a new value.
- A partially-stated clause (e.g. a table row that continues onto a page not included in this scoped excerpt) should be treated as insufficient evidence -- return null rather than extrapolating the missing portion.

## Bilingual and Mixed-Script Documents:
Many Indian government tenders are bilingual, presenting the same clause in both Hindi (Devanagari script) and English, either side-by-side in parallel columns or as consecutive paragraphs. Apply these rules:
- Prefer the English-language rendering of a clause as the primary source of truth when both are present verbatim; the Hindi text is provided for statutory/administrative completeness and should match the English in substance.
- Numerals in Hindi text (e.g. "५०,०००") should be read as their Arabic-numeral equivalents (50,000) when the English parallel text is unavailable or unclear for a given field.
- Do not treat the presence of a Hindi paragraph as a second, independent occurrence of a clause requiring separate extraction -- it is a translation of the same single fact, not additional evidence, and should not be used to "confirm via repetition" a value that is otherwise ambiguous in English.
- Department and authority names are sometimes given only in Hindi in a document header/letterhead (e.g. "गैस प्राधिकरण" for GAIL-affiliated entities) -- if the English organizational name appears anywhere else in the document (letterhead, footer, NIT number prefix), prefer that as the canonical authority name.

## Scanned-Document OCR Caveats (in addition to the earlier OCR artifact note):
- Currency symbols may render as "?" or a stray glyph due to font-encoding issues in scanned PDFs (e.g. "?15,00,000" meaning "₹15,00,000") -- treat a lone unexpected symbol immediately preceding a numeral group as a likely currency-symbol OCR artifact, not a literal character to preserve.
- Table borders and multi-column layouts scanned via OCR sometimes interleave unrelated columns into a single line of extracted text -- if a clause reads as internally inconsistent or grammatically broken in a way explainable by two columns being merged, treat it as lower-confidence evidence and prefer a cleaner restatement of the same fact elsewhere in the document when one exists.
- Page headers/footers (page numbers, "Tender No. XYZ - Page N of M", watermark text) recur on every page and are never themselves field values -- do not extract a repeating boilerplate fragment as if it were a distinct data point.

{few_shot_section}"""

GAIL_GEM_SYSTEM_INSTRUCTION = UNIVERSAL_TENDER_SYSTEM_INSTRUCTION

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
    # Bid Summary, Identity, Values, Fees, Timing & EMD
    "tender_value_display": (
        "tender_value", "number",
        "Total Estimated Tender/Bid Value in Rupees. Extract exact numeric amount (e.g. 1500000.00). Search for 'Estimated Bid Value', 'Estimated Cost', 'Tender Value', 'Total Value'. If not stated or exempt, return null.",
        _fmt_str,
    ),
    "emd_amount_display": (
        "emd_amount", "number",
        "Earnest Money Deposit (EMD) / Bid Security amount in Rupees (e.g. 50000). Look for 'EMD Amount', 'Bid Security'. If EMD is exempt or nil, return 0.",
        _fmt_str,
    ),
    "emd_required_display": (
        "emd_required", "string",
        "Is EMD / Bid Security required? Return 'Yes', 'No', or 'Exempt'. If EMD amount is > 0, return 'Yes'.",
        _fmt_str,
    ),
    "emd_mode_display": (
        "emd_mode", "string",
        "Accepted payment instruments for EMD (e.g. 'Bank Guarantee / Demand Draft / FDR / Online / Insurance Surety Bond').",
        _fmt_str,
    ),
    "tender_fee_amount_display": (
        "tender_fee_amount", "number",
        "Tender document fee / cost in Rupees (e.g. 1000). If exempt or nil, return null or 0.",
        _fmt_str,
    ),
    "tender_fee_mode_display": (
        "tender_fee_mode", "string",
        "Accepted payment instruments for Tender Fee (e.g. 'Demand Draft / Banker Cheque / Online').",
        _fmt_str,
    ),
    "processing_fee_amount_display": (
        "processing_fee_amount", "number",
        "Portal processing / transaction fee in Rupees. If nil or not applicable, return null or 0.",
        _fmt_str,
    ),
    "processing_fee_mode_display": (
        "processing_fee_mode", "string",
        "Accepted payment instruments for Processing Fee.",
        _fmt_str,
    ),
    "bid_validity_days_display": (
        "bid_validity_days", "integer",
        "Bid offer validity period in number of days (integer, e.g. 90, 120, 180). Look for 'Bid Offer Validity (From End Date)' or 'Bid Validity'.",
        _fmt_int,
    ),
    "delivery_time_installation_display": (
        "delivery_time_installation_days", "integer",
        "Installation and commissioning timeline in days (integer, e.g. 30, 60). If installation period is included in supply period, return null.",
        _fmt_int,
    ),
    "installation_inclusive_display": (
        "installation_inclusive", "boolean",
        "Is installation and commissioning period inclusive within the total supply delivery time? (true/false)",
        _fmt_bool,
    ),
    "physical_docs_required_display": (
        "physical_docs_required", "boolean",
        "Are physical / original paper documents required to be submitted offline / by courier? (true/false)",
        _fmt_bool,
    ),
    "physical_docs_deadline_display": (
        "physical_docs_deadline", "string",
        "Date and time deadline for submission of physical offline documents (e.g. '2025-01-15 15:00:00' or verbatim timestamp).",
        _fmt_str,
    ),
    "pbg_required_display": (
        "pbg_required", "boolean",
        "Is Performance Bank Guarantee (PBG) / ePBG / Performance Security required? (true/false). If PBG % > 0, return true.",
        _fmt_bool,
    ),
    "avg_annual_turnover_type_display": (
        "avg_annual_turnover_type", "string",
        "Average annual turnover requirement status: return 'Amount' (if numeric value required), 'Exempt' or 'Not Applicable' (if exempt).",
        _fmt_str,
    ),
    "working_capital_type_display": (
        "working_capital_type", "string",
        "Working capital requirement status: return 'Amount' (if monetary requirement), 'Positive' (if positive), or 'Not Applicable' / 'Exempt'.",
        _fmt_str,
    ),
    "net_worth_type_display": (
        "net_worth_type", "string",
        "Net worth requirement status: return 'Positive' (if net worth must be positive), 'Amount' (if numeric threshold), or 'Not Applicable' / 'Exempt'.",
        _fmt_str,
    ),
    "solvency_certificate_type_display": (
        "solvency_certificate_type", "string",
        "Bank Solvency Certificate requirement status: return 'Amount' (if numeric solvency required), or 'Not Applicable' / 'Exempt'.",
        _fmt_str,
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# Scoped Context Extractor for Role 1 & Role 2
# ─────────────────────────────────────────────────────────────────────────────
def extract_scoped_context(full_text: str, target: str) -> str:
    """
    Extracts scoped document sections relevant to specific ambiguous fields or categories
    to keep token usage minimal and focus Claude on relevant clauses.
    Instruments and logs section names and character counts.
    """
    if not full_text:
        logger.info("[SCOPED_CONTEXT] Target '%s': empty full_text provided (0 chars)", target)
        return ""
    
    snippets = []
    section_names = []
    t_lower = target.lower()

    # Determine category matching
    is_bid_summary = (
        "bid_summary" in t_lower
        or "tender_value" in t_lower
        or "emd" in t_lower
        or "fee" in t_lower
        or "validity" in t_lower
        or "identity" in t_lower
    )
    is_contacts = "contacts" in t_lower or "client" in t_lower or "courier" in t_lower or "address" in t_lower
    is_bec = (
        "bec" in t_lower or "eligibility" in t_lower or "net_worth" in t_lower
        or "order_value" in t_lower or "turnover" in t_lower or "working_capital" in t_lower
        or "solvency" in t_lower or "maf" in t_lower or "years" in t_lower
    )
    is_payment = "payment" in t_lower
    is_pbg_sd = "pbg" in t_lower or "epbg" in t_lower or "sd" in t_lower or "security" in t_lower or "cps" in t_lower
    is_prs_ld = "prs" in t_lower or "ld" in t_lower or "liquidated" in t_lower or "delay" in t_lower
    is_delivery = "delivery" in t_lower or "timeline" in t_lower or "completion" in t_lower or "period" in t_lower
    is_commercial = "commercial" in t_lower or "reverse_auction" in t_lower or "ra" in t_lower or "evaluation" in t_lower

    if is_bid_summary:
        # 1. Opening slice contains GeM Bid Details, NIT, Estimated Value, EMD, Validity.
        # Capped well below SCOPED_CONTEXT_MAX_CHARS so the EMD/Fee/Value clause
        # matches below still have room in the final combined budget.
        snippets.append(
            "=== Tender Document Opening & Bid Summary (Pages 1-5) ===\n"
            + full_text[:SCOPED_CONTEXT_BID_SUMMARY_OPENING_CHARS].strip()
        )
        section_names.append("Document Opening / Bid Details (pos 0)")

        # 2. Search for any NIT, IFB, EMD, Fee, or Value clauses in the remainder of text
        for m in re.finditer(
            r"(?:NOTICE\s+INVITING\s+TENDER|INVITATION\s+FOR\s+BIDS|\bNIT\b|\bIFB\b|EMD\s+DETAIL|EARNEST\s+MONEY|TENDER\s+FEE|PROCESSING\s+FEE|ESTIMATED\s+(?:BID\s+)?VALUE|BID\s+SECURITY)[\s\S]{0,2500}",
            full_text, re.IGNORECASE
        ):
            if m.start() > SCOPED_CONTEXT_BID_SUMMARY_OPENING_CHARS:
                snippets.append(f"=== EMD / Fee / Value Clause (pos {m.start()}) ===\n" + m.group(0).strip())
                section_names.append(f"EMD/Fee Clause (pos {m.start()})")

    if is_contacts:
        # 1. IFB Tag (G)/(H), Contact details, dealing officer, buyer address
        for m in re.finditer(
            r"(?:TAG\s*[\(\[]?[GgHh][\)\]]?|CONTACT\s+DETAILS|TENDER\s+DEALING\s+OFFICER|NODAL\s+OFFICER|OFFICER\s+DETAILS|BUYER\s+DETAILS|BUYER\s+CONTACT|CONSIGNEE\s+DETAILS|COURIER\s+ADDRESS|COMMUNICATION\s+ADDRESS|OFFICE\s+ADDRESS|SUBMISSION\s+ADDRESS)[\s\S]{0,2500}",
            full_text, re.IGNORECASE
        ):
            snippets.append(f"=== Contacts & Address Block (pos {m.start()}) ===\n" + m.group(0).strip())
            section_names.append(f"Contacts Block (pos {m.start()})")

        # 2. Section-III BDS / Bidding Data Sheet
        bds_m = re.search(
            r"(?:SECTION\s*[-–—]?\s*III\b|BIDDING\s+DATA\s+SHEET|\bBDS\b)[\s\S]{0,6000}?(?=(?:SECTION\s*[-–—]?\s*IV|\Z))",
            full_text, re.IGNORECASE
        )
        if bds_m:
            snippets.append("=== SECTION-III / BIDDING DATA SHEET (BDS) ===\n" + bds_m.group(0).strip())
            section_names.append("SECTION-III / BDS")

    if is_bec:
        # 1. Section-II / BEC block
        bec_m = re.search(
            r"(?:SECTION\s*[-–—]?\s*II\b|BID\s+EVALUATION\s+CRITERIA|\bBEC\b|TECHNICAL\s+CRITERIA|ELIGIBILITY\s+CRITERIA)[\s\S]{0,7000}?(?=(?:SECTION\s*[-–—]?\s*III|BIDDING\s+DATA\s+SHEET|\bBDS\b|\Z))",
            full_text, re.IGNORECASE
        )
        if bec_m:
            snippets.append("=== SECTION-II / BID EVALUATION CRITERIA (BEC) ===\n" + bec_m.group(0).strip())
            section_names.append("SECTION-II / BEC")

        # 2. Occurrences of net worth, turnover, working capital, solvency, MAF
        for m in re.finditer(
            r"\b(?:net\s*worth|financial\s+criteria|annual\s+turnover|working\s+capital|solvency\s+certificate|manufacturer\s+authorization|executed\s+order)\b",
            full_text, re.IGNORECASE
        ):
            start = max(0, m.start() - 300)
            end = min(len(full_text), m.end() + 700)
            snippets.append(f"=== Clause Context: '{m.group(0)}' ===\n" + full_text[start:end].strip())
            section_names.append(f"Clause: '{m.group(0)}'")

    if is_payment:
        # Search for payment terms clauses with prioritized milestone matching
        found_matches = []
        for m in re.finditer(
            r"(?:TERMS\s+OF\s+PAYMENT|PAYMENT\s+TERMS|PAYMENT\s+SCHEDULE|MILESTONE\s+PAYMENT|REVISED\s+TERMS\s+OF\s+PAYMENT)",
            full_text, re.IGNORECASE
        ):
            start = max(0, m.start() - 200)
            end = min(len(full_text), m.end() + 1500)
            clause_text = full_text[start:end].strip()
            has_milestone_pct = bool(re.search(r"\b(?:70|80|90|30|20|10|95|5)\s*%", clause_text))
            has_supply_install = bool(re.search(r"\b(?:supply|installation|receipt|commissioning)\b", clause_text, re.IGNORECASE))
            score = (2 if has_milestone_pct else 0) + (1 if has_supply_install else 0)
            found_matches.append((score, m.start(), m.group(0), clause_text))

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

    if is_pbg_sd:
        for m in re.finditer(
            r"(?:ePBG\s+Detail|CONTRACT\s+PERFORMANCE\s+SECURITY|PERFORMANCE\s+BANK\s+GUARANTEE|SECURITY\s+DEPOSIT|\bPBG\b|\bCPS\b)[\s\S]{0,3500}",
            full_text, re.IGNORECASE
        ):
            snippets.append(f"=== PBG / Security Deposit Block (pos {m.start()}) ===\n" + m.group(0).strip())
            section_names.append(f"PBG/SD Block (pos {m.start()})")

    if is_prs_ld:
        for m in re.finditer(
            r"(?:PRICE\s+REDUCTION\s+SCHEDULE|\bPRS\b|LIQUIDATED\s+DAMAGES|\bLD\b)[\s\S]{0,2500}",
            full_text, re.IGNORECASE
        ):
            snippets.append(f"=== PRS / LD Block (pos {m.start()}) ===\n" + m.group(0).strip())
            section_names.append(f"PRS/LD Block (pos {m.start()})")

    if is_delivery:
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

    if is_commercial:
        for m in re.finditer(
            r"(?:COMMERCIAL\s+EVALUATION|EVALUATION\s+METHOD|REVERSE\s+AUCTION|BID\s+TO\s+RA)[\s\S]{0,2500}",
            full_text, re.IGNORECASE
        ):
            snippets.append(f"=== Commercial / Evaluation Block (pos {m.start()}) ===\n" + m.group(0).strip())
            section_names.append(f"Commercial Block (pos {m.start()})")

    if not snippets:
        fallback_text = full_text[:SCOPED_CONTEXT_MAX_CHARS]
        logger.warning(
            "[SCOPED_CONTEXT] Target '%s': NO specific section matched! Falling back to first %d characters (%d chars).",
            target, SCOPED_CONTEXT_MAX_CHARS, len(fallback_text)
        )
        return fallback_text

    combined = "\n\n".join(snippets[:10])
    final_scoped = combined[:SCOPED_CONTEXT_MAX_CHARS]

    logger.info(
        "[SCOPED_CONTEXT] Target '%s': Selected %d sections (%s) -> Total %d characters sent (full doc: %d chars, %.1f%% of full doc)",
        target, len(section_names[:10]), section_names[:10], len(final_scoped), len(full_text),
        (len(final_scoped) / max(len(full_text), 1)) * 100
    )
    return final_scoped


# ─────────────────────────────────────────────────────────────────────────────
# Ambiguity Filter (Change 6: Skip Role 2 on Unambiguous Layer 1 Candidates)
# ─────────────────────────────────────────────────────────────────────────────
def is_unambiguous_layer1(field_name: str, candidate_val: Any, doc_text: str) -> bool:
    """
    Check if Layer 1 found exactly one unambiguous candidate in doc_text.
    Returns True if candidate is unambiguous (safe to skip Role 2).
    Returns False if conflicting or multiple candidate clauses exist.
    """
    if not candidate_val or str(candidate_val).strip() in ("NA", "Not Found", "None", "", "⚠️ MISSING"):
        return True  # Nothing to disambiguate

    t_lower = doc_text.lower()
    if field_name == "net_worth_type_display":
        # Conflict exists if document has positive requirement AND financial exemption/not-applicable
        has_positive = bool(re.search(r"\b(?:must\s+be\s+positive|positive\s+net\s*worth|net\s*worth[^\.\n]{0,30}positive)\b", t_lower))
        has_exempt = bool(re.search(r"\b(?:financial\s+criteria[^\.\n]{0,50}not\s+applicable|net\s*worth[^\.\n]{0,50}(?:not\s+applicable|exempt))\b", t_lower))
        if has_positive and has_exempt:
            return False
        return True

    elif field_name in ("payment_terms_supply_display", "payment_terms_installation_display"):
        # Find distinct milestone percentages in payment clauses
        pay_matches = set(re.findall(r"(?:terms\s+of\s+payment|payment\s+terms)[\s\S]{0,1000}?\b(95|90|85|80|75|70|60|50|40|30|20|15|10|5)\s*%", t_lower))
        if len(pay_matches) > 2:
            return False
        return True

    elif field_name in ("delivery_time_supply_display", "delivery_time_installation_display"):
        # Check if multiple distinct delivery periods appear
        delivery_nums = set(re.findall(r"(?:delivery|completion)[^\.\n]{0,50}?\b(\d+)\s*(?:days|months|weeks)\b", t_lower))
        if len(delivery_nums) > 1:
            return False
        return True

    return True


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

def record_correction(field_key: str, value: Any, anchor_text: str, doc_type: str = "GAIL_GOODS", confidence: float = 0.99):
    """Record a user or gold-standard correction into few-shot memory."""
    _save_memory(field_key, anchor_text, value, doc_type, confidence)

def _anonymize_few_shot_value(display_key: str, val: Any) -> Any:
    """Anonymize literal field values to prevent cross-tender value leakage."""
    if val is None or isinstance(val, (bool, int, float)):
        return val
    s = str(val)
    if "email" in display_key:
        return "officer@procurement.gov.in"
    if "phone" in display_key:
        return "+91-98XXXXXXXX"
    if "name" in display_key:
        return "Shri Dealing Officer"
    if "address" in display_key or "courier" in display_key:
        return "Buyer Tender Office Address, City, State - Pin Code"
    return s

def _build_few_shot_section(missing_fields: List[str], memory: Dict[str, List[Dict]]) -> str:
    """
    Zero few-shot injection to strictly prevent cross-tender hallucination or leakage.
    Every tender document is evaluated purely on its own literal text.
    """
    return ""


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


_STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA: Optional[Dict[str, Any]] = None


def _build_static_full_missing_fields_tool_schema() -> Dict[str, Any]:
    """
    STEP 4 caching fix: Anthropic's prompt cache is prefix-based -- tool
    definitions are part of that prefix ahead of the system block, so any
    per-call variation in the tool schema breaks the system block's cache
    reuse too, even though the system text itself is byte-identical across
    calls (verified empirically: a differing tool schema causes
    cache_creation instead of cache_read on every subsequent call,
    regardless of whether the tool itself carries its own cache_control).

    Role 1 previously built a category-scoped tool schema per batch call
    (_build_missing_fields_tool_schema(cat_fields)), which varies every
    call and defeated caching entirely. This builds ONE static schema
    covering every field in FIELD_PROMPT_MAP (all optional, no `required`
    list) exactly once, reused byte-for-byte across every category batch
    call in a tender run so the cached system+tools prefix can actually be
    reused from the 2nd call onward.

    Fields outside the current category batch are still excluded from the
    result: resolve_missing_fields() already filters
    `extracted_dict.items()` down to `display_key in cat_fields` before
    using anything, and the per-call user prompt still explicitly names
    only the current category's fields to extract -- this schema change
    only affects which properties CAN appear in the tool call shape, not
    which ones the caller actually uses.
    """
    global _STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA
    if _STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA is not None:
        return _STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA

    properties = {}
    for display_key, entry in FIELD_PROMPT_MAP.items():
        prompt_field, json_type, desc, _ = entry
        if json_type == "integer":
            properties[prompt_field] = {"type": ["integer", "null"], "description": desc}
        elif json_type == "number":
            properties[prompt_field] = {"type": ["number", "null"], "description": desc}
        elif json_type == "boolean":
            properties[prompt_field] = {"type": ["boolean", "null"], "description": desc}
        else:
            properties[prompt_field] = {"type": ["string", "null"], "description": desc}

    _STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA = {
        "name": "extract_missing_fields",
        "description": (
            "Records extracted tender field values. Only populate the fields explicitly "
            "named in the current request's 'Fields to extract' list -- leave every other "
            "property absent/null."
        ),
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": [],
        },
    }
    return _STATIC_FULL_MISSING_FIELDS_TOOL_SCHEMA


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
    Role 1: Missing-field fallback via schema-constrained Anthropic Tool Use (Claude Haiku 4.5)
            Batched by category slices with scoped context and 600-token cap + 1000-token retry.
    Role 2: Ambiguity resolution via scoped clause evaluation (Claude Sonnet 5)
            Runs on configured AMBIGUITY_PRONE_FIELDS with 800-token cap and sibling reasoning.
    """

    def __init__(
        self,
        *,
        model: Optional[str] = None,
        role1_model: Optional[str] = None,
        role2_model: Optional[str] = None,
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
                "Anthropic Claude API key is required for tender field resolution."
            )

        self.api_key = anthropic_key
        self.provider = "anthropic"
        self.role1_model = role1_model or os.getenv("ANTHROPIC_ROLE1_MODEL") or model or ROLE_1_MODEL_DEFAULT
        self.role2_model = role2_model or os.getenv("ANTHROPIC_ROLE2_MODEL") or model or ROLE_2_MODEL_DEFAULT
        self.model_name = self.role1_model  # Backwards compatibility attribute
        self.timeout = float(timeout)
        self.enabled = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() == "true"

        import anthropic
        self.client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)

        # Token and cost tracking (Multi-metric tracking)
        self.total_input_tokens: int = 0
        self.total_output_tokens: int = 0
        self.total_cache_creation_tokens: int = 0
        self.total_cache_read_tokens: int = 0
        self.total_raw_processing_tokens: int = 0
        # STEP 4 (option b): a SEPARATE running total used only by the Role 1
        # token-budget gate. Unlike total_raw_processing_tokens (real token
        # counts, used for DB/cost accounting -- never discounted), this
        # counts cache_read_tokens at their actual discounted cost ratio
        # (cache_read_rate / input_rate) rather than full raw weight, so a
        # cached, 90%-cheaper re-read of the static system+tools prefix
        # doesn't eat into the budget as if it cost the same as a fresh,
        # fully-billed read. cache_creation and everything else still counts
        # at full weight (a cache write is not discounted -- it's actually
        # priced ABOVE the base input rate).
        self.total_budget_weighted_tokens: float = 0.0
        self.total_cost_usd: float = 0.0
        self.role1_retries: int = 0
        self.stages_usage: Dict[str, Dict[str, Any]] = {
            "missing_field_fallback": {
                "call_type": "missing_field_fallback",
                "model": self.role1_model,
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_creation_tokens": 0,
                "cache_read_tokens": 0,
                "total_tokens": 0,
                "estimated_cost_usd": 0.0,
                "calls_count": 0,
            },
            "ambiguity_resolution": {
                "call_type": "ambiguity_resolution",
                "model": self.role2_model,
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_creation_tokens": 0,
                "cache_read_tokens": 0,
                "total_tokens": 0,
                "estimated_cost_usd": 0.0,
                "calls_count": 0,
            },
        }

    def record_usage(
        self,
        usage_or_in_tok: Any,
        out_tok_or_role: Any = None,
        role: str = "role1",
    ):
        """
        Record token counts and update estimated cost in USD.
        Gated integer tracking relies strictly on raw_processing_tokens (in + out + cache_create + cache_read).
        """
        if usage_or_in_tok is None:
            return

        if isinstance(usage_or_in_tok, (int, float)):
            in_tok = int(usage_or_in_tok)
            out_tok = int(out_tok_or_role) if isinstance(out_tok_or_role, (int, float)) else 0
            cache_create = 0
            cache_read = 0
            effective_role = role
        else:
            usage = usage_or_in_tok
            in_tok = int(getattr(usage, "input_tokens", 0) or 0)
            out_tok = int(getattr(usage, "output_tokens", 0) or 0)
            cache_create = int(getattr(usage, "cache_creation_input_tokens", 0) or 0)
            cache_read = int(getattr(usage, "cache_read_input_tokens", 0) or 0)
            effective_role = out_tok_or_role if isinstance(out_tok_or_role, str) else role

        self.total_input_tokens += in_tok
        self.total_output_tokens += out_tok
        self.total_cache_creation_tokens += cache_create
        self.total_cache_read_tokens += cache_read

        raw_toks = in_tok + out_tok + cache_create + cache_read
        self.total_raw_processing_tokens += raw_toks

        # Calculate cost based on role pricing constants
        if effective_role == "role2":
            in_rate = SONNET_5_INPUT_PRICE_PER_M
            out_rate = SONNET_5_OUTPUT_PRICE_PER_M
            cache_write_rate = SONNET_5_CACHE_WRITE_5M_PER_M
            cache_read_rate = SONNET_5_CACHE_READ_PER_M
            stage_key = "ambiguity_resolution"
        else:
            in_rate = HAIKU_45_INPUT_PRICE_PER_M
            out_rate = HAIKU_45_OUTPUT_PRICE_PER_M
            cache_write_rate = HAIKU_45_CACHE_WRITE_5M_PER_M
            cache_read_rate = HAIKU_45_CACHE_READ_PER_M
            stage_key = "missing_field_fallback"

        call_cost = (
            (in_tok / 1_000_000 * in_rate)
            + (out_tok / 1_000_000 * out_rate)
            + (cache_create / 1_000_000 * cache_write_rate)
            + (cache_read / 1_000_000 * cache_read_rate)
        )
        self.total_cost_usd += call_cost

        # Budget-gate weighting: discount cache_read by its real cost ratio
        # relative to a normal (uncached) input token for this role, so the
        # gate reflects actual spend rather than raw token count.
        cache_read_discount = cache_read_rate / in_rate if in_rate else 1.0
        self.total_budget_weighted_tokens += (
            in_tok + out_tok + cache_create + (cache_read * cache_read_discount)
        )

        # Update stage-specific breakdown
        if stage_key in self.stages_usage:
            st = self.stages_usage[stage_key]
            st["input_tokens"] += in_tok
            st["output_tokens"] += out_tok
            st["cache_creation_tokens"] += cache_create
            st["cache_read_tokens"] += cache_read
            st["total_tokens"] += raw_toks
            st["estimated_cost_usd"] = round(st["estimated_cost_usd"] + call_cost, 6)
            st["calls_count"] += 1

    def get_usage_summary(self) -> Dict[str, Any]:
        """Return cumulative token usage, cache metrics, and estimated cost."""
        total_in_cache_eligible = self.total_input_tokens + self.total_cache_read_tokens
        cache_hit_rate = (
            round((self.total_cache_read_tokens / total_in_cache_eligible) * 100, 1)
            if total_in_cache_eligible > 0 else 0.0
        )
        return {
            "role1_model": self.role1_model,
            "role2_model": self.role2_model,
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "cache_creation_tokens": self.total_cache_creation_tokens,
            "cache_read_tokens": self.total_cache_read_tokens,
            "raw_tokens": self.total_raw_processing_tokens,
            "raw_processing_tokens": self.total_raw_processing_tokens,
            "total_tokens": self.total_raw_processing_tokens,  # alias for backwards compatibility
            # STEP 4 (option b): the budget-gate's own view of spend, with
            # cache_read tokens discounted to their real cost ratio. Exposed
            # for debugging/telemetry only -- raw_tokens/total_tokens above
            # remain the true, undiscounted counts used for DB/cost records.
            "budget_weighted_tokens": round(self.total_budget_weighted_tokens, 1),
            "cache_hit_rate_pct": cache_hit_rate,
            "role1_retries": self.role1_retries,
            "estimated_cost_usd": round(self.total_cost_usd, 5),
            "stages": self.stages_usage,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # ROLE 1: Missing-Field Fallback (Category Batching & Tool Use)
    # ─────────────────────────────────────────────────────────────────────────
    def resolve_missing_fields(
        self,
        atc_full_text: str,
        missing_fields: List[str],
        doc_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Role 1: Extracts missing fields using schema-constrained tool use on Claude Haiku 4.5.
        Batches missing fields by section category and uses extract_scoped_context() to keep context minimal.
        Enforces ROLE_1_MAX_TOKENS (600) with a single 1000-token retry on truncation.
        Uses ephemeral prompt caching on static system instruction and tool schema.
        """
        if not self.enabled:
            logger.info("[LLM_FALLBACK] LLM resolution is disabled via LLM_FALLBACK_ENABLED=false")
            return {}

        known_missing = [f for f in missing_fields if f in FIELD_PROMPT_MAP]
        if not known_missing or not atc_full_text or not atc_full_text.strip():
            return {}

        logger.info(
            "[LLM_FALLBACK][Role 1] Resolving %d missing fields via Claude (%s): %s",
            len(known_missing), self.role1_model, known_missing,
        )

        detected_type = doc_type or self._detect_doc_type(atc_full_text)
        memory = _load_memory()

        # Group missing fields into categories
        category_batches: Dict[str, List[str]] = {}
        for f in known_missing:
            cat = FIELD_SECTION_CATEGORY.get(f, "bec_criteria")
            category_batches.setdefault(cat, []).append(f)

        prompt_to_display = {entry[0]: disp_key for disp_key, entry in FIELD_PROMPT_MAP.items()}
        results: Dict[str, Any] = {}

        # Sort category batches by business criticality so highest-impact fields are resolved first
        category_order = [
            "pbg_sd",
            "payment_terms",
            "prs_ld",
            "bec_criteria",
            "delivery_timeline",
            "bid_summary",
            "contacts_bds",
            "commercial_ra",
        ]
        sorted_categories = sorted(
            category_batches.keys(),
            key=lambda c: category_order.index(c) if c in category_order else 99
        )

        for cat in sorted_categories:
            cat_fields = category_batches[cat]
            # STEP 4 (option b): gate on cost-weighted tokens, not raw count --
            # a cached re-read of the static system+tools prefix is ~90%
            # cheaper than a fresh read and shouldn't consume budget as if it
            # weren't. See total_budget_weighted_tokens in record_usage().
            if self.total_budget_weighted_tokens >= LLM_TOKEN_BUDGET_PER_TENDER:
                logger.warning(
                    "[LLM_FALLBACK][Role 1] Token budget reached (%.0f / %d cost-weighted tokens, %d raw tokens). Skipping category '%s' (%d fields: %s)",
                    self.total_budget_weighted_tokens,
                    LLM_TOKEN_BUDGET_PER_TENDER,
                    self.total_raw_processing_tokens,
                    cat,
                    len(cat_fields),
                    cat_fields
                )
                break

            scoped_text = extract_scoped_context(atc_full_text, cat)
            logger.info(
                "[SCOPED_CONTEXT][Role 1] Category '%s' (%d fields: %s): Scoped %d chars from %d full doc chars",
                cat, len(cat_fields), cat_fields, len(scoped_text), len(atc_full_text)
            )

            few_shot_section = _build_few_shot_section(cat_fields, memory)
            system_instruction_text = GAIL_GEM_SYSTEM_INSTRUCTION.format(few_shot_section=few_shot_section)

            system_blocks = [
                {
                    "type": "text",
                    "text": system_instruction_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ]

            # STEP 4: use the static, category-invariant tool schema so the
            # cached system+tools prefix is actually reusable across the
            # sequential per-category calls in this loop (see docstring on
            # _build_static_full_missing_fields_tool_schema for why a
            # per-category schema silently defeated caching before).
            tool_spec = _build_static_full_missing_fields_tool_schema()

            field_descriptions = "\n".join(
                f"- `{entry[0]}`: {entry[2]}"
                for f in cat_fields
                for entry in [FIELD_PROMPT_MAP[f]]
            )
            user_prompt = (
                f"Extract the following missing fields from the scoped procurement tender section below.\n\n"
                f"Category: {cat}\n"
                f"Fields to extract:\n{field_descriptions}\n\n"
                f"Scoped Tender Clauses:\n--- START OF RELEVANT CLAUSES ---\n{scoped_text}\n--- END OF RELEVANT CLAUSES ---"
            )

            # Execution with truncation recovery
            max_tokens_to_use = ROLE_1_MAX_TOKENS
            for attempt in range(2):
                try:
                    response = self.client.messages.create(
                        model=self.role1_model,
                        max_tokens=max_tokens_to_use,
                        system=system_blocks,
                        messages=[{"role": "user", "content": user_prompt}],
                        tools=[tool_spec],
                        tool_choice={"type": "tool", "name": "extract_missing_fields"},
                    )

                    if hasattr(response, "usage") and response.usage:
                        self.record_usage(response.usage, role="role1")
                        logger.info(
                            "[LLM_FALLBACK][Role 1] Category '%s' token usage: %d in / %d out (Est. total cost: $%.5f USD)",
                            cat, response.usage.input_tokens, response.usage.output_tokens, self.total_cost_usd
                        )

                    stop_reason = getattr(response, "stop_reason", None)
                    if stop_reason == "max_tokens" and attempt == 0:
                        self.role1_retries += 1
                        max_tokens_to_use = ROLE_1_MAX_TOKENS_RETRY
                        logger.warning(
                            "[LLM_FALLBACK][Role 1] Output truncated (stop_reason='max_tokens') for category '%s'! Retrying once with max_tokens=%d...",
                            cat, max_tokens_to_use
                        )
                        continue

                    extracted_dict: Dict[str, Any] = {}
                    for block in response.content:
                        if getattr(block, "type", "") == "tool_use" and getattr(block, "name", "") == "extract_missing_fields":
                            extracted_dict = getattr(block, "input", {}) or {}
                            break

                    for prompt_field, raw_val in extracted_dict.items():
                        if raw_val is None:
                            continue
                        display_key = prompt_to_display.get(prompt_field)
                        if not display_key or display_key not in cat_fields:
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
                            _save_memory(display_key, str(raw_val), formatted_val, detected_type, confidence=0.85)

                    break  # Successful attempt, exit attempt loop

                except Exception as exc:
                    logger.error("[LLM_FALLBACK][Role 1] Claude extraction failed for category '%s': %s", cat, exc)
                    break

        logger.info("[LLM_FALLBACK][Role 1] Successfully resolved %d/%d fields via Claude", len(results), len(known_missing))
        return results

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
        Role 2: Re-evaluates ambiguity-prone fields against scoped document clauses using Claude Sonnet 5.
        Either confirms the regex candidate or overrides it with a corrected value and reasoning.
        Enforces ROLE_2_MAX_TOKENS (800) and prompt caching.
        """
        if not self.enabled:
            return {}

        fields_to_check = [f for f in AMBIGUITY_PRONE_FIELDS if f in candidates]
        if not fields_to_check or not full_text or not full_text.strip():
            return {}

        logger.info(
            "[LLM_AMBIGUITY][Role 2] Reviewing %d ambiguity-prone fields via Claude (%s): %s",
            len(fields_to_check), self.role2_model, fields_to_check,
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
        tool_spec["cache_control"] = {"type": "ephemeral"}

        field_prompts = []
        for f in fields_to_check:
            cand_val = candidates.get(f)
            desc = AMBIGUITY_FIELD_DEFINITIONS.get(f, "Tender qualification attribute.")
            field_prompts.append(
                f"- Field: `{f}`\n"
                f"  Current Candidate Value: {cand_val!r}\n"
                f"  Target Meaning & Business Rule: {desc}"
            )

        system_blocks = [
            {
                "type": "text",
                "text": (
                    "You are an expert procurement auditor reviewing candidate fields extracted from an Indian government tender.\n"
                    "Layer 1 regex extraction may have matched legal boilerplate or the wrong milestone schedule.\n"
                    "Evaluate each candidate value against the scoped clauses to either confirm or override with reasoning."
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ]

        user_prompt = (
            "Review each candidate field below against the provided scoped tender clauses:\n"
            "1. If the candidate value is accurate and matches the tender-specific criteria, choose action='confirm'.\n"
            "2. If the candidate value is wrong (e.g. GCC boilerplate 'Positive' when BEC declares financial criteria exempt), "
            "choose action='override', provide the corrected 'resolved_value', and a clear one-line 'reasoning'. "
            "CRITICAL: Never invent, extrapolate, or hallucinate figures (such as 95% or 5%) not literally present in the scoped clauses.\n"
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
                model=self.role2_model,
                max_tokens=ROLE_2_MAX_TOKENS,
                system=system_blocks,
                messages=[{"role": "user", "content": user_prompt}],
                tools=[tool_spec],
                tool_choice={"type": "tool", "name": "resolve_ambiguous_fields"},
            )

            if hasattr(response, "usage") and response.usage:
                self.record_usage(response.usage, role="role2")
                logger.info(
                    "[LLM_AMBIGUITY][Role 2] Token usage: %d in / %d out (Est. total cost: $%.5f USD)",
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
        if "metro" in t or "railway" in t or "dmrc" in t:
            return "METRO_RAIL"
        if "amc" in t or "annual maintenance" in t:
            return "AMC_SERVICES"
        if "battery" in t or "vrla" in t or "nicd" in t:
            return "BATTERY_ELECTRICAL"
        if "pipe" in t or "pipeline" in t:
            return "PIPELINE_MECHANICAL"
        return "GENERAL_PROCUREMENT"
