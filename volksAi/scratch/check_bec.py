import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")
from app.services.pdf_parent_ingest import extract_pdf_text_hybrid, CHILD_PDF_MAX_PAGES

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=50) + extract_pdf_text_hybrid(atc_pdf, None, max_pages=CHILD_PDF_MAX_PAGES)
full_text = "\n".join([f"--- [PAGE {p['page']}] ---\n" + p.get("text", "") for p in pages])

print("Searching for turnover, 32.18, net worth:")
for m in re.finditer(r"(?:32\.18|turnover|net\s*worth|financial\s+criteria)[\s\S]{0,300}", full_text, re.IGNORECASE):
    # find page
    p_num = "unknown"
    pre = list(re.finditer(r"--- \[PAGE (\d+)\] ---", full_text[:m.start() + 50]))
    if pre:
        p_num = pre[-1].group(1)
    print(f"[Page {p_num}] {m.group(0).strip()}")
    print("-" * 50)
