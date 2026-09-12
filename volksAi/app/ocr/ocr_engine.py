from pathlib import Path

import pytesseract
from PIL import Image

from app.models.models import TextBlock


class OcrEngine:
    """
    Line-level OCR using PaddleOCR (primary) and Tesseract (fallback).

    Executes line-level character recognition and extracts word/line bounding
    boxes into standardized TextBlock outputs for layout detection and field extraction.
    """

    # Class-level cache to share raw OCR results and avoid double-processing in layout detection
    _cache: dict[str, dict] = {}
    _paddle_instance = None
    _paddle_attempted = False

    def __init__(self, lang: str = "eng+hin"):
        self.lang = self._verify_languages(lang)
        self._init_paddle()

    @classmethod
    def is_available(cls) -> bool:
        """
        True if either OCR engine (PaddleOCR primary, Tesseract fallback) can
        actually be used. Attempts PaddleOCR initialization (idempotent, cached)
        so availability reflects reality rather than just checking for the
        Tesseract binary on PATH.
        """
        cls._init_paddle()
        if cls._paddle_instance is not None:
            return True
        import shutil
        return shutil.which("tesseract") is not None

    @classmethod
    def _init_paddle(cls):
        import os
        if os.getenv("PADDLE_OCR_ENABLED", "true").lower() == "false":
            return
        if not cls._paddle_attempted:
            cls._paddle_attempted = True
            try:
                from paddleocr import PaddleOCR
                cls._paddle_instance = PaddleOCR(
                    use_angle_cls=True, lang="en", use_gpu=False, show_log=False
                )
                import logging
                logging.getLogger("ocr.ocr_engine").info("[OCR_DIAGNOSTICS] PaddleOCR initialized successfully as primary OCR engine.")
            except Exception as e:
                import logging
                logging.getLogger("ocr.ocr_engine").warning(
                    f"[OCR_DIAGNOSTICS] Failed to initialize PaddleOCR: {e}. Falling back to Tesseract."
                )

    @staticmethod
    def _verify_languages(lang: str) -> str:
        """System diagnostic: verifies that requested Tesseract language packs exist before initializing engine."""
        try:
            available = set(pytesseract.get_languages())
            requested = lang.split("+")
            missing = [l for l in requested if l not in available]
            if missing:
                import logging
                logging.getLogger("ocr.ocr_engine").warning(
                    f"[OCR_DIAGNOSTICS] Missing requested Tesseract language pack(s): {missing}. "
                    f"Available languages: {available}. Ensure 'tesseract-ocr-hin' is installed on system."
                )
                valid = [l for l in requested if l in available]
                return "+".join(valid) if valid else "eng"
        except Exception as e:
            import logging
            logging.getLogger("ocr.ocr_engine").debug(f"[OCR_DIAGNOSTICS] Language verification skipped: {e}")
        return lang

    def run(self, image_path: Path) -> list[TextBlock]:
        cache_key = str(image_path)
        blocks_cache_key = f"blocks_{cache_key}"

        if blocks_cache_key in OcrEngine._cache:
            return OcrEngine._cache[blocks_cache_key]

        # Primary pass: PaddleOCR
        if OcrEngine._paddle_instance is not None:
            try:
                res = OcrEngine._paddle_instance.ocr(str(image_path), cls=True)
                if res and res[0] is not None:
                    text_blocks = []
                    for idx, line in enumerate(res[0]):
                        box, (text, conf) = line
                        if not text or not text.strip():
                            continue
                        xs = [pt[0] for pt in box]
                        ys = [pt[1] for pt in box]
                        x1, y1, x2, y2 = int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))
                        text_blocks.append(TextBlock(
                            block_id=f"blk_{idx+1:04d}",
                            text=text.strip(),
                            confidence=round(float(conf), 4),
                            bounding_box={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                            language_hint=self.lang
                        ))
                    OcrEngine._cache[blocks_cache_key] = text_blocks
                    return text_blocks
            except Exception as p_err:
                import logging
                logging.getLogger("ocr.ocr_engine").warning(
                    f"[OCR_DIAGNOSTICS] PaddleOCR execution failed on {image_path.name}: {p_err}. Falling back to Tesseract."
                )

        # Fallback pass: Tesseract OCR
        if cache_key in OcrEngine._cache:
            data = OcrEngine._cache[cache_key]
        else:
            try:
                img = Image.open(image_path).convert("RGB")
                data = pytesseract.image_to_data(
                    img, lang=self.lang, output_type=pytesseract.Output.DICT
                )
                OcrEngine._cache[cache_key] = data
            except Exception as tess_err:
                import logging
                logging.getLogger("ocr.ocr_engine").warning(
                    f"[OCR_ENGINE_UNAVAILABLE] Tesseract OCR failed on {image_path.name}: {tess_err}. "
                    "Marking page text as unverified scanned content (confidence=0.0)."
                )
                return []


        # Group Tesseract's word-level boxes into line-level blocks (grouped
        # by block/paragraph/line index) so downstream anchor/regex matching
        # in ocr/extractors/field_extractor.py sees whole lines, matching the
        # granularity the rest of the pipeline expects.
        lines: dict[tuple, dict] = {}
        n = len(data["text"])
        for i in range(n):
            text = data["text"][i].strip()
            if not text:
                continue
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
            conf_raw = data["conf"][i]
            try:
                conf = max(float(conf_raw), 0.0) / 100.0
            except (TypeError, ValueError):
                conf = 0.0

            line = lines.setdefault(key, {
                "words": [], "confs": [], "x1": x, "y1": y, "x2": x + w, "y2": y + h
            })
            line["words"].append(text)
            line["confs"].append(conf)
            line["x1"] = min(line["x1"], x)
            line["y1"] = min(line["y1"], y)
            line["x2"] = max(line["x2"], x + w)
            line["y2"] = max(line["y2"], y + h)

        text_blocks = []
        for idx, (key, line) in enumerate(sorted(lines.items())):
            avg_conf = sum(line["confs"]) / len(line["confs"]) if line["confs"] else 0.0
            text_blocks.append(TextBlock(
                block_id=f"blk_{idx+1:04d}",
                text=" ".join(line["words"]),
                confidence=round(avg_conf, 4),
                bounding_box={"x1": line["x1"], "y1": line["y1"], "x2": line["x2"], "y2": line["y2"]},
                language_hint=self.lang,
            ))
        OcrEngine._cache[blocks_cache_key] = text_blocks
        return text_blocks
