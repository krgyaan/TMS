import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi")
from app.services.pdf_parent_ingest import extract_pdf_text_hybrid

main_pdf = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\api\uploads\tendering\tender-documents\1792817184361_GAIL_Vijaywada.pdf"
pages = extract_pdf_text_hybrid(main_pdf, None, max_pages=5)
for p in pages:
    if "Startup" in p["text"] or "startup" in p["text"]:
        print(f"=== Page {p['page']} ===")
        lines = p["text"].split("\n")
        for i, line in enumerate(lines):
            if any(k in line.lower() for k in ["startup", "relaxation", "dpiit"]):
                print(f"L{i}: {line}")
                for j in range(max(0, i-2), min(len(lines), i+4)):
                    print(f"   ctx {j}: {lines[j]}")
