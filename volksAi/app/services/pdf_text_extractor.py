import os
import re
import logging
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
from app.ocr.ocr_engine import OcrEngine
from typing import List, Dict, Any, Optional
from app.models.models import TextBlock

logger = logging.getLogger("backend.app.services.pdf_text_extractor")
MAX_OCR_PAGES_PER_DOC = int(os.getenv("MAX_OCR_PAGES_PER_DOC", "25"))

def preprocess_image_for_ocr(img_path: Path) -> Path:
    """
    Performs lightweight image preprocessing for improved OCR accuracy:
    - Grayscale conversion
    - Contrast enhancement
    - Sharpening instead of blurring to keep character edges clean
    - Avoids global threshold binarization to let Tesseract do internal adaptive thresholding
    """
    try:
        with Image.open(img_path) as img:
            # 1. Convert to grayscale
            gray = img.convert("L")
            
            # 2. Contrast enhancement
            enhancer = ImageEnhance.Contrast(gray)
            enhanced = enhancer.enhance(2.0)
            
            # 3. Sharpening filter to make text borders crisp
            sharpened = enhanced.filter(ImageFilter.SHARPEN)
            
            # Save preprocessed image (as grayscale, letting Tesseract handle binarization)
            processed_path = img_path.parent / f"preprocessed_{img_path.name}"
            sharpened.save(processed_path)
            return processed_path
    except Exception as e:
        print(f"OCR preprocessing warning: {e}. Falling back to original image.")
        return img_path

def is_text_scrambled_or_garbage(text: str) -> bool:
    """
    Detects if native PDF text is scrambled or contains corrupted font mappings
    (e.g., (cid:X) codes or high non-alphanumeric ratio).
    """
    if not text:
        return True
    
    # Common PyMuPDF font corruption artifacts
    if text.count("(cid:") > 3:
        return True
        
    # Check alphanumeric ratio
    cleaned = text.strip()
    if not cleaned:
        return True
        
    total_len = len(cleaned)
    alnum_count = sum(1 for c in cleaned if c.isalnum() or c.isspace())
    if alnum_count / total_len < 0.6:
        return True
        
    return False

def cluster_words_into_cells(words, gap_threshold=15):
    if not words:
        return []
    words_sorted = sorted(words, key=lambda w: (w[1], w[0]))  # y, x
    cells, current = [], [words_sorted[0]]
    for w in words_sorted[1:]:
        prev = current[-1]
        same_line = abs(w[1] - prev[1]) < 5
        close_enough = (w[0] - prev[2]) < gap_threshold
        if same_line and close_enough:
            current.append(w)
        else:
            cells.append(current)
            current = [w]
    cells.append(current)
    return [
        {
            "text": " ".join(w[4] for w in cell),
            "confidence": 100.0,
            "bounding_box": {
                "x1": int(round(min(w[0] for w in cell))),
                "y1": int(round(min(w[1] for w in cell))),
                "x2": int(round(max(w[2] for w in cell))),
                "y2": int(round(max(w[3] for w in cell))),
            },
            "language_hint": "en",
        }
        for cell in cells
    ]

def build_text_blocks_from_words(words: list) -> list[dict]:
    """
    Groups PyMuPDF word-level tuples into line-level block dicts.
    PyMuPDF get_text('words') returns tuples:
    (x0, y0, x1, y1, word, block_no, line_no, word_no)
    Returns list of dicts with keys: block_id, text, confidence, bounding_box, language_hint
    """
    lines_map = {}
    for w in words:
        # w comes as a tuple from PyMuPDF: (x0, y0, x1, y1, word, block_no, line_no, word_no)
        try:
            x0, y0, x1, y1, text, block_no, line_no, word_no = w
        except Exception:
            # If word is already a dict, adapt to its structure
            text = w.get("text") if isinstance(w, dict) else str(w)
            bbox = w.get("bbox") if isinstance(w, dict) else None
            if bbox:
                x0, y0, x1, y1 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
            block_no = w.get("block_no", 0) if isinstance(w, dict) else 0
            line_no = w.get("line_no", 0) if isinstance(w, dict) else 0

        key = (block_no, line_no)
        lines_map.setdefault(key, []).append({
            "text": text,
            "bounding_box": {"x1": x0, "y1": y0, "x2": x1, "y2": y1}
        })

    blocks = []
    for idx, ((block_no, line_no), line_words) in enumerate(sorted(lines_map.items())):
        line_words.sort(key=lambda w: w["bounding_box"]["x1"])
        joined_text = " ".join(w["text"] for w in line_words)
        x1 = int(round(min(w["bounding_box"]["x1"] for w in line_words)))
        y1 = int(round(min(w["bounding_box"]["y1"] for w in line_words)))
        x2 = int(round(max(w["bounding_box"]["x2"] for w in line_words)))
        y2 = int(round(max(w["bounding_box"]["y2"] for w in line_words)))
        blocks.append({
            "block_id": f"native_{idx}",
            "text": joined_text,
            "confidence": 1.0,
            "bounding_box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "language_hint": "en"
        })
    return blocks

ANNEXURE_KEYWORDS_RE = re.compile(
    r"\b(?:annexure|proforma|format|undertaking|declaration|schedule\s+of\s+deviation|deviation\s+schedule|gtp|guaranteed\s+technical|bank\s+guarantee|maf|manufacturer(?:'s)?\s+authorization|local\s+content|make\s+in\s+india|bid\s+form|form\s+f-?\d+|integrity\s+pact|blacklisting|debarment)\b",
    re.IGNORECASE,
)


def select_smart_pages(doc: Any, max_pages: int) -> List[int]:
    """
    Selects up to `max_pages` pages prioritizing:
    1. First 40 pages (Notice Inviting Tender, ITB, BEC, Eligibility criteria).
    2. Last 45 pages (Where Annexures, Formats, Proformas, Undertakings, Declarations always live).
    3. Any middle page containing Annexure/Format/Deviation/Undertaking keywords.
    """
    total_len = len(doc)
    if total_len <= max_pages:
        return list(range(total_len))

    head_budget = min(40, max_pages // 2)
    tail_budget = min(45, max_pages // 2)

    head_pages = set(range(head_budget))
    tail_pages = set(range(max(0, total_len - tail_budget), total_len))

    # Fast scan of middle pages (<20ms across hundreds of pages in PyMuPDF)
    middle_keyword_pages = []
    for i in range(head_budget, total_len - tail_budget):
        try:
            txt = doc[i].get_text()
            if ANNEXURE_KEYWORDS_RE.search(txt):
                middle_keyword_pages.append(i)
        except Exception:
            continue

    remaining = max_pages - len(head_pages) - len(tail_pages)
    if remaining > 0 and len(middle_keyword_pages) > remaining:
        middle_keyword_pages = middle_keyword_pages[:remaining]
    elif remaining <= 0:
        middle_keyword_pages = []

    selected = sorted(head_pages | tail_pages | set(middle_keyword_pages))
    return selected


_PDF_MEMORY_CACHE: Dict[str, Any] = {}
_CHECKBOX_TRIGGER_CHARS = frozenset({"\uf050", "þ", "✔", "☑", "\uf04f", "¨", "☐"})


def compute_pdf_cache_key(
    pdf_path: str | Path,
    max_pages: Optional[int] = None,
    smart_sampling: bool = False,
    zoom: Optional[float] = None,
) -> str:
    """Compute a deterministic cache key from the SHA-256 of the PDF bytes and extraction options."""
    import hashlib
    resolved_zoom = zoom if zoom is not None else float(os.getenv("PDF_OCR_ZOOM", "2.08"))
    h = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    meta = f"|max_pages={max_pages}|smart_sampling={bool(smart_sampling)}|zoom={resolved_zoom:.2f}"
    h.update(meta.encode("utf-8"))
    return h.hexdigest()


def _get_cached_pdf_extraction(cache_key: str) -> Optional[List[Dict[str, Any]]]:
    import copy
    import pickle
    import time

    if os.getenv("VOLKSAI_PDF_CACHE_ENABLED", "true").lower() == "false":
        return None
    ttl_sec = float(os.getenv("VOLKSAI_PDF_CACHE_TTL_SEC", "3600"))
    now = time.time()

    mem_entry = _PDF_MEMORY_CACHE.get(cache_key)
    if mem_entry is not None:
        ts, data = mem_entry
        if now - ts <= ttl_sec:
            return copy.deepcopy(data)
        _PDF_MEMORY_CACHE.pop(cache_key, None)

    cache_dir = Path(os.getenv("VOLKSAI_PDF_CACHE_DIR", "/tmp/volksai_pdf_cache"))
    cache_file = cache_dir / f"{cache_key}.pkl"
    if cache_file.exists():
        try:
            if now - cache_file.stat().st_mtime <= ttl_sec:
                data = pickle.loads(cache_file.read_bytes())
                _PDF_MEMORY_CACHE[cache_key] = (now, data)
                return copy.deepcopy(data)
            else:
                cache_file.unlink(missing_ok=True)
        except Exception:
            pass
    return None


def _store_cached_pdf_extraction(cache_key: str, results: List[Dict[str, Any]]) -> None:
    import copy
    import pickle
    import time

    if os.getenv("VOLKSAI_PDF_CACHE_ENABLED", "true").lower() == "false":
        return
    max_entries = int(os.getenv("VOLKSAI_PDF_CACHE_MAX_ENTRIES", "64"))
    now = time.time()

    if len(_PDF_MEMORY_CACHE) >= max_entries:
        oldest_key = min(_PDF_MEMORY_CACHE, key=lambda k: _PDF_MEMORY_CACHE[k][0])
        _PDF_MEMORY_CACHE.pop(oldest_key, None)
    _PDF_MEMORY_CACHE[cache_key] = (now, copy.deepcopy(results))

    try:
        cache_dir = Path(os.getenv("VOLKSAI_PDF_CACHE_DIR", "/tmp/volksai_pdf_cache"))
        cache_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(cache_dir.glob("*.pkl"), key=lambda p: p.stat().st_mtime)
        while len(files) >= max_entries:
            oldest = files.pop(0)
            oldest.unlink(missing_ok=True)
        cache_file = cache_dir / f"{cache_key}.pkl"
        cache_file.write_bytes(pickle.dumps(results))
    except Exception:
        pass


def extract_pdf_text_hybrid(
    pdf_path: str,
    pages_dir: Path,
    max_pages: Optional[int] = None,
    smart_sampling: bool = False,
) -> List[Dict[str, Any]]:
    """
    Hybrid PDF extraction.
    Determines if a page is a text-based digital PDF or a scanned image page.
    Applies image preprocessing before running Tesseract on scanned pages.
    """
    import fitz
    from app.core.timing import stage_timer

    pdf_name = Path(pdf_path).name
    with stage_timer(f"pdf_open_and_text_extract:{pdf_name}"):
        cache_key = None
        try:
            cache_key = compute_pdf_cache_key(pdf_path, max_pages=max_pages, smart_sampling=smart_sampling)
            cached = _get_cached_pdf_extraction(cache_key)
            if cached is not None:
                logger.info(f"[PDF_CACHE] Cache hit for '{pdf_name}' (key={cache_key[:12]})")
                return cached
        except Exception:
            cache_key = None

        doc = fitz.open(pdf_path)
        ocr_engine = None
        ocr_count = 0
        results = []

        if max_pages is not None and len(doc) > max_pages and smart_sampling:
            page_indices = select_smart_pages(doc, max_pages)
        elif max_pages is not None:
            page_indices = list(range(min(len(doc), max_pages)))
        else:
            page_indices = list(range(len(doc)))

        for page_num in page_indices:
            page = doc.load_page(page_num)
            native_text = page.get_text()
            
            # Advanced quality heuristics
            stripped = native_text.strip()
            words = stripped.split()
            word_count = len(words)
            
            is_digital = False
            if len(stripped) > 5 and word_count > 0:
                if word_count > 5:
                    avg_word_len = len(stripped) / word_count
                    if 3.0 <= avg_word_len <= 15.0 and not is_text_scrambled_or_garbage(native_text):
                        is_digital = True
                else:
                    if not is_text_scrambled_or_garbage(native_text):
                        is_digital = True
                    
            if is_digital:
                native_words = page.get_text("words")
                blocks = build_text_blocks_from_words(native_words)
                if any(ch in native_text for ch in _CHECKBOX_TRIGGER_CHARS) or "applicable" in native_text.lower():
                    cb_states = extract_checkbox_states(page)
                else:
                    cb_states = []
                results.append({
                    "page": page_num + 1,
                    "text": native_text,
                    "source": "native",
                    "confidence": 100.0,
                    "blocks": blocks,
                    "checkboxes": cb_states
                })
            else:
                # Check if an OCR engine (PaddleOCR primary, Tesseract fallback) is usable
                has_ocr_engine = OcrEngine.is_available() and ocr_count < MAX_OCR_PAGES_PER_DOC

                if not has_ocr_engine:
                    if ocr_count >= MAX_OCR_PAGES_PER_DOC and OcrEngine.is_available():
                        logger.warning(
                            f"Skipping OCR for page {page_num + 1}: Reached MAX_OCR_PAGES_PER_DOC limit ({MAX_OCR_PAGES_PER_DOC}). Using native text fallback."
                        )
                    # Fast fallback directly to native words without image I/O overhead
                    native_words = page.get_text("words")
                    blocks_data = build_text_blocks_from_words(native_words)
                    blocks = [
                        TextBlock(
                            block_id=b["block_id"],
                            text=b["text"],
                            confidence=b["confidence"],
                            bounding_box=b["bounding_box"],
                            language_hint=b.get("language_hint", "en")
                        ) for b in blocks_data
                    ]
                    results.append({
                        "page": page_num + 1,
                        "text": native_text,
                        "source": "native_fallback",
                        "confidence": 100.0,
                        "blocks": blocks,
                        "checkboxes": []
                    })
                    continue

                ocr_count += 1
                # Scanned page detected and tesseract available -> render to image
                if not ocr_engine:
                    ocr_engine = OcrEngine(lang="eng+hin")
                    
                zoom = float(os.getenv("PDF_OCR_ZOOM", "2.08"))  # ~150 DPI for fast character matching without massive memory overhead
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                pages_dir.mkdir(parents=True, exist_ok=True)
                img_path = pages_dir / f"page_{page_num + 1:04d}.png"
                pix.save(str(img_path))
                pix = None  # release memory
                
                # Preprocess image to enhance OCR accuracy
                preprocessed_path = preprocess_image_for_ocr(img_path)
                
                # Run OCR on preprocessed image with safety fallback
                try:
                    with stage_timer(
                        f"ocr_page:{pdf_name}:p{page_num + 1}",
                        extra_meta={"engine": getattr(ocr_engine, "active_engine", "unknown")},
                    ):
                        blocks = ocr_engine.run(preprocessed_path)
                    ocr_text = "\n".join([b.text for b in blocks])
                    avg_conf = sum([b.confidence for b in blocks]) / len(blocks) if blocks else 0.0
                    is_ocr_success = True
                except Exception as ocr_err:
                    import logging
                    logging.getLogger("backend.app.services.pdf_text_extractor").warning(
                        f"OCR execution failed on page {page_num + 1}: {ocr_err}. Falling back to native text extraction."
                    )
                    native_words = page.get_text("words")
                    blocks_data = build_text_blocks_from_words(native_words)
                    blocks = [
                        TextBlock(
                            block_id=b["block_id"],
                            text=b["text"],
                            confidence=b["confidence"],
                            bounding_box=b["bounding_box"],
                            language_hint=b.get("language_hint", "en")
                        ) for b in blocks_data
                    ]
                    ocr_text = native_text
                    avg_conf = 1.0
                    is_ocr_success = False

                # Clean up temporary preprocessed image file
                if preprocessed_path != img_path:
                    try:
                        preprocessed_path.unlink()
                    except Exception:
                        pass

                results.append({
                    "page": page_num + 1,
                    "text": ocr_text,
                    "source": "ocr" if is_ocr_success else "native_fallback",
                    "confidence": round(avg_conf * 100, 2),
                    "blocks": [
                        {
                            "block_id": b.block_id,
                            "text": b.text,
                            "confidence": b.confidence,
                            "bounding_box": b.bounding_box
                        } for b in blocks
                    ]
                })

        doc.close()
        if cache_key is not None:
            _store_cached_pdf_extraction(cache_key, results)
    return results


def extract_checkbox_states(page) -> List[Dict[str, Any]]:
    """
    Extracts Wingdings checkbox states from a PyMuPDF page object using get_text("dict").
    Recognizes \uf050 (Wingdings2 'P') as CHECKED and \uf04f (Wingdings2 'O') as UNCHECKED.
    Associates each checkbox with its nearest binary text label by Euclidean proximity.
    """
    text_dict = page.get_text("dict")
    checkboxes = []
    text_spans = []

    CHECKED_GLYPHS = {"\uf050", "þ", "✔", "☑"}
    UNCHECKED_GLYPHS = {"\uf04f", "¨", "☐"}

    for block in text_dict.get("blocks", []):
        if block.get("type") == 0:  # Text block
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    font_name = str(span.get("font", "")).lower()
                    text = span.get("text", "")
                    bbox = span.get("bbox", (0, 0, 0, 0))

                    if "wingdings" in font_name or any(c in text for c in CHECKED_GLYPHS | UNCHECKED_GLYPHS):
                        for char in text:
                            if char in CHECKED_GLYPHS:
                                status = "CHECKED"
                            elif char in UNCHECKED_GLYPHS:
                                status = "UNCHECKED"
                            elif "wingdings" in font_name:
                                status = "AMBIGUOUS_CHECKBOX"
                            else:
                                continue

                            checkboxes.append({
                                "char": char,
                                "status": status,
                                "bbox": bbox,
                                "font": font_name,
                                "page": getattr(page, "number", 0) + 1
                            })
                    else:
                        text_str = text.strip()
                        if text_str:
                            text_spans.append({
                                "text": text_str,
                                "bbox": bbox
                            })

    results = []
    for cb in checkboxes:
        cb_x = (cb["bbox"][0] + cb["bbox"][2]) / 2.0
        cb_y = (cb["bbox"][1] + cb["bbox"][3]) / 2.0

        closest_label = None
        min_dist = float("inf")

        for ts in text_spans:
            lbl_x = (ts["bbox"][0] + ts["bbox"][2]) / 2.0
            lbl_y = (ts["bbox"][1] + ts["bbox"][3]) / 2.0

            # Vertical row alignment check (tolerance ±25pt)
            if abs(cb_y - lbl_y) <= 25.0:
                dist = ((cb_x - lbl_x) ** 2 + (cb_y - lbl_y) ** 2) ** 0.5
                if dist < min_dist:
                    min_dist = dist
                    closest_label = ts["text"]

        if closest_label:
            cb["associated_label"] = closest_label
        results.append(cb)

    return results

