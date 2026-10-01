"""
Convert test docx to PDF via Word COM and render to image to visually inspect.
"""
from pathlib import Path
import os
import fitz
from PIL import Image
import win32com.client

docx_path = Path("assets/test_output.docx").resolve()
pdf_path = Path("assets/test_output.pdf").resolve()

# 17 = wdFormatPDF
word = win32com.client.Dispatch("Word.Application")
word.Visible = False
try:
    doc = word.Documents.Open(str(docx_path))
    doc.SaveAs(str(pdf_path), FileFormat=17)
    doc.Close(False)
    print("Word successfully converted docx to PDF:", pdf_path)
finally:
    word.Quit()

# Render PDF to image
pdf_doc = fitz.open(str(pdf_path))
print("PDF page count:", len(pdf_doc))
page = pdf_doc[0]
pix = page.get_pixmap(dpi=150)
img_path = Path("assets/test_rendered.png")
pix.save(str(img_path))
print("Saved rendered page image:", img_path)

# Inspect where text starts
img = Image.open(str(img_path))
print("Rendered image size:", img.size)
