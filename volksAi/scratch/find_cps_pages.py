import sys
import os
import re

volksai_dir = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi"
if volksai_dir not in sys.path:
    sys.path.insert(0, volksai_dir)

from app.services.pdf_text_extractor import extract_pdf_text_hybrid

atc_path = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"
pages = extract_pdf_text_hybrid(atc_path, None, max_pages=200)

print(f"Total ATC pages: {len(pages)}")
for p in pages:
    text = p.get("text", "")
    page_num = p.get("page")
    for m in re.finditer(r"(?:CONTRACT\s+PERFORMANCE\s+SECURITY|PERFORMANCE\s+SECURITY|CPS\b|ePBG\b)", text, re.IGNORECASE):
        start = max(0, m.start() - 20)
        end = min(len(text), m.end() + 100)
        snippet = text[start:end].replace('\n', ' ')
        if "12.0" in text[max(0, m.start()-50):min(len(text), m.end()+50)] or "SCC" in text[:300] or "SECTION-V" in text[:300] or "GCC" in snippet or "Clause" in snippet:
            print(f"Page {page_num}: {snippet}")
