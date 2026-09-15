import os, json, time
from dotenv import load_dotenv
from pathlib import Path

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / ".env")
load_dotenv(HERE / ".env")

from app.services.pdf_parent_ingest import ingest_parent_tender_pdf

MAIN_PDF = (HERE.parent / "api/uploads/tendering/tender-documents/1789208787800_GAIL_Split_Noida.pdf").resolve()
ATC_PDF = (HERE.parent / "api/uploads/tendering/tender-documents/1789208858034_ATcSPlit.pdf").resolve()

t0 = time.time()
result = ingest_parent_tender_pdf(
    job_id="step4c-verify-3629",
    pdf_path=MAIN_PDF,
    original_filename="1789208787800_GAIL_Split_Noida.pdf",
    explicit_atc_paths=[ATC_PDF],
)
elapsed = time.time() - t0
print(f"\nElapsed: {elapsed:.1f}s", flush=True)

llm_usage = result.get("_llm_usage", {})
print("\n=== LLM USAGE ===", flush=True)
print(json.dumps(llm_usage, indent=2, default=str), flush=True)

out_path = HERE / "step4c_result.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, default=str)
print(f"\nFull result saved to {out_path}", flush=True)
