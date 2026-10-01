"""
Extract header and footer bands from letterhead_volks.pdf at 300 DPI.
"""
from pathlib import Path
import shutil
import fitz
from PIL import Image
import numpy as np

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Ensure letterhead_volks.pdf exists in assets/
pdf_source = Path(__file__).resolve().parent.parent / "letterhead volks pdf.pdf"
pdf_target = ASSETS_DIR / "letterhead_volks.pdf"
if pdf_source.exists() and not pdf_target.exists():
    shutil.copy2(pdf_source, pdf_target)

print(f"Using PDF: {pdf_target}")
doc = fitz.open(str(pdf_target))
page = doc[0]
rect = page.rect
print(f"Page dimensions in points: width={rect.width} pt, height={rect.height} pt")

# Render at 300 DPI
DPI = 300
scale = DPI / 72.0
matrix = fitz.Matrix(scale, scale)
pix = page.get_pixmap(matrix=matrix, alpha=False)
full_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
print(f"Rendered page size: {full_img.size} (width={full_img.width}, height={full_img.height})")

arr = np.array(full_img.convert("L"))

# Measure pixel boundaries from the rendered page
# Non-white pixels:
row_min = arr.min(axis=1)

# Header boundaries:
# Top starts at row 0 (contains top stripes).
# Find where the divider line ends:
header_non_white = np.where(row_min[:1000] < 250)[0]
header_bottom = int(header_non_white.max()) + 1  # 459
print(f"Header band rows: 0 to {header_bottom} (height = {header_bottom} px = {header_bottom / DPI:.4f} in = {header_bottom / scale:.2f} pt)")

# Footer boundaries:
footer_non_white = np.where(row_min[2500:] < 250)[0] + 2500
footer_top = int(footer_non_white.min())
footer_bottom = int(footer_non_white.max()) + 1
print(f"Footer content rows: {footer_top} to {footer_bottom} (height = {footer_bottom - footer_top} px)")
print(f"Footer from bottom edge: {full_img.height - footer_top} px to {full_img.height - footer_bottom} px")

# Save header_band.png (full width, 0 to header_bottom)
header_band = full_img.crop((0, 0, full_img.width, header_bottom))
header_path = ASSETS_DIR / "header_band.png"
header_band.save(str(header_path), dpi=(DPI, DPI))
print(f"Saved header band: {header_path} ({header_band.size})")

# For footer_band.png, let's also check width and cropping:
# The footer content is CIN/PAN/MSME and the line below it.
# Let's crop full width from footer_top to footer_bottom (with 1px padding: footer_top - 2 to footer_bottom + 2)
# Wait, let's check what footer_band looks like:
footer_crop_top = max(0, footer_top - 2)
footer_crop_bottom = min(full_img.height, footer_bottom + 2)
footer_band = full_img.crop((0, footer_crop_top, full_img.width, footer_crop_bottom))
footer_path = ASSETS_DIR / "footer_band.png"
footer_band.save(str(footer_path), dpi=(DPI, DPI))
print(f"Saved footer band: {footer_path} ({footer_band.size})")
