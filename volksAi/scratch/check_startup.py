import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")

from app.services.pdf_text_extractor import extract_pdf_text_hybrid

atc_pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf", None, max_pages=30)
main_pages = extract_pdf_text_hybrid(r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf", None, max_pages=9)

print("Checking for DPIIT / Startup in Main PDF:")
for p in main_pages:
    for m in re.finditer(r"(?:Startup|DPIIT)[\s\S]{0,150}", p.get("text", ""), re.IGNORECASE):
        print(f"P{p['page']}: {m.group(0).replace(chr(10), ' ')}")

print("\nChecking for DPIIT / Startup in ATC (first 30 pages):")
for p in atc_pages:
    for m in re.finditer(r"(?:DPIIT|Startup\s+relaxation|relaxation\s+to\s+startup|startups?)[\s\S]{0,200}", p.get("text", ""), re.IGNORECASE):
        print(f"P{p['page']}: {m.group(0).replace(chr(10), ' ')}")
