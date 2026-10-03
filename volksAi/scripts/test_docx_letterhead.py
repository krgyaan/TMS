"""
Test script to verify python-docx header/footer image insertion and margins.
"""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()
section = doc.sections[0]

# Set page size to A4
section.page_width = Pt(595.3)   # 8.27 in
section.page_height = Pt(841.9)  # 11.69 in

# Set margins
section.left_margin = Inches(0.5)
section.right_margin = Inches(0.5)
section.top_margin = Pt(128)      # 110 pt header + 18 pt gap
section.bottom_margin = Pt(65)    # 43 pt footer + 22 pt gap
section.header_distance = Pt(0)
section.footer_distance = Pt(32)

assets_dir = Path("assets")
header_img = assets_dir / "header_band.png"
footer_img = assets_dir / "footer_band.png"

# Header
header = section.header
p_head = header.paragraphs[0]
p_head.paragraph_format.space_before = Pt(0)
p_head.paragraph_format.space_after = Pt(0)
p_head.paragraph_format.left_indent = -section.left_margin
p_head.paragraph_format.right_indent = -section.right_margin
run_head = p_head.add_run()
run_head.add_picture(str(header_img), width=section.page_width)

# Footer
footer = section.footer
p_foot = footer.paragraphs[0]
p_foot.paragraph_format.space_before = Pt(0)
p_foot.paragraph_format.space_after = Pt(0)
p_foot.paragraph_format.left_indent = -section.left_margin
p_foot.paragraph_format.right_indent = -section.right_margin
run_foot = p_foot.add_run()
run_foot.add_picture(str(footer_img), width=section.page_width)

# Body content
doc.add_heading("FORMAT F-2A DECLARATION FOR BID SECURITY", level=1)
doc.add_paragraph("To, M/s GAIL (INDIA) LIMITED")
doc.add_paragraph("Tender No: ______________________________")
doc.add_paragraph("we M/s______ (Name of Bidder) have submitted our offer/ bid no. ______")

test_path = assets_dir / "test_output.docx"
doc.save(str(test_path))
print(f"Saved test document to: {test_path}")

# Verify reading back
doc_back = Document(str(test_path))
print("Paragraphs in body:", len(doc_back.paragraphs))
sec_back = doc_back.sections[0]
print("Header paragraphs:", len(sec_back.header.paragraphs))
print("Footer paragraphs:", len(sec_back.footer.paragraphs))
print("Header runs:", len(sec_back.header.paragraphs[0].runs))
print("Footer runs:", len(sec_back.footer.paragraphs[0].runs))

# Check for blip / image relationship in header and footer XML
header_xml = sec_back.header.paragraphs[0]._p.xml
footer_xml = sec_back.footer.paragraphs[0]._p.xml
print("Header has blip/drawing:", "blip" in header_xml or "drawing" in header_xml)
print("Footer has blip/drawing:", "blip" in footer_xml or "drawing" in footer_xml)
