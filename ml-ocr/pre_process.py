import re
import logging
import unicodedata
from typing import List, Tuple, Optional

# Configure behavior here (no signature changes needed)
CONFIG = {
    "lowercase": False,     # Set True if you want fully lowercase output
    "ascii_only": True,    # Set True to strip non-ASCII (will remove Hindi)
    "max_blank_lines": 1,   # Preserve up to N consecutive blank lines
}

logger = logging.getLogger(__name__)

# Extend or override these as your templates stabilize
HEADER_FOOTER_PATTERNS = [
    r"^\s*page\s+\d+\s*(of\s*\d+)?\s*$",             # Page 3 of 10
    r"^\s*page\s*\d+\s*$",                            # Page 3
    r"^\s*confidential.*$",                           # Confidential...
    r"^\s*disclaimer.*$",                             # Disclaimer...
    r"^\s*copyright\s+.*$",                           # Copyright ...
    r"^\s*all rights reserved.*$"
]

UNICODE_REPLACEMENTS = {
    "\u2018": "'", "\u2019": "'",                     # ‘ ’ -> '
    "\u201C": '"', "\u201D": '"',                     # “ ” -> "
    "\u2013": "-", "\u2014": "-", "\u2212": "-",      # – — − -> -
    "\u2022": "-", "\u00B7": "-",                     # • · -> -
    "\u00A0": " ", "\u200B": "", "\ufeff": "",        # NBSP, ZWSP, BOM
}

COMMON_OCR_CORRECTIONS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"\bTendor\b", re.I), "Tender"),
    (re.compile(r"\bGovemment\b", re.I), "Government"),          # rn/m confusion
    (re.compile(r"\bDepartrnent\b", re.I), "Department"),        # rn/m
    (re.compile(r"\bE[&8]\s*M\b", re.I), "E&M"),                 # E8M / E & M -> E&M
    (re.compile(r"(?<=\d)O(?=\d)"), "0"),                        # 1O0 -> 100
    (re.compile(r"\b0f\b"), "of"),                               # 0f -> of
    (re.compile(r"\bthc\b", re.I), "the"),                       # thc -> the
]

def _log_subn(label: str, count: int) -> None:
    if count:
        logger.info(f"{label}: {count} changes")

def _replace_unicode_punct(text: str) -> str:
    before = text
    for src, dst in UNICODE_REPLACEMENTS.items():
        text = text.replace(src, dst)
    if text != before:
        logger.info("Standardized Unicode punctuation/spacing")
    return text

def _normalize_whitespace(text: str) -> str:
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Strip trailing spaces
    text = re.sub(r"[ \t]+\n", "\n", text)
    # Collapse internal runs of spaces per line
    lines = [re.sub(r"[ \t]{2,}", " ", ln).strip() for ln in text.split("\n")]
    # Limit consecutive blank lines
    kept = []
    blanks = 0
    for ln in lines:
        if ln == "":
            blanks += 1
            if blanks <= CONFIG["max_blank_lines"]:
                kept.append("")
        else:
            blanks = 0
            kept.append(ln)
    out = "\n".join(kept).strip()
    if out != text.strip():
        logger.info("Normalized whitespace and blank lines")
    return out

def _standardize_dates(text: str) -> str:
    # dd/mm/yyyy or dd-mm-yyyy -> yyyy-mm-dd
    def ddmmyyyy_repl(m: re.Match) -> str:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y:>s}-{int(mo):02d}-{int(d):02d}"

    text, c1 = re.subn(r"\b([0-3]?\d)[-/]([0-1]?\d)[-/]((?:19|20)\d{2})\b", ddmmyyyy_repl, text)
    _log_subn("Standardized dates", c1)
    return text

def _standardize_currency(text: str) -> str:
    # Rs./₹/INR -> INR <number> with no thousand separators
    def money_repl(m: re.Match) -> str:
        raw = m.group(1)
        num = raw.replace(",", "")
        return f"INR {num}"

    text, c1 = re.subn(r"(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(?:\.[0-9]+)?)", money_repl, text, flags=re.I)
    _log_subn("Standardized currency", c1)
    # Normalize percent spacing: "50 %" -> "50%"
    text, c2 = re.subn(r"\s+%", "%", text)
    _log_subn("Normalized percent spacing", c2)
    return text

def _strip_unwanted_sections(text: str) -> str:
    patterns = [re.compile(p, re.I) for p in HEADER_FOOTER_PATTERNS]
    removed = 0
    kept = []
    for ln in text.split("\n"):
        if any(p.match(ln.strip()) for p in patterns):
            removed += 1
            continue
        kept.append(ln)
    if removed:
        logger.info(f"Removed header/footer lines: {removed}")
    return "\n".join(kept)

def _merge_hyphenated_words(text: str) -> str:
    # Join words split with hyphen at line break: "inter-\nnational" -> "international"
    text, c = re.subn(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    _log_subn("Merged hyphenated line-breaks", c)
    return text

def _reconstruct_lines(text: str) -> str:
    # Heuristic: join soft-wrapped lines that likely belong to the same sentence.
    lines = text.split("\n")
    out: List[str] = []
    buf: Optional[str] = None

    def should_join(prev: str, curr: str) -> bool:
        if not prev:
            return False
        p = prev.rstrip()
        c = curr.lstrip()
        if p.endswith((".", "!", "?", ")")):
            return False
        if c and c[0].islower():
            return True
        if p and p[-1].isalnum():
            return True
        return False

    joined = 0
    for ln in lines:
        if buf is None:
            buf = ln
            continue
        if should_join(buf, ln):
            sep = " " if (buf and not buf.endswith(" ")) else ""
            buf = f"{buf}{sep}{ln.lstrip()}"
            joined += 1
        else:
            out.append(buf)
            buf = ln
    if buf is not None:
        out.append(buf)
    if joined:
        logger.info(f"Reconstructed soft-wrapped lines: {joined}")
    return "\n".join(out)

def _correct_common_ocr_errors(text: str) -> str:
    total = 0
    for pat, repl in COMMON_OCR_CORRECTIONS:
        text, c = pat.subn(repl, text)
        total += c
    if total:
        logger.info(f"Applied common OCR corrections: {total}")
    return text

def _ascii_fold(text: str) -> str:
    # Caution: this removes Hindi; keep disabled unless you know you want ASCII-only.
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    if folded != text:
        logger.info("Folded to ASCII (non-ASCII removed)")
    return folded

def _final_casing(text: str) -> str:
    if CONFIG["lowercase"]:
        lowered = text.lower()
        if lowered != text:
            logger.info("Lowercased text")
        return lowered
    return text

def preprocess_text(raw_text: str) -> str:
    """
    Clean and normalize OCR text for downstream extraction.

    Steps:
    - Standardize Unicode punctuation and spaces
    - Normalize whitespace and blank lines
    - Remove recurring headers/footers (regex-driven)
    - Merge hyphenated words and reconstruct soft-wrapped lines
    - Standardize dates/currency, normalize tokens
    - Apply common OCR corrections
    - Optional: ASCII-fold, lowercasing (via CONFIG)
    """
    if not isinstance(raw_text, str):
        logger.error("preprocess_text received non-string input")
        return raw_text

    try:
        text = raw_text
        text = _replace_unicode_punct(text)
        text = _normalize_whitespace(text)
        text = _strip_unwanted_sections(text)
        text = _merge_hyphenated_words(text)
        text = _reconstruct_lines(text)
        text = _standardize_dates(text)
        text = _standardize_currency(text)
        text = _correct_common_ocr_errors(text)
        if CONFIG["ascii_only"]:
            text = _ascii_fold(text)
        text = _final_casing(text)
        return text.strip()
    except Exception as e:
        logger.exception(f"Preprocessing failed: {e}")
        return raw_text
