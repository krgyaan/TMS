import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")
from app.services.pdf_parent_ingest import extract_pdf_text_hybrid
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"
pages = extract_pdf_text_hybrid(atc_pdf, None, max_pages=120)
for p in pages:
    if p['page'] in (115, 116):
        print(f"=== Page {p['page']} ===")
        print(p['text'])
