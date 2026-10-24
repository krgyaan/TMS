import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")
from app.services.pdf_parent_ingest import extract_pdf_text_hybrid, CHILD_PDF_MAX_PAGES
from app.services.tender_mapper import build_infosheet_data

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
atc_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817212079_GAILVIJAY_ATC.pdf"

main_pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=50)
atc_pages = extract_pdf_text_hybrid(atc_pdf, None, max_pages=CHILD_PDF_MAX_PAGES)
all_pages = main_pages + atc_pages
atc_full_text = "\n".join([f"\n--- [PAGE {p['page']}] ---\n" + p.get("text", "") for p in atc_pages])

# Dummy sections with payment_terms from GeM
sections = [{"fields": [{"field_name": "payment_terms", "value": "shall be as mentioned in GPC/SCC."}]}]
res = build_infosheet_data(sections, all_pages, job_id="test", atc_full_text=atc_full_text)
print("payment_terms_supply_display:", repr(res.get("payment_terms_supply_display")))
print("payment_terms_installation_display:", repr(res.get("payment_terms_installation_display")))
