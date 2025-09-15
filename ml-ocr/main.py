import sys
from pathlib import Path
import cv2
import numpy as np
import pytesseract

try:
    import fitz  # PyMuPDF
except ImportError:  # handled gracefully if not present
    fitz = None

SUPPORTED_IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'}

def resolve_path(rel_or_abs: str) -> Path:
    p = Path(rel_or_abs)
    if not p.is_absolute():
        p = Path(__file__).parent.resolve() / p
    return p

def load_image(path_str: str):
    p = resolve_path(path_str)
    if not p.exists():
        raise FileNotFoundError(f"Input file not found: {p}")

    ext = p.suffix.lower()

    if ext in SUPPORTED_IMAGE_EXTS:
        img = cv2.imread(str(p))
        if img is None:
            raise ValueError(f"Failed to read image file via OpenCV: {p}")
        return img

    if ext == '.pdf':
        if fitz is None:
            raise RuntimeError("PyMuPDF (pymupdf) is required to read PDFs. Install it: pip install pymupdf")
        doc = fitz.open(str(p))
        if doc.page_count == 0:
            raise ValueError(f"PDF has no pages: {p}")
        page = doc.load_page(0)  # first page
        # scale up ~2x for better OCR quality (~300 dpi equivalent on many PDFs)
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        # PyMuPDF pixmaps are RGB; convert to BGR for OpenCV
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        doc.close()
        return img

    raise ValueError(f"Unsupported file extension: {ext}")

def extract_text_tesseract(image_or_pdf_path: str) -> str:
    # Preprocess image
    img = load_image(image_or_pdf_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # OCR with Tesseract
    text = pytesseract.image_to_string(gray, lang='eng+hin')
    return text.strip()


def main():
    default_path = 'samples/best_technologies.pdf'
    target_path = sys.argv[1] if len(sys.argv) > 1 else default_path
    try:
        text = extract_text_tesseract(target_path)
        print(text)
    except Exception as e:
        print(f"Error: {e}")


if __name__ == '__main__':
    main()
