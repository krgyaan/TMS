from pathlib import Path
import cv2
import numpy as np
import pytesseract

try:
    import fitz  # PyMuPDF
except ImportError:
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
        print("Uploaded image of", ext , "type.")
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

        images = []
        zoom = 2.0  # 2x scaling for ~300 DPI
        mat = fitz.Matrix(zoom, zoom)

        for page_num in range(doc.page_count):
            print(f"Processing page {page_num + 1} of {doc.page_count}")
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            # print(f"Page {page_num + 1}: shape={img.shape}, channels={pix.n}")
            if pix.n == 3:
                bgr_img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            elif pix.n == 4:
                bgr_img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif pix.n == 1:
                # Grayscale: convert to 3-channel BGR (optional)
                bgr_img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            else:
                raise ValueError(f"Unsupported number of channels in PDF image: {pix.n}")
            images.append(bgr_img)
        doc.close()
        return images

    raise ValueError(f"Unsupported file extension: {ext}")

def extract_text_tesseract(image_or_pdf_path: str) -> str:
    data = load_image(image_or_pdf_path)

    def ocr_image(bgr_img: np.ndarray) -> str:
        # Handle both color and grayscale inputs robustly
        if bgr_img.ndim == 2:
            gray = bgr_img
        else:
            gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        return pytesseract.image_to_string(gray, lang='eng+hin').strip()

    # If a PDF was loaded, we receive a list of page images (BGR np.ndarrays)
    if isinstance(data, list):
        texts = []
        for idx, page_img in enumerate(data, start=1):
            print("Appending Index:", idx, "for display.")
            texts.append(ocr_image(page_img))
        return "\n\n".join(texts).strip()

    # Single image path: just OCR directly
    return ocr_image(data)
