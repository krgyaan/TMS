import sys
import os
import json
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
print("llm_status:", result.get("_llm_status") or result.get("llm_status"))
print("last_error:", json.dumps(result.get("_last_error"), indent=2))
print("failed_categories:", result.get("_failed_categories"))
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
    print(f"\n############################################################")
    print(f"CATEGORY: {cat}")
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
print("4. ALL EXTRACTED FIELDS WITH SOURCE (source=llm vs source=rules)")
print("=" * 80)

sources = result.get("_info_sheet_sources", {})
for k, v in result.items():
    if not k.startswith("_") and v not in (None, "", "NOT_APPLICABLE"):
        src = sources.get(k, "rules")
        if src in ("main_tender", "atc"):
            src_label = "source=rules"
        elif src == "llm":
            src_label = "source=llm"
        else:
            src_label = f"source={src}"
        print(f"  {k}: {v!r}  ({src_label})")

print("\n" + "=" * 80)
print("5. VERIFICATION OF KEY FIELDS")
print("=" * 80)
key_fields = [
    "pbg_required_display", "pbg_percentage_display", "pbg_duration_display", "sd_required_display",
    "payment_terms_supply_display", "payment_terms_installation_display",
    "ld_percentage_display", "max_ld_percentage_display", "ld_type_display",
    "delivery_time_supply_display", "delivery_time_installation_display",
    "experience_years_display", "single_order_value_display", "order_value_1_display", "startup_relaxation_display",
    "client_name_1_display", "client_email_1_display", "client_name_2_display", "grievance_email_display",
    "tender_id_display", "tender_date", "bid_published_date", "gem_bid_end_date_display"
]
for k in key_fields:
    val = result.get(k)
    src = sources.get(k, "rules")
    print(f"  {k}: {val!r} (source={src})")
