import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")

from app.services.pdf_text_extractor import extract_pdf_text_hybrid

pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf", None, max_pages=169)

print("Checking pages 161 to 165 for Payment Terms:")
for p in pages:
    p_num = p.get("page")
    if 160 <= p_num <= 166:
        text = p.get("text", "")
        print(f"\n--- PAGE {p_num} ---")
        for m in re.finditer(r"(?:PAYMENT|TERMS\s+OF\s+PAYMENT|BILLING)[\s\S]{0,1500}", text, re.IGNORECASE):
            print(m.group(0))
