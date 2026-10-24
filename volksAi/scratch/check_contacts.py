import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")

from app.services.pdf_text_extractor import extract_pdf_text_hybrid

main_pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf", None, max_pages=9)
atc_pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf", None, max_pages=35)

print("Checking for Phone numbers in ATC (pages 1-35):")
for p in atc_pages:
    text = p.get("text", "")
    p_num = p.get("page")
    for ph in ["2513682", "2748423", "2749771", "Vishal", "Narasinga"]:
        if ph.lower() in text.lower():
            for m in re.finditer(re.escape(ph), text, re.IGNORECASE):
                start = max(0, m.start() - 60)
                end = min(len(text), m.end() + 100)
                print(f"Page {p_num}: {text[start:end].replace(chr(10), ' ')}")
