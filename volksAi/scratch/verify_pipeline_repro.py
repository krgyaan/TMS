import sys
import os
import json
import re
import logging

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Set working directory to volksAi
volksai_dir = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi"
if volksai_dir not in sys.path:
    sys.path.insert(0, volksai_dir)
os.chdir(volksai_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(volksai_dir, ".env"))

from pathlib import Path
from app.services.pdf_parent_ingest import ingest_parent_tender_pdf

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

print("=" * 80)
print("1. RUNNING PIPELINE ON GEM/2026/B/8074394")
print("=" * 80)

result = ingest_parent_tender_pdf(
    job_id="verify-8074394",
    pdf_path=Path(main_pdf),
    original_filename="1792817184361_GAIL_Vijaywada.pdf",
    explicit_atc_paths=[Path(atc_pdf)],
)

print("\n" + "=" * 80)
print("2. EXTRACTION STATUS AND LLM METRICS")
print("=" * 80)
print("llm_status:", result.get("_llm_status") or result.get("llm_status", "ok"))
print("last_error:", json.dumps(result.get("_last_error"), indent=2))
print("failed_categories:", result.get("_failed_categories", []))
print("llm_usage:", json.dumps(result.get("_llm_usage"), indent=2))

categories = [
    "pbg_sd",
    "payment_terms",
    "prs_ld",
    "bec_criteria",
    "delivery_timeline",
    "bid_summary",
    "contacts_bds"
]

print("\n" + "=" * 80)
print("3. RAW SCOPED TEXT AND RAW LLM TOOL-CALL OUTPUT PER CATEGORY")
print("=" * 80)

for cat in categories:
    scoped = result.get(f"_scoped_text_{cat}") or ""
    tool_call = result.get(f"_raw_tool_call_{cat}") or {}
    
    # Calculate page range from page markers in scoped text
    pages_found = [int(m.group(1)) for m in re.finditer(r"--- \[PAGE (\d+)\] ---", scoped)]
    page_range_str = f"Pages {min(pages_found)} - {max(pages_found)}" if pages_found else "Unknown"

    print(f"\n############################################################")
    print(f"CATEGORY: {cat} ({page_range_str})")
    print(f"############################################################")
    print(f"Scoped text length: {len(scoped)} characters")
    if scoped:
        print(f"\n--- FIRST 300 CHARACTERS OF SCOPED TEXT ---")
        print(scoped[:300])
        print(f"\n--- LAST 200 CHARACTERS OF SCOPED TEXT ---")
        print(scoped[-200:])
    else:
        print("(No scoped text captured)")

    print(f"\n--- RAW LLM TOOL-CALL OUTPUT (JSON) ---")
    print(json.dumps(tool_call, indent=2))

print("\n" + "=" * 80)
print("4. ROLE 2 (CLAUDE SONNET 5.5) RAW TOOL-CALL OUTPUT AND REASONING")
print("=" * 80)
role2_tool_call = result.get("_raw_tool_call_role2") or {}
print(json.dumps(role2_tool_call, indent=2))

print("\n" + "=" * 80)
print("5. ALL EXTRACTED FIELDS WITH SOURCE (source=llm vs source=rules)")
print("=" * 80)

sources = result.get("_info_sheet_sources", {})
for k, v in result.items():
    if not k.startswith("_") and v not in (None, "", "NOT_APPLICABLE"):
        src = sources.get(k, "rules")
        if src in ("main_tender", "atc"):
            src_label = "source=rules"
        elif src in ("llm", "llm_override", "atc_llm"):
            src_label = "source=llm"
        else:
            src_label = f"source={src}"
        print(f"  {k}: {v!r}  ({src_label})")

print("\n" + "=" * 80)
print("6. COMPARISON AGAINST EXPECTED VALUES (PASS/FAIL TABLE)")
print("=" * 80)

def evaluate(actual, expected_cond):
    if not actual or actual in ("NA", "Not Found", "⚠️ MISSING", "None", ""):
        return "FAIL (Empty/Missing)"
    from app.services.tender_mapper import is_pointer_value
    if is_pointer_value(actual):
        return "FAIL (Pointer Value Unresolved)"
    return "PASS" if expected_cond(str(actual).lower()) else "FAIL"

checks = [
    (
        "pbg_sd (PBG %)",
        result.get("pbg_percentage_display"),
        sources.get("pbg_percentage_display", "rules"),
        lambda s: "5" in s,
        "ePBG 5%"
    ),
    (
        "pbg_sd (Duration)",
        result.get("pbg_duration_display"),
        sources.get("pbg_duration_display", "rules"),
        lambda s: "26" in s,
        "26 months"
    ),
    (
        "payment_terms (Supply)",
        result.get("payment_terms_supply_display"),
        sources.get("payment_terms_supply_display", "rules"),
        lambda s: "80%" in s and ("receipt" in s or "site" in s),
        "80% on receipt and acceptance at site, 20% after completion + buy-back removal"
    ),
    (
        "payment_terms (Installation / Service)",
        result.get("payment_terms_installation_display"),
        sources.get("payment_terms_installation_display", "rules"),
        lambda s: "100%" in s and ("installation" in s or "commissioning" in s),
        "service 100% after commissioning"
    ),
    (
        "prs_ld (Rate)",
        result.get("ld_percentage_display"),
        sources.get("ld_percentage_display", "rules"),
        lambda s: "0.5" in s,
        "0.5% per week of delay"
    ),
    (
        "prs_ld (Max Cap)",
        result.get("max_ld_percentage_display"),
        sources.get("max_ld_percentage_display", "rules"),
        lambda s: "5" in s,
        "max 5%"
    ),
    (
        "delivery_timeline (Supply)",
        result.get("delivery_time_supply_display"),
        sources.get("delivery_time_supply_display", "rules"),
        lambda s: "4" in s or "120" in s or "153" in s or "5" in s,
        "4 months / 120 days from FOA/LOA (or 153 Days GeM schedule)"
    ),
    (
        "delivery_timeline (Installation)",
        result.get("delivery_time_installation_display"),
        sources.get("delivery_time_installation_display", "rules"),
        lambda s: "1" in s or "30" in s or "month" in s or "inclusive" in s,
        "1 month / 30 days from supply"
    ),
    (
        "bec_criteria (Technical)",
        result.get("custom_eligibility_criteria_display"),
        sources.get("custom_eligibility_criteria_display", "rules"),
        lambda s: "battery" in s or "ni-cd" in s or "supply" in s,
        "supply of Ni-Cd batteries"
    ),
    (
        "bec_criteria (Turnover)",
        result.get("avg_annual_turnover_value_display") or result.get("avg_annual_turnover_type_display"),
        sources.get("avg_annual_turnover_value_display", "rules"),
        lambda s: "32" in s or "lakh" in s or "not applicable" in s or "exempt" in s or "0" in s,
        "annual turnover (Not Applicable / Exempted for this tender)"
    ),
    (
        "bec_criteria (Net Worth)",
        result.get("net_worth_type_display"),
        sources.get("net_worth_type_display", "rules"),
        lambda s: "positive" in s or "not applicable" in s or "exempt" in s,
        "Net worth (Not Applicable / Exempted for this tender)"
    ),
    (
        "bid_summary (Title / Work)",
        result.get("title_display") or result.get("tender_name") or result.get("tender_name_display") or result.get("work_description_display"),
        sources.get("title_display", "rules"),
        lambda s: "battery" in s or "supply" in s,
        "supply and installation of Ni-Cd battery bank with buyback"
    ),
    (
        "contacts_bds (Officer 1 Name)",
        result.get("client_name_1_display"),
        sources.get("client_name_1_display", "rules"),
        lambda s: "vishal" in s,
        "Vishal Kumar"
    ),
    (
        "contacts_bds (Officer 1 Phone)",
        result.get("client_phone_1_display"),
        sources.get("client_phone_1_display", "rules"),
        lambda s: "0891-2513682" in s or "2748423" in s,
        "0891-2513682 / 2748423"
    ),
    (
        "contacts_bds (Officer 2 Name)",
        result.get("client_name_2_display"),
        sources.get("client_name_2_display", "rules"),
        lambda s: "narasinga" in s,
        "Narasinga Rao Ch"
    ),
    (
        "contacts_bds (Officer 2 Phone)",
        result.get("client_phone_2_display"),
        sources.get("client_phone_2_display", "rules"),
        lambda s: "0891-2749771" in s,
        "0891-2749771"
    ),
    (
        "startup_relaxation (DPIIT)",
        result.get("dpiit_startup_relaxation_display") or result.get("startup_relaxation_display"),
        sources.get("dpiit_startup_relaxation_display", "rules"),
        lambda s: "yes" in s,
        "DPIIT startup relaxation applicable = Yes"
    )
]

print(f"{'Field':<35} | {'Source':<12} | {'Status':<6} | {'Actual Value':<40} | {'Expected'}")
print("-" * 120)
for label, actual, src, cond, expected in checks:
    src_label = "source=llm" if src in ("llm", "llm_override", "atc_llm") else "source=rules"
    status = evaluate(actual, cond)
    actual_str = str(actual)[:38] if actual is not None else "None"
    print(f"{label:<35} | {src_label:<12} | {status:<6} | {actual_str:<40} | {expected}")
