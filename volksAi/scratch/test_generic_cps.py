import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")

from app.services.pdf_parent_ingest import extract_pdf_text_hybrid, CHILD_PDF_MAX_PAGES
from app.services.llm_field_resolver import _find_section_slice

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

main_pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=50)
atc_pages = extract_pdf_text_hybrid(atc_pdf, None, max_pages=CHILD_PDF_MAX_PAGES)

full_text = "\n".join([f"--- [PAGE {p['page']}] ---\n" + p.get("text", "") for p in main_pages + atc_pages])

# Regex for CONTRACT PERFORMANCE SECURITY with optional clause number, as a substantive heading
cps_pats = [
    r"\n\s*(?:\d+(?:\.\d+)*\s+)?CONTRACT\s+PERFORMANCE\s+SECURITY(?:\s*\(CPS\))?(?:\s*/\s*SECURITY\s+DEPOSIT(?:\s*\[CPS/SD\])?)?\s*[:\-]?\s*\n",
    r"\n\s*(?:\d+(?:\.\d+)*\s+)?CONTRACT\s+PERFORMANCE\s+SECURITY\s*\(CPS\)[:\s\n]",
]

slice_text, sp, ep = _find_section_slice(
    full_text, cps_pats, stop_pattern=r"\n\s*(?:(?:1[3-9]|[2-9]\d)\.0\b|SECTION\s*[-–—]?\s*(?:VI|VII)\b|13\.0\b)", max_chars=4000
)

print(f"Matched pages: {sp} to {ep}, length: {len(slice_text)}")
print("First 200 chars:")
print(slice_text[:200])
