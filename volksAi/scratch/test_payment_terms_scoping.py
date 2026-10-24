import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")
from app.services.pdf_parent_ingest import extract_pdf_text_hybrid, CHILD_PDF_MAX_PAGES
from app.services.llm_field_resolver import extract_scoped_context

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

main_pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=50)
atc_pages = extract_pdf_text_hybrid(atc_pdf, None, max_pages=CHILD_PDF_MAX_PAGES)
full_text = "\n".join([f"--- [PAGE {p['page']}] ---\n" + p.get("text", "") for p in main_pages + atc_pages])

scoped = extract_scoped_context(full_text, "payment_terms")
print(f"Scoped length: {len(scoped)}")
print("First 400 chars:\n", scoped[:400])
print("\nLast 300 chars:\n", scoped[-300:])

import re
pages_in_scoped = list(re.finditer(r"--- \[PAGE (\d+)\] ---", scoped))
if pages_in_scoped:
    print(f"\nPages found inside scoped text: {[int(m.group(1)) for m in pages_in_scoped]}")
