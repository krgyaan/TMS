import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")

from app.services.pdf_text_extractor import extract_pdf_text_hybrid

pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf", None, max_pages=9)

print("Dates in main PDF:")
for p in pages:
    matches = list(re.finditer(r"\b\d{2}[-./]\d{2}[-./]\d{4}\b", p.get("text", "")))
    if matches:
        for m in matches:
            start = max(0, m.start() - 30)
            end = min(len(p.get("text", "")), m.end() + 30)
            print(f"  Page {p['page']}: {m.group(0)} | snippet: {p.get('text', '')[start:end].replace(chr(10), ' ')}")

atc_pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf", None, max_pages=15)
print("\nDates in first 15 pages of ATC:")
for p in atc_pages:
    for m in re.finditer(r"\b2[3-5][-./]09[-./]2026\b", p.get("text", "")):
        start = max(0, m.start() - 30)
        end = min(len(p.get("text", "")), m.end() + 30)
        print(f"  Page {p['page']}: {m.group(0)} | snippet: {p.get('text', '')[start:end].replace(chr(10), ' ')}")
