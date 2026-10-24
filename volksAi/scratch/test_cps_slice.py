import sys
import os
import re

volksai_dir = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi"
if volksai_dir not in sys.path:
    sys.path.insert(0, volksai_dir)

from app.services.pdf_parent_ingest import extract_pdf_text_hybrid, CHILD_PDF_MAX_PAGES

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

main_pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=50)
atc_pages = extract_pdf_text_hybrid(atc_pdf, None, max_pages=CHILD_PDF_MAX_PAGES)

full_text = "\n".join([f"--- [PAGE {p['page']}] ---\n" + p.get("text", "") for p in main_pages + atc_pages])

from app.services.llm_field_resolver import _find_section_slice

cps_pats = [
    r"\n\s*12\.0\s+CONTRACT\s+PERFORMANCE\s+SECURITY\s*\(CPS\):?",
    r"\n\s*CONTRACT\s+PERFORMANCE\s+SECURITY\s*\(CPS\):?",
    r"\n\s*CONTRACT\s+PERFORMANCE\s+SECURITY\s*/\s*SECURITY\s+DEPOSIT\s*\[CPS/SD\]",
]
cps_text, cps_sp, cps_ep = _find_section_slice(
    full_text, cps_pats, stop_pattern=r"\n\s*(?:13\.0\b|SECTION\s*[-–—]?\s*VI\b)", max_chars=4000
)

epbg_m = re.search(
    r"(?:ईपीबीजी\s*विवरण|ePBG\s+Detail)[\s\S]{0,1500}?(?=(?:\n\s*--- \[PAGE|\Z))",
    full_text, re.IGNORECASE
)
epbg_text = ""
epbg_page = 3
if epbg_m:
    epbg_text = epbg_m.group(0).strip()
    pre_pages = list(re.finditer(r"--- \[PAGE (\d+)\] ---", full_text[:epbg_m.start() + 100]))
    if pre_pages:
        epbg_page = int(pre_pages[-1].group(1))

combined = []
if epbg_text:
    combined.append(f"=== GeM Bid ePBG Detail (Page {epbg_page}) ===\n{epbg_text}")
if cps_text:
    combined.append(f"=== GCC Clause 12.0 Contract Performance Security (CPS) (Page {cps_sp}) ===\n{cps_text}")

scoped = "\n\n".join(combined)

print("TOTAL LENGTH:", len(scoped))
print("PAGES: Page", epbg_page, "and Page", cps_sp)
print("\n--- FIRST 300 CHARS ---")
print(scoped[:300])
print("\n--- LAST 200 CHARS ---")
print(scoped[-200:])
